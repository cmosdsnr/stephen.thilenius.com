/**
 * Weather monitoring module for collecting and managing Ultimeter wind data.
 * Handles wind speed and direction measurements from ESP32-based weather station.
 * Provides real-time data collection, aggregation, and historical data retrieval.
 *
 * Features:
 * - Real-time wind speed and direction monitoring
 * - 15-second interval data collection (240 readings per hour)
 * - Automatic hour transitions and data persistence
 * - PocketBase database integration with retry logic
 * - Gap filling for missing data points
 * - WebSocket broadcasting for live updates
 * - Last communication tracking for device health monitoring
 * - Historical data retrieval with date range support
 *
 * @module ultimeter
 */

import { pb } from "pb";
import express, { Request, Response } from "express";
import { broadcast, Topic } from "socket";

import path from "path";
import { logsDir, log } from "miscellaneous";

/** 240-entry array storing wind speed and direction pairs for the current hour */
let hour: any[] = [];

/** Current epoch hour being recorded */
let activeHour = -1;

/** Last 15-second tick index written in the hour array */
let lastTick = -1;

/** Most recent wind speed reading in mph */
let lastSpeed: number = 11;

/** Most recent wind direction reading in degrees */
let lastDirection: number = 180;

/** Timestamp of last communication from weather station */
let lastComm = new Date().getTime();

/** Flag to track if all readings in current hour are zero */
let allZeros = true;

/** Log file path for Ultimeter operations */
const __logFile = path.join(logsDir, `ultimeter.log`);

/**
 * Generate a zero-padded string key for PocketBase record IDs.
 * Converts epoch hour integers to consistent 15-character database keys.
 *
 * @param hr - Epoch hour integer
 * @returns Zero-padded string of length 15
 *
 * @example
 * ```typescript
 * const id = hrToId(483614);
 * // Returns: "000000000483614"
 * ```
 */
const hrToId = (hr: number) => {
  return "0".repeat(15 - hr.toString().length) + hr.toString();
};

/**
 * Load the most recent hour from the database and initialize state variables.
 * Retrieves the latest wind data to continue from the last known state.
 * Handles application restart by resuming from the most recent database record.
 *
 * @example
 * ```typescript
 * await getActiveHour();
 * // Loads most recent hour data and sets up state variables
 * ```
 */
const getActiveHour = async () => {
  try {
    const record = await pb.collection("ultimeter").getList(1, 1, {
      filter: 'id ~ "0%"', // Match IDs starting with "0"
      sort: "-id", // Sort descending
    });
    if (record.items.length > 0) {
      hour = record.items[0].data;
      activeHour = parseInt(record.items[0].id);
      log(__logFile, "getActiveHour", "loaded most recent hour", activeHour);
      lastSpeed = hour[hour.length - 1][0];
      lastDirection = hour[hour.length - 1][1];
      lastTick = hour.length - 1;
      while (hour[lastTick] == 0 && lastTick >= 0) {
        lastTick--;
      }
    } else log(__logFile, "getActiveHour", "no hours found in Database");
  } catch (error: any) {
    log(__logFile, "getActiveHour", "ERROR couldn't get last hour", "", error.message);
  }
};

/**
 * Update the last communication timestamp and broadcast to connected clients.
 * Creates or updates a special record to track when the weather station was last seen.
 * Used for monitoring device health and detecting communication issues.
 *
 * @returns Object containing status and timestamp information
 *
 * @example
 * ```typescript
 * const result = await lastSeenUpdate();
 * // Updates lastComm timestamp and broadcasts to WebSocket clients
 * // Returns: { status: "ok", lastComm: 1640995200 }
 * ```
 */
const lastSeenUpdate = async () => {
  log(__logFile, "lastSeenUpdate", "updating last seen");
  let msg: any = {};
  lastComm = new Date().getTime();
  msg.lastComm = Math.floor(lastComm / 1000);
  await pb
    .collection("ultimeter")
    .create({ id: "_______lastSeen", data: { lastComm } })
    .catch((error: Error) => {
      pb.collection("ultimeter")
        .update("_______lastSeen", { data: { lastComm } })
        .catch((error: Error) => {
          msg.error = "couldn't update either...: " + error.message;
          return msg;
        });
    });
  msg.status = "ok";
  broadcast("ultimeter" as Topic, msg.lastComm); // tell anyone subscribed of the update
  return msg;
};

