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
client.setTimeout(20000);

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

    if (client.isOpen && isDaytime()) {
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
      reading += lastReading;
      if (fiveSecondTimerIndex % 3 === 2) {
        readings[Math.floor(fiveSecondTimerIndex / 3)] = Math.round(reading / 3);
        log(__logFile, "handleTick", `average of 3: ${Math.round(reading / 3)} W`);
        reading = 0;
      }
      if (!success) {
        log(__logFile, "handleTick", "1 read attempt failed, logging last power");
      } else {
        log(__logFile, "handleTick", `read ${Math.round(lastReading)} W`);
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
    const delay = interval - (now % interval);
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
 * HTTP GET handler: return the last N hours of solar power readings.
 * Retrieves historical power data from database and current hour buffer.
 *
 * @param req - Express request with query.hours parameter
 * @param res - Express response with JSON power data array
 * @returns JSON array of 15-second power readings for specified hours
 *
 * @example
 * ```typescript
 * // GET /solarEdge/Hours?hours=24
 * // Returns 24 hours of data (24 × 240 = 5,760 readings)
 * ```
 */
const solarEdgeHours = async (req: Request, res: Response) => {
  if (activeHour === -1) return res.status(400).json({ error: "no active hour", ...req.params, activeHour });
  if (req.query.hours === undefined)
    return res.status(400).json({ error: "hours not found", ...req.query, help: "add ?hours=n to the url" });
  const hours = parseInt(req.query.hours as string);
  if (hours <= 0) return res.status(400).json({ error: "hours must be greater than 0", ...req.params });

  let ans: any[] = [];
  try {
    const record = await pb.collection("solarEdge").getFullList({
      filter: `id >= "${ToId(activeHour - hours)}"`,
      sort: "id", // Ensure the records are sorted in ascending order by id
    });
    record.forEach((r: any) => {
      log(__logFile, "solarEdgeHours", "adding hour", r.id);
      ans = [...ans, ...r.power];
    });
    log(__logFile, "solarEdgeHours", "adding hour", activeHour);
    ans = [...ans, ...hour.slice(0, lastTick)];
    return res.json(ans);
  } catch (error) {
    return res.status(400).json({ error: "solarEdge error retrieving hours", activeHour, errorMsg: error });
  }
};

/**
 * HTTP GET handler: return solar power data for a specific date range.
 * Fills gaps in data with last known values and handles missing hours.
 *
 * @param req - Express request with query.from and query.to date parameters
 * @param res - Express response with JSON data and metadata
 * @returns JSON object with power data array and range information
 *
 * @example
 * ```typescript
 * // GET /solarEdge/Range?from=2023-12-01T00:00:00&to=2023-12-01T23:59:59
 * // Returns full day of power data with gap filling
 * ```
 */
const solarEdgeRange = async (req: Request, res: Response) => {
  const { from, to } = req.query;

  if (!from || !to) {
    return res.status(400).json({ error: "solarEdge Missing from or to query parameters" });
  }

  const fromDate = new Date(from as string);
  const toDate = new Date(to as string);

  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
    return res.status(400).json({ error: "Invalid date format" });
  }
  const fromHour = Math.floor(fromDate.getTime() / 3600000);
  const toHour = Math.floor(toDate.getTime() / 3600000);

  let ans: any[] = [];
  try {
    const belowMatches = await pb.collection("solarEdge").getList(1, 1, {
      filter: `id <= "${ToId(fromHour)}"`,
      sort: "-id", // descending
    });
    log(
      __logFile,
      "solarEdgeRange",
      parseInt(belowMatches.items[0].id),
      "is the latest hr in the dB <=",
      fromHour,
      "starting there",
    );

    const record = await pb.collection("solarEdge").getFullList({
      filter: `id >= "${belowMatches.items[0].id}" && id <= "${ToId(toHour == activeHour ? toHour - 1 : toHour)}"`,
      sort: "id", // Ensure the records are sorted in ascending order by id
    });
    let idx = 0;
    let l = record[0].power[239];
    let h = parseInt(belowMatches.items[0].id);
    let s = 0,
      t = 0;
    let found = false;

    while (idx < record.length) {
      if (idx == 0) s = parseInt(record[idx].id);

      if (record[idx].id == ToId(h)) {
        if (idx > 0 && !found) {
          log(__logFile, "solarEdgeRange", "filling in missing hrs", s, " to", h - 1);
          s = h;
        }
        found = true;
        ans = ans.concat(record[idx].power);
        if (ans.length > 0) l = ans[ans.length - 1];
        idx++;
      } else {
        if (idx > 0 && found) {
          log(__logFile, "solarEdgeRange", "filling in found   hrs", s, " to", h - 1);
          s = h;
        }
        found = false;
        ans = ans.concat(Array(240).fill(l));
      }
      h++;
    }

    const last = toHour == activeHour ? toHour - 1 : toHour;
    while (h <= last) {
      if (found) {
        log(__logFile, "solarEdgeRange", "filling in found   hrs", s, " to", h);
        found = false;
        s = h;
      }
      ans = ans.concat(Array(240).fill(l));
      h++;
    }

    if (!found) log(__logFile, "solarEdgeRange", "filling in missing hrs", s, " to", h);
    else log(__logFile, "solarEdgeRange", "filling in found   hrs", s, " to", h);

    if (activeHour == toHour) ans = ans.concat(hour.slice(0, lastTick));

    log(__logFile, "solarEdgeRange", "found", record.length, " records");

    return res.json({
      data: ans,
      from,
      to,
      fromHour: parseInt(belowMatches.items[0].id),
      toHour,
    });
  } catch (error) {
    return res.status(400).json({ error: "error retrieving hours", activeHour, errorMsg: error });
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
  //get mm-dd-yyyy
  const d = new Date();
  const date = `${d.getMonth() + 1}-${d.getDate()}-${d.getFullYear()}`;

  let __filename = path.join(logsDir, `solarEdge-Backup-${date}.json`);
  //delete the file if it exists
  if (fs.existsSync(__filename)) fs.unlinkSync(__filename);
  fs.appendFileSync(__filename, "[\n");

  const last = Math.floor(d.getTime() / 3600000);

  //get pocketbase record with lowest id
  const belowMatches = await pb.collection("solarEdge").getList(1, 1, {
    sort: "+id", // ascending
  });
  if (belowMatches.totalItems == 0) return { start: 0, last, file: __filename, count: 0, removed: "" };

  let start = parseInt(belowMatches.items[0].id);
  let end = start + 200;
  let records: any[] = [];
  let count = 0;
  while (start < last) {
    // load records >= start and < end
    records = await pb.collection("solarEdge").getFullList({
      filter: `id >= "${ToId(start)}" && id < "${ToId(end)}"`,
      sort: "id", // Ensure the records are sorted in ascending order by id
    }); //write records to file
    let all = "";
    records.forEach((r: any) => {
      all += JSON.stringify({ hour: parseInt(r.id), power: r.power }) + ",\n";
      count++;
    });
    if (end >= last) all = all.substring(0, all.length - 2) + "]\n";
    fs.appendFileSync(__filename, all);
    start = end;
    end = start + 200;
  }
  //remove the last comma in the file
  fs.appendFileSync(__filename, "]\n");

  // get date for 5 days ago
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
 * - GET /solarEdge/Hours?hours=N - Returns power data for the last N hours
 * - GET /solarEdge/Range?from=DATE&to=DATE - Returns power data for specific date range
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
 * // GET /api/solarEdge/Hours?hours=24
 * // GET /api/solarEdge/Range?from=2023-12-01T00:00:00&to=2023-12-01T23:59:59
 * // GET /api/solarEdge/Debug
 * ```
 */
export const solarEdgeRoutes = (): express.Router => {
  const router = express.Router();

  /**
   * GET /solarEdge/Hours
   * Returns historical power readings for the specified number of hours.
   * Combines database records with current hour buffer data.
   */
  router.get("/solarEdge/Hours", async (req, res) => solarEdgeHours(req, res));

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

  router.get("/solarEdge/Translate", async (req, res) => {
    let start = 476788;
    let stop = 490816;
    let span = 100;
    let saveCnt = 0;
    let batchCount = 0;

    //get the largest id in solar collection that is less than stop*60
    try {
      const belowMatches = await pb.collection("solar").getList(1, 1, {
        filter: `id < "${ToId(stop * 60)}"`,
        sort: "-id", // descending
      });
      if (belowMatches.totalItems > 0) {
        start = Math.floor(parseInt(belowMatches.items[0].id) / 60) + 1;
        log(__logFile, "solarEdgeTranslate", "starting at", start);
      }
    } catch (error: any) {
      log(__logFile, "solarEdgeTranslate", "error finding starting point", error.message);
    }

    try {
      while (start < stop) {
        let filter = `id >= "${ToId(start)}" && id < "${ToId(start + span)}"`;

        let record;
        try {
          record = await pb.collection("solarEdge").getFullList({
            filter,
            sort: "id", // Ensure the records are sorted in ascending order by id
          });
          log(__logFile, "solarEdgeTranslate", "retrieved records:" + record.length);
        } catch (error: any) {
          log(__logFile, "solarEdgeTranslate", "failed to retrieve records ", error.message, " continuing...");
          start += span;
          if (stop - start < span) span = stop - start;
          continue;
        }

        if (record.length == 0) {
          log(__logFile, "solarEdgeTranslate", "no records found ", filter);
        } else {
          for (let j = 0; j < record.length; j++) {
            let id = parseInt(record[j].id) * 60;
            // split r.power into 60x4 array
            for (let i = 0; i < 240; i += 4) {
              let ticks = record[j].power.slice(i, i + 4);
              let average = Math.round((ticks[0] + ticks[1] + ticks[2] + ticks[3]) / 4);
              try {
                await pb.collection("solar").create({ id: ToId(id), ticks, average });
                saveCnt++;
              } catch (error: any) {
                log(
                  __logFile,
                  "solarEdgeTranslate",
                  "saving id:" + ToId(id) + " ERROR couldn't create: ",
                  error.message,
                );
              }
              id++;
              // Add small delay between each create to prevent overwhelming DB
              await new Promise((resolve) => setTimeout(resolve, 10));
            }
          }
          log(__logFile, "solarEdgeTranslate", "batch " + ++batchCount + " saved ", saveCnt, " total records");
        }

        start += span;
        if (stop - start < span) span = stop - start;

        // Add longer delay between batches to prevent connection reset
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      res.json({ saved: saveCnt, batches: batchCount, success: true });
    } catch (error: any) {
      log(__logFile, "solarEdgeTranslate", "fatal error:", error.message);
      res.status(500).json({ error: error.message, saved: saveCnt, batches: batchCount });
    }
  });

  console.log("solarEdge running");
  return router;
};
