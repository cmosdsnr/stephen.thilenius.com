import { setMeterIP } from "powerMeter";
import { setSprinklerIP } from "sprinkler";
import express from "express";
import net from "net";
import http, { IncomingMessage } from "http";
import { broadcast } from "socket";

/**
 * ESP32 device discovery and management module.
 * Scans the local network for ESP32 devices and manages their connections.
 * Provides automatic device registration for sprinkler and power meter systems.
 *
 * Features:
 * - Network scanning with concurrent connections (1-254 IP range)
 * - Device identification via HTTP /name endpoint
 * - Automatic registration of known device types
 * - Real-time updates via socket broadcasting
 * - Periodic background scanning every 20 minutes
 *
 * @module esp
 */

/** Starting IP address in the scan range */
const startRange: number = 1;

/** Ending IP address in the scan range */
const endRange: number = 254;

/**
 * HTTP response structure for device communication.
 */
interface HttpResponse {
  /** HTTP status code */
  statusCode: number;
  /** Response body data */
  data: string;
}

/**
 * Structure for storing discovered ESP32 device information.
 */
type ESPlist = {
  [key: string]: {
    /** Last seen timestamp when device was discovered */
    date: Date;
    /** Device name */
    ip: string;
  };
};

/** Global registry of discovered ESP32 devices mapped by IP address */
export const ESPlist: ESPlist = {};

//variable HOST_LAN_IP set in AtReboot cron job
const hostIp = process.env.HOST_LAN_IP;
console.log(`The server's Local IP is: ${hostIp}`);
if (hostIp) {
  ESPlist["Backend Server"] = { date: new Date(), ip: hostIp };
}

//strip off the last number from the IP
let localNetworkPrefix = hostIp?.substring(0, hostIp.lastIndexOf(".")) || "192.168.0";

/**
 * Scan the entire local network range for ESP32 devices.
 * Creates concurrent connections to check for ESP devices on ports 1-254.
 * Updates the global ESPlist with discovered devices and notifies connected clients.
 *
 * @returns Promise that resolves when all network scans complete
 *
 * @example
 * ```typescript
 * await ESPUpdate(); // Scans 192.168.0.1 through 192.168.0.254
 * console.log(ESPlist); // Shows discovered devices
 * ```
 */
export async function ESPUpdate() {
  //reset time on backend server entry
  if (hostIp) {
    ESPlist["Backend Server"] = { date: new Date(), ip: hostIp };
  }
  let plist = [];
  for (let i = startRange; i <= endRange; i++) plist.push(checkPort(i));
  await Promise.all(plist);
}

/**
 * Check a specific IP address for an ESP32 device by connecting to port 80.
 * Makes an HTTP GET request to /name endpoint to identify ESP devices.
 * Automatically registers sprinkler and power meter devices with their respective modules.
 *
 * @param i - The last octet of the IP address to check (192.168.0.i)
 * @returns Promise resolving to connection status code:
 *   - 0: Success, ESP device found and registered
 *   - 1: HTTP request error
 *   - 2: Socket timeout (15 second limit)
 *   - 3: Socket connection error
 *
 * @example
 * ```typescript
 * const status = await checkPort(100); // Checks 192.168.0.100
 * if (status === 0) console.log('ESP device found');
 * ```
 */
function checkPort(i: number): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    const ip = `${localNetworkPrefix}.${i}`;
    // console.log(`Scanning ${ip}`);
    const socket: net.Socket = new net.Socket();
    socket.setTimeout(15000); // Timeout for socket connection

    socket.on("connect", () => {
      const req: http.ClientRequest = http.request(
        {
          hostname: ip,
          port: 80,
          method: "GET",
          path: "/name",
        },
        (res: IncomingMessage) => {
          let data: string = "";
          res.on("data", (chunk: Buffer) => {
            data += chunk.toString();
          });

          res.on("end", () => {
            if (data.includes("ESP")) {
              const currentIP = `${localNetworkPrefix}.${i}`;
              ESPlist[data] = { date: new Date(), ip: currentIP };
              broadcast("ESPlist", { ...ESPlist[data], name: data });
              if (data.toLowerCase().includes("sprinkler")) setSprinklerIP(currentIP);
              if (data.toLowerCase().includes("powermeter")) setMeterIP(currentIP);
              //   console.log(`${data} found at: ${currentIP}`);
            }
            resolve(0);
            socket.end();
          });
        },
      );

      req.on("error", (err: Error) => {
        resolve(1);
        socket.end();
      });

      req.end();
    });

    socket.on("timeout", () => {
      resolve(2);
      socket.destroy();
    });

    socket.on("error", (err: Error) => {
      resolve(3);
      socket.destroy();
    });

    socket.connect(80, ip);
  });
}

// Initialize network scan and set up periodic scanning
await ESPUpdate();
setInterval(() => ESPUpdate(), 20 * 60 * 1000);

/**
 * Creates an Express router for handling ESP32 device discovery and management operations.
 *
 * Provides the following routes:
 * - GET /ESPupdate - Manually trigger a network scan for ESP32 devices
 * - GET /ESPlist - Returns the current list of discovered ESP32 devices
 *
 * @returns An Express Router with ESP32 device management endpoints
 *
 * @example
 * ```typescript
 * const app = express();
 * app.use('/api/esp', espRoutes());
 *
 * // Manual scan: GET /api/esp/ESPupdate
 * // Get devices: GET /api/esp/ESPlist
 * ```
 */
export const espRoutes = (): express.Router => {
  const router = express.Router();

  /**
   * GET /ESPupdate
   * Manually triggers a network scan to discover ESP32 devices.
   * Useful for immediate device discovery without waiting for the periodic scan.
   *
   * @param req - Express request object
   * @param res - Express response object
   * @returns JSON response with "ok" status
   */
  router.get("/ESPupdate", function (req, res) {
    ESPUpdate();
    res.json("ok");
  });

  /**
   * GET /ESPlist
   * Returns the current registry of discovered ESP32 devices with their last seen timestamps.
   *
   * @param req - Express request object
   * @param res - Express response object
   * @returns JSON response containing the ESPlist object with device information
   */
  router.get("/ESPlist", (req, res) => res.json(ESPlist));

  router.get("/register", (req, res) => {
    const ip = req.ip?.replace("::ffff:", "") ?? "";
    if (!ip) {
      res.json({ success: false, error: "could not determine caller IP" });
      return;
    }
    fetch(`http://${ip}/name`)
      .then((r) => r.text())
      .then((name) => {
        name = name.trim();
        ESPlist[name] = { date: new Date(), ip };
        broadcast("ESPlist", { ...ESPlist[name], name });
        if (name.toLowerCase().includes("sprinkler")) setSprinklerIP(ip);
        if (name.toLowerCase().includes("powermeter")) setMeterIP(ip);
        console.log(`ESP registered: ${name} at ${ip}`);
        res.json({ success: true, name });
      })
      .catch((err) => {
        console.log(`ESP register failed for ${ip}: ${err.message}`);
        res.json({ success: false, error: err.message });
      });
  });

  router.get("/setPrefix", (req, res) => {
    const prefix = req.query.p as string;

    if (!prefix) {
      res.json({ success: false, error: "prefix parameter 'p' is required" });
      return;
    }

    const oldPrefix = localNetworkPrefix;
    localNetworkPrefix = prefix;

    console.log(`IP prefix changed from '${oldPrefix}' to '${prefix}'`);

    res.json({
      success: true,
    });
  });

  router.get("/getPrefix", (req, res) => {
    res.json({ prefix: localNetworkPrefix });
  });

  return router;
};
