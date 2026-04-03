/**
 * Power meter data collection and management module.
 * Provides real-time electrical current monitoring with ESP32 hardware integration.
 * Handles data aggregation, storage, and API endpoints for power consumption analytics.
 *
 * Features:
 * - Real-time current measurement from 6-channel power meter
 * - Minute-by-minute data aggregation over 60-minute windows
 * - Automatic hour transitions and data persistence
 * - PocketBase database integration with automatic retry
 * - WebSocket broadcasting for live updates
 * - Data validation and error handling
 * - Historical data retrieval and analysis
 *
 * @module powerMeter
 */
import express from "express";
import _ from "lodash";
import { Request, Response } from "express";
import { broadcast } from "socket";
import { pb } from "pb";
import { logsDir, log, ToId } from "miscellaneous";
import path from "path";
import fs from "fs";

/** In-memory placeholder for the current record (unused). */
let record: any = {};

/** Last-known meter IP address (0–255 suffix). */
let meterIP: string = "";

/** Next minute tick boundary for scheduling. */
let minute: number = new Date().getMinutes() + 1;

/**
 * Update the power meter IP address when a new meter connects.
 *
 * @param ip - IP "192.168.0.32".
 */
export const setMeterIP = (ip: string): void => {
  if (ip !== "" && ip !== meterIP) {
    console.log(`connected to power meter: ${ip} logDir: ${logsDir}`);
    meterIP = ip;
  }
};

/**
 * Transpose a 2D matrix (swap rows and columns).
 *
 * @param matrix - The matrix to transpose.
 * @returns The transposed matrix.
 */
function transpose<T>(matrix: T[][]): T[][] {
  return matrix[0].map((_, i) => matrix.map((row) => row[i]));
}

/** Rolling sums for six channels over four successive polls */
let sums = Array(6).fill(0);

/** 60-minute window storage: each element is an array of six current readings */
let hour: number[][] = Array(60).fill(Array(6).fill(0));

/** Epoch-hour currently being recorded */
let activeHour = -1;

/** Last minute index written in `hour` */
let lastTick = -1;

/** Number of successful polls in current batch */
let count = 0;

/** Log file path for power meter operations */
let __logFile = path.join(logsDir, `powerMeter.log`);

/**
 * Read and normalize a JSON dump, then upsert into PocketBase.
 * Ensures all amperage arrays have exactly 60 entries and scales values appropriately.
 *
 * @returns The parsed data array.
 */
const TranslateFile = async (): Promise<any[]> => {
  const __filename = logsDir + `meter.json`;
  const data: any[] = JSON.parse(fs.readFileSync(__filename, "utf8"));
  console.log(`data length: ${data.length}`);
  for (const e of data) {
    // Ensure exactly 60 entries in amperages
    if (e.amperages.length !== 60) {
      console.log(
        "powerMeter, bad data:",
        e.hour,
        e.amperages.length,
        e.amperages.length > 60 ? "truncating" : "padding",
      );
      if (e.amperages.length > 60) {
        e.amperages = e.amperages.slice(0, 60);
      } else {
        const last = e.amperages[e.amperages.length - 1];
        e.amperages = [...e.amperages, ...Array(60 - e.amperages.length).fill(last)];
      }
    }
    // Scale to amperage and format
    e.amperages = e.amperages.map((p: number) => parseFloat((p / 19.27).toFixed(2)));

    // Upsert based on epoch hour cutoff
    if (e.hour > 483208) {
      const existing = await pb
        .collection("powerMeter")
        .getFullList({ filter: `id = "${ToId(e.hour)}"` })
        .catch((err: any) => console.log("get error:", err.message));
      if (existing.length > 0) {
        console.log("powerMeter, updating", ToId(e.hour));
        await pb
          .collection("powerMeter")
          .update(ToId(e.hour), { amperages: e.amperages })
          .catch((err: any) => console.log("update error:", err.message));
      } else {
        console.log("powerMeter, creating", ToId(e.hour));
        await pb
          .collection("powerMeter")
          .create({ id: ToId(e.hour), amperages: e.amperages })
          .catch((err: any) => console.log("create error:", err.message));
      }
    }
  }
  return data;
};

/**
 * Scan DB for missing or malformed records within epoch hour range.
 * Logs any hours with missing records or incorrect amperage array lengths.
 *
 * @returns Empty object on completion.
 */
