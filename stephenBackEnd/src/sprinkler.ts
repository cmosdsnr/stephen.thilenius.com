/**
 * Sprinkler system WebSocket communication and control module.
 * Manages bidirectional communication with ESP32-based sprinkler controllers.
 * Handles automatic reconnection, message queuing, and HTTP API endpoints.
 *
 * Features:
 * - WebSocket connection management with auto-reconnection
 * - Message logging and replay capabilities
 * - Real-time sprinkler status monitoring
 * - HTTP endpoints for configuration and status queries
 * - Automatic connection recovery after network issues
 * - Message filtering to reduce noise from frequent updates
 *
 * @module sprinkler
 */

import WebSocket, { WebSocketServer } from "ws";
import express from "express";
import { logsDir, log } from "miscellaneous";
import path from "path";

/** Log file path for Sprinkler operations */
const __logFile = path.join(logsDir, `sprinkler.log`);

/**
 * Represents a message from the sprinkler system containing various control and status information.
 * Used for both incoming status updates and outgoing control commands.
 *
 * @interface SprinklerMessage
 */
type SprinklerMessage = {
  /** The command type being sent/received (e.g., "start", "stop", "status") */
  command: string;
  /** Numeric code identifying the message type or operation result */
  code: number;
  /** Sprinkler channel number (1-8 typically) */
  channel: number;
  /** Day of the week or schedule identifier (0-6, where 0=Sunday) */
  day: number;
  /** Item identifier within the system for specific components */
  item: number;
  /** Current status of the sprinkler (0=off, 1=on, 2=scheduled, etc.) */
  status: number;
  /** Start time or trigger value (timestamp or schedule time) */
  start: number;
  /** Watering duration or amount in minutes or seconds */
  watering: number;
  /** Index value for array operations or sequence numbers */
  index: number;
  /** String value for flexible data like names or descriptions */
  value: string;
  /** Variable identifier or numeric value for configuration */
  variable: number;
  /** Event type or name for logging and status tracking */
  event: string;
};

/**
 * Array storing all received sprinkler messages for logging and replay purposes.
 * Messages are accumulated for debugging, status history, and client broadcasting.
 * Filtered to exclude frequent event updates (code != 2) to reduce noise.
 *
 * @example
 * ```typescript
 * // Messages are automatically added when received from sprinkler
 * log(__logFile, `Total messages received: ${sprinklerMessages.length}`);
 * const lastMessage = sprinklerMessages[sprinklerMessages.length - 1];
 * ```
 */
export const sprinklerMessages: SprinklerMessage[] = [];

/**
 * Internal sprinkler connection state object.
 * Maintains WebSocket connection and IP address for the sprinkler controller.
 *
 * @private
 */
const sprinkler: any = { socket: null, ip: "" };

/**
 * Forces a reconnection to the current sprinkler IP address.
 * Useful for re-establishing connection when IP hasn't changed.
 */
export const reconnectSprinkler = () => {
  const currentIP = sprinkler.ip;
  if (currentIP.length !== 0) {
    // Temporarily reset IP to force reconnection
    sprinkler.ip = "";
    setSprinklerIP(currentIP);
  }
};

/**
 * Sets the IP address for the sprinkler system and establishes WebSocket connection.
 * Automatically reconnects if the connection is lost and handles connection lifecycle.
 *
 * @param ip - The full IP address of the sprinkler controller
 *
 * @example
 * ```typescript
 * setSprinklerIP("192.168.0.100");
 * // Automatically handles reconnection if connection drops
 * ```
 *
 * @remarks
 * - Closes existing connections before establishing new ones
 * - Implements 5-second reconnection delay on connection loss
 * - Filters out frequent event updates (code 2) to reduce message noise
 */
export const setSprinklerIP = (ip: string) => {
  if (ip !== "" && ip !== sprinkler.ip) {
    sprinkler.ip = ip;
    if (sprinkler.socket != null)
      try {
        sprinkler.socket.close();
      } catch (error: any) {
        log(__logFile, "setSprinklerIP could not close: ", error.message);
      }
    try {
      sprinkler.socket = new WebSocket(`ws://${sprinkler.ip}/ws`);

      /**
       * WebSocket connection opened event handler.
       * Logs successful connection establishment.
       */
      sprinkler.socket.onopen = () => {
        log(__logFile, "setSprinklerIP", "connected to sprinkler: " + sprinkler.ip);
      };

      /**
       * WebSocket connection closed event handler.
       * Logs disconnection and schedules automatic reconnection after 5 seconds.
       */
      sprinkler.socket.onclose = () => {
        log(__logFile, "setSprinklerIP", "disconnected from sprinkler: " + sprinkler.ip);
        setTimeout(() => {
          reconnectSprinkler();
        }, 5000);
      };

      sprinkler.socket.onerror = (event: any) => {
        log(__logFile, "setSprinklerIP", "sprinkler socket error: " + event.message);
      };

      /**
       * WebSocket message received event handler.
       * Parses incoming JSON messages and adds them to the message queue.
       * Filters out frequent event updates (code 2) to reduce noise.
       *
       * @param event - WebSocket message event containing JSON data
       */
      sprinkler.socket.onmessage = (event: any) => {
        const data = JSON.parse(event.data);
        if (data.code != 2) {
          // Log the message if it's not a variable update
          if (!data.hasOwnProperty("variables")) {
            log(__logFile, "relay", "Scheduling relay to clients:", event.data);
          }
          // Queue the message for relay to clients via socket.ts
          sprinklerMessages.push({ command: "sprinkler", ...data });
        }
      };
    } catch (error) {
      log(__logFile, "setSprinklerIP", "setSprinklerIP error: ", error);
    }
  }
};