/**
 * Add wind speed and direction data from the weather station.
 * Handles hour transitions, fills missing data, and persists to database.
 * Core function for processing incoming weather measurements from ESP32 device.
 *
 * @param body - Request body containing hour, tick, speed, and direction
 * @param res - Express response object
 * @returns JSON response with processing status and metadata
 *
 * @example
 * ```typescript
 * // Called by ESP32 weather station
 * const body = { hour: 483614, tick: 120, speed: 12.5, direction: 270 };
 * await ultimeterAdd(body, res);
 * // Processes data, handles hour transitions, broadcasts to clients
 * ```
 */
const ultimeterAdd = async (body: any, res: Response) => {
  if (body.hour == undefined || body.tick == undefined || body.speed == undefined || body.direction == undefined)
    return res.status(400).json({ error: "Missing hour, tick, speed or direction", ...body });

  const msg: any = {};
  if (new Date().getTime() - lastComm > 1000 * 60 * 3) msg.ping = await lastSeenUpdate();

  const hr = body.hour;
  const tick = parseInt(body.tick);
  const speed = parseFloat(body.speed);
  const direction = parseInt(body.direction);
  log(__logFile, "ultimeterAdd", "Received hour", hr, "tick", tick, "speed", speed, "direction", direction);

  msg.body = body;
  if (activeHour != hr) {
    log(__logFile, "ultimeterAdd", "new hour", activeHour, "->", hr);
    msg.newHour = hr;
    //fill in rest of hour with last value before saving
    if (lastTick != -1) for (let i = lastTick + 1; i < 240; i++) hour[i] = [lastSpeed, lastDirection];

    if (activeHour != -1) {
      if (!allZeros) {
        // save the active hour
        msg.saved = [activeHour, hr];
        try {
          const record = await pb.collection("ultimeter").getFullList({
            filter: `id = "${hrToId(activeHour)}"`,
          });
          if (record.length > 0) {
            await pb
              .collection("ultimeter")
              .update(hrToId(activeHour), { data: hour })
              .catch((error: Error) => {
                log(__logFile, "ultimeterAdd", "couldn't update hour", activeHour, "", "", error.message);
              });
            log(__logFile, "ultimeterAdd", "updated hour", activeHour);
          } else {
            log(__logFile, "ultimeterAdd", "not found, creating ", hrToId(activeHour));
            await pb
              .collection("ultimeter")
              .create({ id: hrToId(activeHour), data: hour })
              .catch((error: Error) => {
                log(__logFile, "ultimeterAdd", "couldn't create", "", error.message);
              });
          }
        } catch (error: any) {
          log(__logFile, "ultimeterAdd", "error saving", activeHour, "with error", "", error.message);
        }
      }
    } else {
      //attempt to load the previous hour from pocketbase to get the last speed and direction
      try {
        const record = await pb.collection("ultimeter").getFullList({
          filter: `id = "${hrToId(hr - 1)}"`,
        });

        if (record.length > 0) {
          lastSpeed = record[0].data[239][0];
          lastDirection = record[0].data[239][1];
          msg.previousLoaded = [hr - 1, lastSpeed, lastDirection];
        }
      } catch (error: any) {
        msg.error = "couldn't load previous hour...: " + error.message;
        lastSpeed = 0;
        lastDirection = 0;
      }
    }
    activeHour = hr;
    //if id of hour exists in pocketbase, load it (should never occur)
    try {
      const record = await pb.collection("ultimeter").getFullList({
        filter: `id = "${hrToId(hr - 1)}"`,
      });
      if (record.length > 0) {
        log(__logFile, "ultimeterAdd", "ERROR (????) loaded", activeHour);
        msg.loaded = activeHour + " loaded, but this should not occur";
        hour = record[0].data;
      } else {
        // should always get here because record should not exist
        log(__logFile, "ultimeterAdd", "create new empty hour", activeHour);
        hour = Array(240).fill(Array(2).fill(0));
        allZeros = true;
      }
    } catch (error: any) {
      // should always get here because record should not exist
      log(__logFile, "ultimeterAdd", "ERROR loading hour failed, create new empty hour");
      hour = Array(240).fill(Array(2).fill(0));
      allZeros = true;
    }
    lastTick = -1;
  }
  // fill in missing ticks in this hour
  if (body.tick > lastTick + 2) {
    log(__logFile, "ultimeterAdd", "missing", lastTick + 1, "thru", body.tick - 1);
    msg.missing = [lastTick + 1, body.tick - 1];
  }
  for (let i = lastTick + 1; i < body.tick; i++) hour[i] = [lastSpeed, lastDirection];
  hour[body.tick] = [body.speed, body.direction];
  lastTick = body.tick;
  lastSpeed = speed;
  lastDirection = direction;
  allZeros = allZeros && speed == 0;
  broadcast("ultimeter" as Topic, [body.speed, body.direction, 3600 * activeHour + 15 * body.tick]); // tell anyone subscribed of the new data point

  //keep the db updated incase of reboot
  if (!allZeros && lastTick % 4 == 3) {
    log(__logFile, "ultimeterAdd", "quick save hour", activeHour);
    await pb
      .collection("ultimeter")
      .create({ id: hrToId(activeHour), data: hour })
      .catch(async (error: Error) => {
        await pb
          .collection("ultimeter")
          .update(hrToId(activeHour), { data: hour })
          .catch((error: Error) => {});
      });
  }
  return res.json(msg);
};

