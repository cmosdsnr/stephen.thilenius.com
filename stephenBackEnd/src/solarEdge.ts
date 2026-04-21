/**
 * SolarEdge inverter monitoring and data collection module.
 * Provides real-time solar power generation monitoring via Modbus TCP communication.
 * Handles data aggregation, storage, and API endpoints for solar energy analytics.
 *
 * Features:
 * - Real-time DC power measurement from SolarEdge inverters
 * - 15-second interval data collection with 3-sample averaging
 * - Automatic hour transitions and data persistence to PocketBase
 * - Modbus TCP communication with connection retry logic
 * - Daytime-only monitoring to optimize resource usage
 * - Historical data retrieval and backup functionality
 * - WebSocket broadcasting for live power updates
 * - Automatic daily backup with log rotation
 *
 * @module solarEdge
 */

import ModbusRTU from "modbus-serial";
import express, { Request, Response } from "express";
import { broadcast, Topic } from "socket";
import { pb } from "pb";
import { logsDir, log } from "miscellaneous";
import fs from "fs";
import path from "path";
import { findModbus } from "findModbus";
import suncalc from "suncalc";
import { ToId } from "miscellaneous";

/** In-memory storage for current hour power readings (240 x 15-second intervals) */
let hour: any[] = Array(60 * 4).fill(0);

/** Current epoch hour being recorded */
let activeHour = -1;

/** Last 15-second interval written to hour array */
let lastTick = -1;

/** Most recent power reading from inverter (watts) */
let lastPower = 0;

/** Accumulated DC power for 3-sample averaging */
let DCpower = 0;

/** Previous count value for change detection */
let lastCount = -1;

/** Current sample count within 15-second averaging cycle (0-2) */
let count = 0;

/** Flag to indicate initial startup phase */
let firstTick = true;

/** Flag tracking whether all readings in current hour are zero */
let allZeros = true;

/** IP address of discovered SolarEdge inverter */
let SolarEdgeIP: string | null = null;

/** SunSpec device information from inverter */
let UnitInfo: any = null;

/** Modbus TCP client instance for inverter communication */
const client = new ModbusRTU();
client.setID(1);
client.setTimeout(4_500);

/** Log file path for SolarEdge operations */
const __logFile = path.join(logsDir, `solarEdge.log`);

const saveCurrentMinute = async () => {
  log(__logFile, "saveCurrentMinute", `saving minute: ${currentReadingMinute}`);
  const avgPower = Math.floor((readings[0] + readings[1] + readings[2] + readings[3]) / 4);
  if (avgPower != 0) {
    await pb
      .collection("solar")
      .create({ id: ToId(currentReadingMinute), ticks: readings, average: avgPower })
      .then(() => {
        log(__logFile, "solarEdgeAdd", "created", activeHour);
      })
      .catch((error: Error) => {
        log(__logFile, "solarEdgeAdd", "ERROR couldn't create", error.message);
      });
    broadcast("solar" as Topic, [currentReadingMinute * 60, avgPower, ...readings]); // tell anyone subscribed of the new data point
  }
  currentReadingMinute = readingMinute;
};

/**
 * Establish Modbus TCP connection to SolarEdge inverter.
 * Discovers inverter via network scan if not already known, then connects.
 *
 * @returns Promise that resolves when connection is established
 * @throws Error if no SolarEdge inverter found or connection fails
 *
 * @example
 * ```typescript
 * try {
 *   await connect();
 *   console.log("Connected to SolarEdge inverter");
 * } catch (error) {
 *   console.error("Connection failed:", error.message);
 * }
 * ```
 */