const checkDb = async (): Promise<{}> => {
  const last = Math.ceil(Date.now() / 3600000);
  const lowest = await pb.collection("powerMeter").getList(1, 1, { sort: "+id" });
  let h = parseInt(lowest.items[0].id) + 1;
  while (h < last) {
    const rec = await pb
      .collection("powerMeter")
      .getFullList({ filter: `id = "${ToId(h)}"` })
      .catch((err: any) => console.log("get error:", err.message));
    if (!rec || rec.length === 0) console.log("missing hour", ToId(h));
    else if (rec[0].amperages.length !== 60) console.log(`hour ${ToId(h)} wrong length`);
    h++;
  }
  return {};
};

/**
 * Aggregate a batch of four 15-second polls and persist current hour.
 * Handles hour transitions, fills missing minute data, and broadcasts to clients.
 *
 * @param amperages - Averaged readings for six channels.
 */
const powerMeterAdd = async (amperages: number[]): Promise<void> => {
  const hr = Math.floor(Date.now() / 3600000);
  const tick = new Date().getMinutes();
  log(__logFile, "powerMeterAdd adding:", amperages, "tick", tick, "hour", hr);

  if (activeHour !== hr) {
    log(__logFile, "new hour:", activeHour, "→", hr);
    if (lastTick !== -1) {
      for (let i = lastTick + 1; i < 60; i++) hour[i] = amperages;
    }
    if (activeHour !== -1) {
      const slice = hour.slice(0, tick + 1);
      const allZeros = slice.every((arr) => arr.every((v) => v === 0));
      if (!allZeros) {
        const rec = await pb.collection("powerMeter").getFullList({ filter: `id = "${ToId(activeHour)}"` });
        if (rec.length > 0) {
          await pb.collection("powerMeter").update(ToId(activeHour), { amperages: hour });
        } else {
          await pb.collection("powerMeter").create({ id: ToId(activeHour), amperages: hour });
        }
      }
    }
    activeHour = hr;
    hour = Array(60).fill(Array(6).fill(0));
    lastTick = -1;
  }

  for (let i = lastTick + 1; i <= tick; i++) hour[i] = amperages;
  lastTick = tick;
  broadcast("meter", [amperages, hr * 3600 + tick]);
  if (tick % 4 === 3) {
    log(__logFile, "quick save:", activeHour);
    await pb
      .collection("powerMeter")
      .create({ id: ToId(activeHour), amperages: hour })
      .catch(() => pb.collection("powerMeter").update(ToId(activeHour), { amperages: hour }));
  }
};

/**
 * Fetch current readings from the physical meter over HTTP.
 * Validates data and calls powerMeterAdd if readings are valid.
 *
 * @example
 * ```typescript
 * // Called automatically every minute by the scheduled task
 * await fetchCurrents();
 * // Fetches from http://192.168.0.{meterIP}/fetch
 * ```
 */
const fetchCurrents = async (): Promise<void> => {
  if (meterIP !== "") {
    try {
      const res = await fetch(`http://${meterIP}/fetch`);
      const data = await res.json();
      if (!data.currents.some((i: number | null) => i == null)) {
        await powerMeterAdd(data.currents);
      }
    } catch (error) {
      await powerMeterAdd(Array(6).fill(0)); // Fallback to zero if fetch fails
      log(__logFile, "fetchCurrents error:", error);
    }
  }
};

/**
 * Schedule fetchCurrents aligned to the next minute boundary.
 * Ensures polling starts at the beginning of a minute and continues every 60 seconds.
 *
 * @example
 * ```typescript
 * scheduleTask(); // Starts polling at next minute boundary
 * // If current time is 14:32:45, polling starts at 14:33:00
 * ```
 */
function scheduleTask(): void {
  const now = new Date();
  const delay = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
  setTimeout(() => setInterval(fetchCurrents, 60000), delay);
}

/**
 * Load the current hour from PocketBase and start the polling schedule.
 * Initializes the active hour data structure and begins scheduled data collection.
 *
 * @example
 * ```typescript
 * await getActiveHour();
 * // Initializes activeHour, loads existing data if available, starts polling
 * ```
 */
const getActiveHour = async (): Promise<void> => {
  activeHour = Math.ceil(Date.now() / 3600000);
  lastTick = new Date().getMinutes();
  hour = Array(60).fill(Array(6).fill(0));
  log(__logFile, "loading active hour", activeHour);
  const rec = await pb.collection("powerMeter").getFullList({ filter: `id = "${ToId(activeHour)}"` });
  if (rec.length > 0) {
    hour = rec[0].amperages;
    log(__logFile, "loaded existing hour");
  } else {
    log(__logFile, "starting new hour");
  }
  scheduleTask();
};