/**
 * HTTP GET handler: return the last N hours of wind measurements.
 * Retrieves historical wind data from database and current hour buffer.
 *
 * @param req - Express request with query.hours parameter
 * @param res - Express response with JSON array of wind data
 * @returns JSON response with wind speed and direction readings
 *
 * @example
 * ```typescript
 * // GET /ultimeterHours?hours=24
 * // Returns 24 hours of data (24 × 240 = 5,760 readings)
 * // Each reading: [speed_mph, direction_degrees]
 * ```
 */
const ultimeterHours = async (req: Request, res: Response) => {
  if (activeHour === -1) return res.status(400).json({ error: "no active hour", ...req.params, activeHour });
  if (req.query.hours === undefined)
    return res.status(400).json({ error: "hours not found", ...req.query, help: "add ?hours=n to the url" });
  const hours = parseInt(req.query.hours as string);
  if (hours <= 0) return res.status(400).json({ error: "hours must be greater than 0", ...req.params });

  let ans: any[] = [];
  try {
    const record = await pb.collection("ultimeter").getFullList({
      filter: `id >= "${hrToId(activeHour - hours)}"`,
      sort: "id", // Ensure the records are sorted in ascending order by id
    });
    record.forEach((r: any) => {
      log(__logFile, "ultimeterHours", "adding hour", "", r.id);
      ans = [...ans, ...r.data];
    });
    log(__logFile, "ultimeterHours", "adding hour", "", activeHour);
    ans = [...ans, ...hour.slice(0, lastTick)];
    return res.json(ans);
  } catch (error: any) {
    return res.status(400).json({ error: "error retrieving hours", activeHour, errorMsg: error });
  }
};

/**
 * HTTP GET handler: return wind data for a specific date/time range.
 * Fills in missing hours with the last known values and handles data gaps gracefully.
 *
 * @param req - Express request with query.from and query.to ISO date strings
 * @param res - Express response with JSON object containing data array and metadata
 * @returns JSON response with wind data, date range, and hour range
 *
 * @example
 * ```typescript
 * // GET /ultimeterRange?from=2023-12-01T00:00:00&to=2023-12-01T23:59:59
 * // Returns full day of wind data with gap filling
 * // Response: { data: [...], from: "...", to: "...", fromHour: 483600, toHour: 483624 }
 * ```
 */