const connect = async () => {
  if (!SolarEdgeIP) {
    const data: any = await findModbus();
    if (!data) return Promise.reject(new Error("No SolarEdge found"));
    SolarEdgeIP = data?.host;
    UnitInfo = data?.SunSpec;
    log(__logFile, "connect", "found SolarEdge at ", SolarEdgeIP, "with info", JSON.stringify(UnitInfo));
    if (!SolarEdgeIP) return Promise.reject(new Error("No SolarEdge IP found"));
  } else {
    return new Promise<void>((resolve, reject) => {
      const abortController = new AbortController();
      const { signal } = abortController;
      signal.addEventListener("abort", () => {
        log(__logFile, "Abort signal received by the abort controller");
      });
      client.connectTCP(
        SolarEdgeIP!,
        {
          port: 1502,
          socketOpts: {
            signal: signal,
          },
        },
        (error: any) => {
          if (error) {
            log(__logFile, "connectCallback", "TCP connection error while opening", error.message);
            reject(error);
          } else {
            if (client.isOpen) {
              log(__logFile, "connectCallback", "TCP connection opened");
              resolve();
            } else {
              log(__logFile, "connectCallback", "TCP connection failed to open");
              reject(new Error("connectCallback: TCP connection failed to open"));
            }
          }
        },
      );
      //   client.setTimeout(4_500);
    });
  }
};

let wasDaytime = false;
/**
 * Check if current time is within solar generation hours (3 AM to 10 PM).
 * Used to optimize polling schedule and avoid unnecessary queries during night.
 *
 * @returns True if within daytime hours, false otherwise
 *
 * @example
 * ```typescript
 * if (isDaytime()) {
 *   // Poll inverter for power readings
 * } else {
 *   // Log zero power during nighttime
 * }
 * ```
 */
const isDaytime = () => {
  // Torrey pines CA lat/long
  const lat = 32.8897;
  const long = -117.2469;

  const times = suncalc.getTimes(new Date(), lat, long);
  if (new Date() > times.sunset) {
    if (wasDaytime) log(__logFile, "isDaytime", "now nighttime");
    wasDaytime = false;
    saveCurrentMinute();
    return false;
  } else if (!wasDaytime && new Date() >= times.sunrise) {
    log(__logFile, "isDaytime", "now daytime");
    wasDaytime = true;
    const now = Date.now();
    activeHour = Math.floor(now / 3_600_000);
    readingMinute = Math.floor((now + 7500) / 60000);
    currentReadingMinute = readingMinute;
    readings = [0, 0, 0, 0];
  }
  return new Date() >= times.sunrise && new Date() <= times.sunset;
};

/** Flag to prevent overlapping tick execution */
let busy = false;
let readings = [0, 0, 0, 0];
let readingMinute = 0;
let currentReadingMinute = 0;
let reading = 0;
let lastReading = 0;

/**
 * Main polling function called every 5 seconds to collect power data.
 * Handles connection management, data collection, and 3-sample averaging.
 *
 * @param c - Count position in 15-second cycle (0, 1, or 2)
 *
 * @example
 * ```typescript
 * // Called automatically by interval timer
 * await handleTick(0); // Start of 15-second interval
 * await handleTick(1); // Middle sample
 * await handleTick(2); // End sample (triggers averaging)
 * ```
 */
const handleTick = async (fiveSecondTimerIndex: number) => {
  if (busy) {
    log(__logFile, "handleTick", "busy, skipping tick ", fiveSecondTimerIndex, " using ", lastReading, " W");
    reading += lastReading;
    if (fiveSecondTimerIndex % 3 === 2) {
      readings[Math.floor(fiveSecondTimerIndex / 3)] = Math.round(reading / 3);
      reading = 0;
    }
    if (fiveSecondTimerIndex == 11 || currentReadingMinute != readingMinute) saveCurrentMinute();
    return;
  }
  busy = true;

  try {
    // Attempt to reopen if client is closed
    let openRetryCount = 0;
    while (!client.isOpen && openRetryCount < 3) {
      try {
        await connect();
        log(__logFile, "handleTick", "re-connect was successful");
      } catch (error: any) {
        log(__logFile, "handleTick", "connect error", error.message);
      }
      openRetryCount++;
    }

    const daytime = isDaytime();
    if (client.isOpen && daytime) {
      let success = false;
      let readRetryCount = 0;

      while (!success && readRetryCount < 1) {
        try {
          let data = await client.readHoldingRegisters(0x9ca4, 2);
          lastReading = 10 ** data?.buffer.readInt16BE(2) * data?.buffer.readInt16BE(0);
          success = true;
        } catch (error) {}
        readRetryCount++;
      }
      if (!success) {
        log(__logFile, "handleTick", "1 read attempt failed, logging last power");
      } else {
        log(__logFile, "handleTick", `read ${Math.round(lastReading)} W`);
      }
    }
    if (daytime) {
      reading += lastReading;
      if (fiveSecondTimerIndex % 3 === 2) {
        readings[Math.floor(fiveSecondTimerIndex / 3)] = Math.round(reading / 3);
        log(__logFile, "handleTick", `average of 3: ${Math.round(reading / 3)} W`);
        reading = 0;
      }
      if (fiveSecondTimerIndex == 11) saveCurrentMinute();
    }
  } finally {
    busy = false;
  }
};