/**
 * HTTP GET handler: return the last N hours of readings.
 * Fetches power meter data for a specified number of hours from the database.
 *
 * @param req - Express request with query.hours parameter specifying number of hours to retrieve
 * @param res - Express response with JSON payload containing amperage data and time range
 * @returns JSON response with amperages array, start hour, and end hour
 *
 * @example
 * ```typescript
 * // GET /powerMeter/Hours?hours=24
 * // Returns 24 hours of data (1440 minutes × 6 channels)
 * {
 *   amperages: [[1.2, 2.3, ...], [1.1, 2.4, ...], ...],
 *   start: 483600,
 *   end: 483624,
 *   found: 24
 * }
 * ```
 */
const powerMeterHours = async (req: Request, res: Response): Promise<Response> => {
  // 1) parse & validate
  const hours = parseInt(req.query.hours as string, 10);
  if (!hours || hours <= 0) {
    return res.status(400).json({ error: "invalid hours parameter" });
  }

  // 2) define our window
  const currentHour = activeHour; // e.g. 2025072814 for 2 pm on July 28, 2025
  const startHour = currentHour - hours; // look back N hours

  try {
    // 3) grab whatever hours we have ≥ startHour
    const startId = ToId(startHour);
    const records = await pb.collection("powerMeter").getFullList({
      filter: `id >= "${startId}"`,
      sort: "id",
    });

    // 4) build a quick lookup: hourNumber → amperages block (60×6)
    const dataByHour: Record<number, number[][]> = {};
    for (const r of records) {
      const h = parseInt(r.id, 10);
      dataByHour[h] = r.amperages;
    }

    // 5) now build our full timeline, padding zeros where missing
    const ans: number[][] = [];
    const zeroRow = Array(6).fill(0);
    for (let h = startHour; h <= currentHour; h++) {
      if (dataByHour[h]) {
        // real data (array of 60 [6‑value] rows)
        ans.push(...dataByHour[h]);
      } else {
        // missing hour → 60 rows of zeroes
        for (let i = 0; i < 60; i++) {
          ans.push([...zeroRow]);
        }
      }
    }

    // 6) return exactly (hours+1)*60 rows, plus fixed start/end
    return res.json({
      amperages: ans,
      start: startHour,
      end: currentHour,
      found: records.length,
    });
  } catch (e: any) {
    return res.status(500).json({ error: "fetch error", detail: e.message });
  }
};

/**
 * HTTP GET handler: retrieve detailed meter information from the ESP32 device.
 * Proxies the /details endpoint from the physical power meter.
 *
 * @param req - Express request object
 * @param res - Express response object
 * @returns JSON response with meter configuration and status details
 *
 * @example
 * ```typescript
 * // GET /powerMeter/details
 * // Returns meter configuration, calibration values, etc.
 * ```
 */
const details = async (req: Request, res: Response): Promise<Response> => {
  try {
    const response = await fetch(`http://${meterIP}/details`);
    const data = await response.json();
    return res.json(data);
  } catch (e: any) {
    return res.status(500).json({ error: "fetch details error", detail: e.message });
  }
};

/**
 * HTTP GET handler: trigger frequency calibration write on the ESP32 device.
 * Proxies the /writeFreq endpoint to update meter calibration settings.
 *
 * @param req - Express request object
 * @param res - Express response object
 * @returns JSON response with write operation status
 *
 * @example
 * ```typescript
 * // GET /powerMeter/writeFreq
 * // Writes calibration frequency to meter EEPROM
 * ```
 */
const writeFreq = async (req: Request, res: Response): Promise<Response> => {
  try {
    const response = await fetch(`http://${meterIP}/writeFreq`);
    const data = await response.json();
    return res.json(data);
  } catch (e: any) {
    return res.status(500).json({ error: "fetch writeFreq error", detail: e.message });
  }
};

/**
 * HTTP GET handler: retrieve raw ADC readings from the ESP32 device.
 * Provides unprocessed sensor data for debugging and calibration purposes.
 *
 * @param req - Express request object
 * @param res - Express response object
 * @returns JSON response with raw ADC values from all channels
 *
 * @example
 * ```typescript
 * // GET /powerMeter/rawData
 * // Returns: { raw: [1023, 1024, 1022, ...] }
 * ```
 */
const rawData = async (req: Request, res: Response): Promise<Response> => {
  try {
    const response = await fetch(`http://${meterIP}/rawData`);
    const data = await response.json();
    return res.json(data);
  } catch (e: any) {
    return res.status(500).json({ error: "fetch rawData error", detail: e.message });
  }
};