const ultimeterRange = async (req: Request, res: Response) => {
  const { from, to } = req.query;

  if (!from || !to) {
    return res.status(400).json({ error: "Missing from or to query parameters" });
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
    log(__logFile, "ultimeterRange", "checking for id <= ", hrToId(fromHour));
    const belowMatches = await pb.collection("ultimeter").getList(1, 1, {
      filter: `id <= "${hrToId(fromHour)}"`,
      sort: "-id", // descending
    });
    log(__logFile, "ultimeterRange", "found start id", "", belowMatches.items[0].id);

    const record = await pb.collection("ultimeter").getFullList({
      filter: `id >= "${belowMatches.items[0].id}" && id <= "${hrToId(toHour == activeHour ? toHour - 1 : toHour)}"`,
      sort: "id", // Ensure the records are sorted in ascending order by id
    });

    log(
      __logFile,
      "ultimeterRange",
      "found",
      record.length,
      "records from",
      parseInt(belowMatches.items[0].id),
      "to",
      toHour,
    );
    let idx = 0;
    let l = record[0].data[239];
    let h = parseInt(belowMatches.items[0].id);

    while (idx < record.length) {
      log(
        __logFile,
        "ultimeterRange",
        "Record hr",
        "",
        parseInt(record[idx].id),
        " h",
        "",
        h,
        "start hr",
        "",
        parseInt(belowMatches.items[0].id),
      );
      if (record[idx].id == hrToId(h)) {
        ans = ans.concat(record[idx].data);
        idx++;
      } else {
        ans = ans.concat(Array(240).fill(l));
      }
      h++;
    }
    if (activeHour == toHour) ans = ans.concat(hour.slice(0, lastTick));

    log(__logFile, "ultimeterRange", "found ", record.length, " records");

    return res.json({
      data: ans,
      from,
      to,
      belowMatches: belowMatches.items[0].id,
      fromHour: parseInt(belowMatches.items[0].id),
      toHour,
    });
  } catch (error: any) {
    return res.status(400).json({ error: "error retrieving hours", activeHour, errorMsg: error.message });
  }
};

/**
 * HTTP GET handler: return debug information about the current system state.
 * Tests database connectivity and returns current state variables for troubleshooting.
 * Performs sample database queries to verify connectivity and data integrity.
 *
 * @param req - Express request object
 * @param res - Express response with JSON debug data
 * @returns JSON response with current state and diagnostic information
 *
 * @example
 * ```typescript
 * // GET /ultimeterDebug
 * // Returns: { hour: [...], activeHour: 483614, lastTick: 120, lastSpeed: 12.5, lastDirection: 270 }
 * ```
 */
const ultimeterDebug = async (req: Request, res: Response) => {
  // try one that exists
  try {
    const record = await pb.collection("ultimeter").getFullList({
      filter: `id = "${hrToId(483614)}"`,
    });
    log(__logFile, "ultimeterDebug", "record length", "", record.length);
    if (record.length > 0) log(__logFile, "ultimeterDebug", "record longer than 0");
    else log(__logFile, "ultimeterDebug", "record length 0");
  } catch (error: any) {
    log(__logFile, "ultimeterDebug", "error getting  ", hrToId(483614), " with error", "", error.message);
  }
  // try one that doesn't exists
  try {
    const record = await pb.collection("ultimeter").getFullList({
      filter: `id = "${hrToId(983614)}"`,
    });
    log(__logFile, "ultimeterDebug", "record length", "", record.length);
    if (record.length > 0) log(__logFile, "ultimeterDebug", "record longer than 0");
    else log(__logFile, "ultimeterDebug", "record length 0");
  } catch (error: any) {
    log(__logFile, "ultimeterDebug", "error getting  ", hrToId(483614), " with error", "", error.message);
  }
  //neither errors

  try {
    const record = await pb.collection("ultimeter").getList(1, 1, {
      filter: 'id ~ "0%"', // Match IDs starting with "0"
      sort: "-id", // Sort descending
    });

    log(__logFile, "ultimeterDebug", "", record.items[0].id);
  } catch (error: any) {
    log(__logFile, "ultimeterDebug", "", error.message);
  }

  res.json({ hour, activeHour, lastTick, lastSpeed, lastDirection });
};

/**
 * HTTP GET handler: manually save the current hour to the database.
 * Forces a save operation for the active hour data, useful for manual backups.
 * Attempts to create a new record, falls back to update if record exists.
 *
 * @param req - Express request object
 * @param res - Express response with save operation status
 * @returns JSON response with save status or error details
 *
 * @example
 * ```typescript
 * // GET /ultimeterSave
 * // Manually triggers save of current hour data
 * // Returns: { status: "saved" } or { error: "couldn't update either..." }
 * ```
 */