startFiveSecondTimer((fiveSecondTimerIndex) => {
  handleTick(fiveSecondTimerIndex);
});

interface FiveSecondTimerCallback {
  (quarterIndex: number): void;
}

function startFiveSecondTimer(callback: FiveSecondTimerCallback): void {
  const interval = 5000;

  const scheduleNext = (): void => {
    const now = Date.now();
    // Calculate delay to the next 5s mark
    let delay = interval - (now % interval);
    if (delay < 1000) delay += interval; // guard: prevent double-fire when called just after a 5s boundary
    readingMinute = Math.floor((now + 7_500) / 60_000);
    activeHour = Math.floor(now / 3_600_000);

    setTimeout(() => {
      const date = new Date();
      const seconds = date.getSeconds();

      // Calculate index:
      // 00s -> 0
      // 5s -> 1
      // 10s -> 2
      // ...
      // We use Math.round to handle slight timing jitter (e.g., firing at 4.999s)
      // We use % 12 to handle the 60s mark (which rounds to 12, wrapping back to 0)
      const fiveSecondTimerIndex = Math.round(seconds / 5) % 12;

      callback(fiveSecondTimerIndex);

      // Recursively schedule the next tick
      scheduleNext();
    }, delay);
  };

  // Initial start
  scheduleNext();
}

/**
 * Reduce a raw 15-second sample array to at most `targetPoints` entries using sliding window averaging.
 *
 * Window size is `floor(data.length / targetPoints)`. Each output point is the integer mean of its
 * window, so the output length is `ceil(data.length / windowSize)` — slightly more than `targetPoints`.
 * If the data is already at or below `targetPoints`, it is returned unchanged with `stepMs = 15000`.
 *
 * @param data         - Raw array of watt readings, one entry per 15-second tick
 * @param targetPoints - Desired maximum number of output points (e.g. chart pixel width)
 * @returns Object with the decimated `data` array and `stepMs` — milliseconds represented by each point
 *
 * @example
 * ```typescript
 * const { data, stepMs } = decimate(rawSamples, 900);
 * // For 5760 raw points → windowSize=6, ~960 output points, stepMs=90000 (90 s each)
 * ```
 */
const decimate = (data: number[], targetPoints: number): { data: number[]; stepMs: number } => {
  if (data.length <= targetPoints) return { data, stepMs: 15000 };
  const windowSize = Math.floor(data.length / targetPoints);
  const result: number[] = [];
  for (let i = 0; i < data.length; i += windowSize) {
    const win = data.slice(i, i + windowSize);
    result.push(Math.round(win.reduce((a, b) => a + b, 0) / win.length));
  }
  return { data: result, stepMs: windowSize * 15000 };
};

/**
 * HTTP GET handler: return solar power data from a start date to the current end of the database.
 *
 * Queries the `solar` PocketBase collection, gap-fills missing minutes with the last known value,
 * then optionally decimates the result to `points` entries using sliding window averaging.
 * Each response point represents `stepMs` milliseconds of averaged power.
 *
 * @param req - Express request with the following query parameters:
 *   - `from` (required) — ISO 8601 start date/time
 *   - `to`   (optional) — ISO 8601 end date/time; defaults to current time
 *   - `points` (optional) — target number of output points (e.g. chart pixel width); omit for raw data
 * @param res - Express response
 * @returns JSON `{ data, stepMs, from, to, fromHour, toHour }`
 *   - `data`     — array of watt readings, decimated to ≤ `points` entries
 *   - `stepMs`   — milliseconds each data point represents (15000 if no decimation)
 *   - `fromHour` — epoch hour of the start of the range
 *   - `toHour`   — epoch hour of the end of the range
 *
 * @example
 * ```typescript
 * // GET /solarEdge/Range?from=2024-04-18T07:00:00Z&points=900
 * // Returns ~900 points covering from April 18 07:00 UTC to now
 * ```
 */