/**
 * HTTP GET handler: return the current power meter IP address.
 * Provides the IP address of the connected ESP32 power meter device.
 *
 * @param req - Express request object
 * @param res - Express response object
 * @returns JSON response with meter IP or error if no meter connected
 *
 * @example
 * ```typescript
 * // GET /powerMeter/ip
 * // Returns: { ip: "192.168.0.100" } or { error: "no power meter connected" }
 * ```
 */
const getIP = async (req: Request, res: Response): Promise<Response> => {
  if (meterIP !== "") return res.json({ ip: meterIP });
  else return res.status(404).json({ error: "no power meter connected" });
};

/**
 * HTTP GET handler: trigger a calibration scan on the ESP32 device.
 * Initiates a scan operation with configurable duration for meter calibration.
 *
 * @param req - Express request object with query.hours parameter (0-5)
 * @param res - Express response object
 * @returns JSON response with scan operation status and results
 *
 * @example
 * ```typescript
 * // GET /powerMeter/runScan?hours=1
 * // Runs 1-hour calibration scan on the meter
 * ```
 */
const runScan = async (req: Request, res: Response): Promise<Response> => {
  const sel = parseInt(req.query.hours as string);
  if (!sel || sel < 0 || sel > 5) return res.status(400).json({ error: "invalid hours parameter" });
  try {
    const response = await fetch(`http://${meterIP}/runScan?sel=${sel}`);
    const data = await response.json();
    return res.json(data);
  } catch (e: any) {
    return res.status(500).json({ error: "fetch scan error", detail: e.message });
  }
};

// Initialize the active hour and start data collection
await getActiveHour();

/**
 * Creates an Express router for handling power meter data operations and reporting.
 *
 * Provides the following routes:
 * - GET /powerMeter/Translate - Translates and imports meter.json data into PocketBase
 * - GET /powerMeter/Check - Scans database for missing or malformed records
 * - GET /powerMeter/Hours - Returns the last N hours of power meter readings
 * - GET /powerMeter/details - Retrieves detailed meter configuration
 * - GET /powerMeter/writeFreq - Triggers frequency calibration write
 * - GET /powerMeter/runScan - Runs calibration scan with specified duration
 * - GET /powerMeter/rawData - Returns raw ADC readings for debugging
 * - GET /powerMeter/ip - Returns current meter IP address
 *
 * @returns An Express Router with power meter management and data retrieval endpoints
 * @example
 * ```typescript
 * const app = express();
 * app.use('/api', powerMeterRoutes());
 *
 * // Available endpoints:
 * // GET /api/powerMeter/Hours?hours=24
 * // GET /api/powerMeter/details
 * // GET /api/powerMeter/ip
 * ```
 */
export const powerMeterRoutes = (): express.Router => {
  const router = express.Router();

  /**
   * GET /powerMeter/Translate
   * Translates meter.json file data and imports it into PocketBase.
   * Processes historical data files and normalizes them for database storage.
   */
  router.get("/powerMeter/Translate", (_req, res) => TranslateFile().then(() => res.json({ status: "ok" })));

  /**
   * GET /powerMeter/Check
   * Performs database integrity check for missing or malformed power meter records.
   * Scans the entire database range and reports inconsistencies.
   */
  router.get("/powerMeter/Check", (_req, res) => checkDb().then(() => res.json({ status: "ok" })));

  /**
   * GET /powerMeter/Hours
   * Returns historical power meter data for the specified number of hours.
   * Supports real-time data retrieval with automatic gap filling.
   */
  router.get("/powerMeter/Hours", powerMeterHours);

  /**
   * GET /powerMeter/details
   * Proxies detailed meter information from the ESP32 device.
   */
  router.get("/powerMeter/details", details);

  /**
   * GET /powerMeter/writeFreq
   * Triggers frequency calibration write operation on the meter.
   */
  router.get("/powerMeter/writeFreq", writeFreq);

  /**
   * GET /powerMeter/runScan
   * Initiates calibration scan with configurable duration (0-5 hours).
   */
  router.get("/powerMeter/runScan", runScan);

  /**
   * GET /powerMeter/rawData
   * Returns unprocessed ADC readings for debugging and calibration.
   */
  router.get("/powerMeter/rawData", rawData);

  /**
   * GET /powerMeter/ip
   * Returns the IP address of the currently connected power meter.
   */
  router.get("/powerMeter/ip", getIP);

  console.log("powerMeter router ready");
  return router;
};
