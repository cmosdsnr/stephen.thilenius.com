import { hasBeenLongEnough } from "hasBeenLongEnough";
import { pb } from "pb";
import express from "express";

/**
 * Davis Anemometer weather data collection module.
 * Manages wind speed and direction data from Davis weather station ESP32 collector.
 * Handles real-time data updates and database synchronization with 15-second intervals.
 *
 * @module davisAnemometer
 */

/** In-memory storage for Davis anemometer data organized by hour */
let davis: any[] = [];

/** Database record IDs corresponding to each hour in the davis array */
let id: any[] = [];

/** Tracks the last hour that was processed for database updates */
let lastHour = -1;

/**
 * Creates and initializes the Davis Anemometer data collection system.
 * Sets up Express routes for receiving ESP32 data and manages database synchronization.
 * Loads existing data from PocketBase on startup if sufficient time has passed.
 *
 * @returns Express Router with Davis anemometer data collection endpoints
 *
 * @example
 * ```typescript
 * const app = express();
 * app.use('/api/weather', davisAnemometer());
 * ```
 */
export const davisAnemometer = () => {
  /**
   * Process incoming wind data from ESP32 Davis anemometer collector.
   * Validates required fields and updates in-memory storage arrays.
   * Triggers database update when hour changes to persist completed hour data.
   *
   * @param body - Request body containing wind measurement data
   * @param body.hour - Hour identifier for the measurement period
   * @param body.tick - 15-second interval within the hour (0-239, 240 intervals per hour)
   * @param body.speed - Wind speed measurement
   * @param body.direction - Wind direction measurement in degrees
   * @returns Wind data array for the specified tick or error object
   *
   * @example
   * ```typescript
   * const result = davisAdd({
   *   hour: 483615,
   *   tick: 120,    // 30 minutes into the hour
   *   speed: 12.5,  // mph
   *   direction: 270 // degrees (west)
   * });
   * // Returns: [12.5, 270] or { error: "field not found" }
   * ```
   */
  const davisAdd = (body: any) => {
    if (body.hour === undefined) {
      //hr to update
      // res.status(500);
      return { error: "hour not found" };
    }

    if (body.tick === undefined) {
      //15s increments 0-239 per hr
      return { error: "tick not found" };
    }

    if (body.speed === undefined) {
      return { error: "speed not found" };
    }

    if (body.direction === undefined) {
      return { error: "direction not found" };
    }

    if (lastHour == -1) lastHour = body.hour;
    davis[body.hour][body.tick][0] = body.speed;
    davis[body.hour][body.tick][1] = body.direction;

    if (body.hour != lastHour) {
      pb.collection("davisAnemometer")
        .update(id[lastHour], { data: davis[lastHour] })
        .then((record: any) => {
          console.log("davisAnemometer updated " + id[lastHour]);
        });
    }
    lastHour = body.hour;
    return davis[body.hour][body.tick];
  };

  /**
   * Load existing Davis anemometer data from PocketBase on startup.
   * Only executes if sufficient time has passed since last load (rate limiting).
   * Populates in-memory arrays with historical data for current operations.
   */
  if (hasBeenLongEnough("davisAnemometer"))
    pb.collection("davisAnemometer")
      .getFullList({
        sort: "-hour",
      })
      .then((record: any[]) => {
        record.forEach((row, i) => {
          davis[row.hour] = row.data;
          id[row.hour] = row.id;
        });
      })
      .catch((err: any) => {
        console.log("davis error loading data: " + err);
      });

  //update pocketbase with data from Davis anemometer ESP32 collector
  const router = express.Router();

  /**
   * POST /davisUpdate
   * Receives wind speed and direction data from ESP32 Davis anemometer collector.
   * Updates in-memory storage and triggers database persistence when hours change.
   */
  router.post("/davisUpdate", (req, res) => res.json(davisAdd(req.body)));
  return router;
};