const solarEdgeRange = async (req: Request, res: Response) => {
  const { from } = req.query;

  if (!from) {
    return res.status(400).json({ error: "solarEdge Missing from query parameter" });
  }

  const fromDate = new Date(from as string);
  if (isNaN(fromDate.getTime())) {
    return res.status(400).json({ error: "Invalid date format" });
  }

  const toDate = req.query.to ? new Date(req.query.to as string) : new Date();
  const fromHour = Math.floor(fromDate.getTime() / 3600000);
  const toHour = Math.floor(toDate.getTime() / 3600000);

  const fromMinute = fromHour * 60;
  const toMinute = Math.floor(toDate.getTime() / 60_000);

  try {
    const records = await pb.collection("solar").getFullList({
      filter: `id >= "${ToId(fromMinute)}" && id <= "${ToId(toMinute)}"`,
      sort: "id",
    });

    const ans: number[] = [];
    let lastVal = 0;
    let recIdx = 0;

    for (let m = fromMinute; m <= toMinute; m++) {
      if (recIdx < records.length && parseInt(records[recIdx].id) === m) {
        ans.push(...records[recIdx].ticks);
        lastVal = records[recIdx].ticks[3];
        recIdx++;
      } else {
        ans.push(lastVal, lastVal, lastVal, lastVal);
      }
    }

    log(__logFile, "solarEdgeRange", "found", records.length, "records,", ans.length / 240, "hours");

    const targetPoints = parseInt(req.query.points as string);
    const { data: decimated, stepMs } = isNaN(targetPoints) || targetPoints <= 0
      ? { data: ans, stepMs: 15000 }
      : decimate(ans, targetPoints);

    return res.json({ data: decimated, stepMs, from, to: toDate.toISOString(), fromHour, toHour });
  } catch (error) {
    return res.status(400).json({ error: "error retrieving range", activeHour, errorMsg: error });
  }
};

/**
 * HTTP GET handler: return debug information about current solar monitoring state.
 * Provides internal state variables for troubleshooting and monitoring.
 *
 * @param req - Express request object
 * @param res - Express response object
 * @returns JSON object with current state variables
 *
 * @example
 * ```typescript
 * // GET /solarEdge/Debug
 * // Returns: { hour: [...], activeHour: 483615, lastTick: 120, ... }
 * ```
 */
const solarEdgeDebug = (req: Request, res: Response) => {
  res.json({ hour, activeHour, lastTick, ClientOpen: client.isOpen });
};

/**
 * Create a daily backup of SolarEdge data to JSON file.
 * Exports all database records to dated backup file and removes old backups.
 *
 * @returns Object with backup statistics and file information
 *
 * @example
 * ```typescript
 * const result = await solarEdgeBackup();
 * // Creates: solarEdge-Backup-12-25-2023.json
 * // Removes: solarEdge-Backup-12-20-2023.json (5 days old)
 * ```
 */