/**
 * Sends a message to the connected sprinkler system via WebSocket.
 * Transmits control commands and configuration updates to the ESP32 controller.
 *
 * @param msg - The message object to send to the sprinkler system
 *
 * @example
 * ```typescript
 * // Start watering on channel 1
 * sendSprinklerMessage({ command: "start", channel: 1 });
 *
 * // Stop all watering
 * sendSprinklerMessage({ command: "stop", channel: 0 });
 *
 * // Set watering schedule
 * sendSprinklerMessage({
 *   command: "schedule",
 *   channel: 2,
 *   start: 600, // 6:00 AM
 *   watering: 15 // 15 minutes
 * });
 * ```
 *
 * @remarks
 * Messages are only sent if a WebSocket connection is active.
 * If no connection exists, an error message is logged to console.
 */
export const sendSprinklerMessage = (msg: any) => {
  if (sprinkler.socket != null) {
    sprinkler.socket.send(JSON.stringify(msg));
    log(__logFile, "sendSprinklerMessage", "message sent to esp:", JSON.stringify(msg));
  } else {
    log(__logFile, "sendSprinklerMessage", "no sprinkler connected");
  }
};

/**
 * Creates and returns an Express router with sprinkler-related endpoints.
 * Provides HTTP API access to sprinkler status, configuration, and control.
 *
 * Provides the following routes:
 * - GET /sprinkler/isConnected - Returns WebSocket connection status
 * - GET /sprinkler/load - Fetches configuration data from sprinkler system
 * - GET /sprinkler/found - Returns whether a sprinkler system has been discovered
 *
 * @returns An Express Router configured with sprinkler endpoints
 *
 * @example
 * ```typescript
 * const app = express();
 * app.use('/api', sprinklerRoutes());
 *
 * // Available endpoints:
 * // GET /api/sprinkler/isConnected
 * // GET /api/sprinkler/load
 * // GET /api/sprinkler/found
 * ```
 */
export function sprinklerRoutes(): express.Router {
  const router = express.Router();

  /**
   * GET /sprinkler/isConnected
   * Checks if the sprinkler system is currently connected via WebSocket.
   * Returns the WebSocket ready state or -1 if no connection exists.
   *
   * @param req - Express request object
   * @param res - Express response object
   * @returns JSON object with connection status
   *
   * @example
   * ```typescript
   * // Response when connected:
   * // { connected: 1 } // WebSocket.OPEN
   *
   * // Response when not connected:
   * // { connected: -1 }
   * ```
   */
  router.get("/sprinkler/isConnected", (req, res) => {
    if (sprinkler.socket == null) res.json({ connected: -1 });
    else res.json({ connected: sprinkler.socket.readyState });
  });

  /**
   * GET /sprinkler/load
   * Fetches configuration and status data from the sprinkler system via HTTP.
   * Retrieves complete system state including schedules, sensor readings, and settings.
   *
   * @param req - Express request object
   * @param res - Express response object
   * @returns JSON data from the sprinkler system or error message if not connected
   *
   * @example
   * ```typescript
   * // Successful response contains sprinkler configuration:
   * // {
   * //   channels: [...],
   * //   schedules: [...],
   * //   sensors: {...},
   * //   settings: {...}
   * // }
   *
   * // Error response when not connected:
   * // { error: "no sprinkler connected" }
   * ```
   */
  router.get("/sprinkler/load", (req, res) => {
    if (sprinkler.ip === "") {
      res.json({ error: "no sprinkler connected" });
      return;
    }
    fetch(`http://${sprinkler.ip}/loadData`)
      .then((response) => response.json())
      .then((data) => res.json(data));
  });

  /**
   * GET /sprinkler/found
   * Returns whether a sprinkler system has been discovered and configured.
   * Simple boolean status check for client applications.
   *
   * @param req - Express request object
   * @param res - Express response object
   * @returns JSON object with discovery status
   *
   * @example
   * ```typescript
   * // Response when sprinkler found:
   * // { status: true }
   *
   * // Response when no sprinkler:
   * // { status: false }
   * ```
   */
  router.get("/sprinkler/found", (req, res) => {
    res.json({ status: sprinkler.ip !== "" });
  });

  console.log("sprinkler running");
  return router;
}