const ultimeterSave = async (req: Request, res: Response) => {
  let msg: any = {};
  try {
    await pb.collection("ultimeter").create({ id: hrToId(activeHour), data: hour });
  } catch (error: any) {
    msg.error = "couldn't create, try update... " + error.message;
    try {
      await pb.collection("ultimeter").update(hrToId(activeHour), { data: hour });
    } catch (error: any) {
      msg.error = "couldn't update either...: " + error.message;
    }
  }
  res.json(msg);
};

/**
 * HTTP GET handler: ping endpoint to update last seen timestamp.
 * Updates the last communication time and broadcasts to clients.
 * Used for health monitoring and device connectivity verification.
 *
 * @param req - Express request object
 * @param res - Express response with ping status
 * @returns JSON response with last communication timestamp
 *
 * @example
 * ```typescript
 * // GET /ultimeterPing
 * // Updates lastComm timestamp and broadcasts
 * // Returns: { status: "ok", lastComm: 1640995200 }
 * ```
 */
const ultimeterPing = async (req: Request, res: Response) => {
  res.json(await lastSeenUpdate());
};

log(__logFile, "", "");
log(__logFile, "", "*************** Server Started ****************");
log(__logFile, "", "");
await getActiveHour();

/**
 * Creates an Express router for handling Ultimeter weather station data operations.
 * Provides comprehensive API endpoints for wind data collection, retrieval, and monitoring.
 *
 * Provides the following routes:
 * - POST /ultimeterUpdate - Receives wind speed and direction data from weather station
 * - GET /ultimeterUpdate - Alternative endpoint for data updates via query parameters
 * - GET /ultimeterHours?hours=N - Returns wind data for the last N hours
 * - GET /ultimeterRange?from=ISO_DATE&to=ISO_DATE - Returns wind data for a specific time range
 * - GET /ultimeterDebug - Returns debug information and system state
 * - GET /ultimeterSave - Manually saves current hour data to database
 * - GET /ultimeterPing - Updates last seen timestamp and broadcasts to clients
 *
 * @returns An Express Router with Ultimeter weather monitoring endpoints
 * @example
 * ```typescript
 * const app = express();
 * app.use('/api/weather', ultimeterRoutes());
 *
 * // Available endpoints:
 * // POST /api/weather/ultimeterUpdate
 * // GET /api/weather/ultimeterHours?hours=24
 * // GET /api/weather/ultimeterRange?from=2023-12-01T00:00:00&to=2023-12-01T23:59:59
 * // GET /api/weather/ultimeterDebug
 * ```
 */
export const ultimeterRoutes = (): express.Router => {
  const router = express.Router();

  /**
   * POST /ultimeterUpdate
   * Receives wind measurements from the ESP32 weather station via HTTP POST.
   * Primary endpoint for real-time weather data collection.
   */
  router.post("/ultimeterUpdate", async (req, res) => ultimeterAdd(req.body, res)); // http post request seems to route to GET request

  /**
   * GET /ultimeterUpdate
   * Alternative endpoint for receiving wind measurements via query parameters.
   * Allows data collection via GET requests for simpler client implementations.
   */
  router.get("/ultimeterUpdate", async (req, res) => ultimeterAdd(req.query, res));

  /**
   * GET /ultimeterHours
   * Returns historical wind data for the specified number of recent hours.
   * Combines database records with current hour buffer data.
   */
  router.get("/ultimeterHours", async (req, res) => ultimeterHours(req, res));

  /**
   * GET /ultimeterRange
   * Returns wind data for a specific date/time range with gap filling.
   * Handles missing data by forward-filling last known values.
   */
  router.get("/ultimeterRange", async (req, res) => ultimeterRange(req, res));

  /**
   * GET /ultimeterDebug
   * Returns current system state and performs database connectivity tests.
   * Useful for troubleshooting and monitoring system health.
   */
  router.get("/ultimeterDebug", (req, res) => ultimeterDebug(req, res));

  /**
   * GET /ultimeterSave
   * Manually triggers a save operation for the current hour data.
   * Forces database persistence outside of normal automatic saves.
   */
  router.get("/ultimeterSave", (req, res) => ultimeterSave(req, res));

  /**
   * GET /ultimeterPing
   * Updates last communication timestamp and notifies connected clients.
   * Used for health monitoring and device connectivity verification.
   */
  router.get("/ultimeterPing", (req, res) => ultimeterPing(req, res));
  console.log("ultimeter running");
  return router;
};