const solarEdgeBackup = async () => {
  const d = new Date();
  const date = `${d.getMonth() + 1}-${d.getDate()}-${d.getFullYear()}`;

  const __filename = path.join(logsDir, `solarEdge-Backup-${date}.json`);
  if (fs.existsSync(__filename)) fs.unlinkSync(__filename);
  fs.appendFileSync(__filename, "[\n");

  const last = Math.floor(d.getTime() / 60_000); // epoch minute

  const belowMatches = await pb.collection("solar").getList(1, 1, {
    sort: "+id", // ascending — find the oldest record
  });
  if (belowMatches.totalItems == 0) return { start: 0, last, file: __filename, count: 0, removed: "" };

  let start = parseInt(belowMatches.items[0].id);
  let end = start + 1440; // 1 day of minutes per batch
  let records: any[] = [];
  let count = 0;
  while (start < last) {
    records = await pb.collection("solar").getFullList({
      filter: `id >= "${ToId(start)}" && id < "${ToId(end)}"`,
      sort: "id",
    });
    let all = "";
    records.forEach((r: any) => {
      all += JSON.stringify({ minute: parseInt(r.id), ticks: r.ticks, average: r.average }) + ",\n";
      count++;
    });
    if (end >= last) all = all.substring(0, all.length - 2) + "]\n";
    fs.appendFileSync(__filename, all);
    start = end;
    end = start + 1440;
  }
  fs.appendFileSync(__filename, "]\n");

  // Remove backup from 5 days ago
  d.setDate(d.getDate() - 5);
  const date5 = `${d.getMonth() + 1}-${d.getDate()}-${d.getFullYear()}`;
  if (fs.existsSync(path.join(logsDir, `solarEdge-Backup-${date5}.json`)))
    fs.unlinkSync(path.join(logsDir, `solarEdge-Backup-${date5}.json`));

  return {
    start: belowMatches.items[0].id,
    last,
    file: __filename,
    count,
    removed: path.join(logsDir, `solarEdge-Backup-${date5}.json`),
  };
};

/**
 * Truncate log file to specified maximum number of lines.
 * Prevents log files from growing too large by keeping only recent entries.
 *
 * @param file - Path to log file to truncate
 * @param max - Maximum number of lines to retain
 *
 * @example
 * ```typescript
 * limitLogLineNumbers("/path/to/app.log", 10000);
 * // Keeps only the most recent 10,000 log entries
 * ```
 */
const limitLogLineNumbers = (file: string, max: number) => {
  const data = fs.readFileSync(file, "utf8");
  const lines = data.split("\n");
  if (lines.length > max) {
    const newLines = lines.slice(lines.length - max).join("\n");
    fs.writeFileSync(file, newLines);
  }
};

// Schedule daily backup and log maintenance at 1 AM
setInterval(() => {
  const d = new Date();
  if (d.getHours() == 1) solarEdgeBackup();
  limitLogLineNumbers(__logFile, 10000);
}, 3600000); // 1 hr

/*******************************************/
/********* SolarEdge interface *************/
/*******************************************/
log(__logFile, "", "");
log(__logFile, "", "*************** Server Started ****************");
log(__logFile, "", "");
try {
  await connect();
} catch (error: any) {
  log(__logFile, "connect", "error", error.message);
}

/**
 * Creates an Express router for handling SolarEdge inverter data operations and reporting.
 *
 * Provides the following routes:
 * - GET /solarEdge/Range?from=DATE&[to=DATE]&[points=N] - Returns power data for date range
 * - GET /solarEdge/Debug - Returns debug information about current monitoring state
 * - GET /solarEdge/UnitInfo - Returns SunSpec device information from inverter
 * - GET /solarEdge/Backup - Creates and returns backup statistics
 *
 * @returns An Express Router with SolarEdge monitoring and data retrieval endpoints
 * @example
 * ```typescript
 * const app = express();
 * app.use('/api', solarEdgeRoutes());
 *
 * // Available endpoints:
 * // GET /api/solarEdge/Range?from=2023-12-01T00:00:00&points=900
 * // GET /api/solarEdge/Debug
 * ```
 */
export const solarEdgeRoutes = (): express.Router => {
  const router = express.Router();

  /**
   * GET /solarEdge/Range
   * Returns power data for a specific date range with gap filling.
   * Handles missing data by forward-filling last known values.
   */
  router.get("/solarEdge/Range", async (req, res) => solarEdgeRange(req, res));

  /**
   * GET /solarEdge/Debug
   * Returns internal state variables for monitoring and troubleshooting.
   */
  router.get("/solarEdge/Debug", (req, res) => solarEdgeDebug(req, res));

  /**
   * GET /solarEdge/UnitInfo
   * Returns SunSpec device information discovered from the inverter.
   */
  router.get("/solarEdge/UnitInfo", (req, res) => res.json(UnitInfo || { error: "No UnitInfo available" }));

  /**
   * GET /solarEdge/Backup
   * Triggers daily backup process and returns backup statistics.
   */
  router.get("/solarEdge/Backup", (req, res) => {
    res.json(solarEdgeBackup());
  });

  console.log("solarEdge running");
  return router;
};
