import { setMeterIP } from "powerMeter";
import { setSprinklerIP } from "sprinkler";
import express from "express";
import net from "net";
import http, { IncomingMessage } from "http";
import { broadcast } from "socket";
import { Bonjour } from "bonjour-service";

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
    /** Device IP address */
    ip: string;
    /** How the device was discovered: "scan" | "mDNS" | "self" | "server" */
    source: string;
  };
};

/** Global registry of discovered ESP32 devices mapped by IP address */
export const ESPlist: ESPlist = {};

/** Non-ESP devices seen via mDNS (name → ip) */
export const mDNSOtherList: { [name: string]: string } = {};

/** Remove devices not seen in the last 12 hours. */
function removeStaleDevices(): void {
  const cutoff = new Date(Date.now() - 12 * 60 * 60 * 1000);
  for (const name of Object.keys(ESPlist)) {
    if (name !== "Backend Server" && ESPlist[name].date < cutoff) {
      delete ESPlist[name];
    }
  }
}

/**
 * Register or update a device, enforcing uniqueness by both name and IP.
 * Removes stale entries (>12h), evicts any existing entry sharing the same IP,
 * then upserts the device keyed by name.
 */
function registerDevice(name: string, ip: string, source: string): void {
  removeStaleDevices();

  // Remove any existing entry whose IP matches (but has a different name)
  for (const [existingName, entry] of Object.entries(ESPlist)) {
    if (entry.ip === ip && existingName !== name) {
      delete ESPlist[existingName];
    }
  }

  ESPlist[name] = { date: new Date(), ip, source };
  broadcast("ESPlist", { ...ESPlist[name], name });
}

//variable HOST_LAN_IP set in AtReboot cron job
const hostIp = process.env.HOST_LAN_IP;
console.log(`The server's Local IP is: ${hostIp}`);
if (hostIp) {
  ESPlist["Backend Server"] = { date: new Date(), ip: hostIp, source: "server" };
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
  removeStaleDevices();
  //reset time on backend server entry
  if (hostIp) {
    ESPlist["Backend Server"] = { date: new Date(), ip: hostIp, source: "server" };
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
              registerDevice(data, currentIP, "scan");
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

// mDNS continuous discovery — picks up devices within seconds of them coming online
function startBonjourDiscovery() {
    const bonjour = new Bonjour();
    bonjour.find({ type: "http" }).on("up", (service) => {
        const name = service.name;
        const ip = service.addresses?.find((a: string) => a.includes(".")); // IPv4 only
        if (!ip) return;
        if (!name.toUpperCase().includes("ESP")) {
            mDNSOtherList[name] = ip;
            return;
        }
        console.log(`mDNS discovered: ${name} at ${ip}`);
        registerDevice(name, ip, "mDNS");
        if (name.toLowerCase().includes("sprinkler")) setSprinklerIP(ip);
        if (name.toLowerCase().includes("powermeter")) setMeterIP(ip);
    });
}
startBonjourDiscovery();

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
  router.get("/mDNSOther", (req, res) => res.json(mDNSOtherList));

  router.get("/register", (req, res) => {
    const ip = (req.query.ip as string | undefined)
            || req.ip?.replace("::ffff:", "")
            || "";
    const diag = (req.query.diag as string | undefined)?.replace(/\+/g, " ") ?? "";
    if (!ip) {
      res.json({ success: false, error: "could not determine caller IP" });
      return;
    }
    fetch(`http://${ip}/name`)
      .then((r) => r.text())
      .then((name) => {
        name = name.trim();
        registerDevice(name, ip, "self");
        if (name.toLowerCase().includes("sprinkler")) setSprinklerIP(ip);
        if (name.toLowerCase().includes("powermeter")) setMeterIP(ip);
        console.log(`ESP registered: ${name} at ${ip}${diag ? `  [${diag}]` : ""}`);
        res.json({ success: true, name, diag });
      })
      .catch((err) => {
        console.log(`ESP register failed for ${ip}${diag ? ` [${diag}]` : ""}: ${err.message}`);
        res.json({ success: false, error: err.message });
      });
  });

  router.get("/heartbeat", (req, res) => {
    const ip     = (req.query.ip as string) || req.ip?.replace("::ffff:", "") || "?";
    const uptime = (req.query.uptime as string) ?? "";
    const heap   = (req.query.heap   as string) ?? "";
    const diag   = ((req.query.diag  as string) ?? "").replace(/\+/g, " ");
    console.log(`💓 heartbeat ${ip}  uptime=${uptime}s heap=${heap}  [${diag}]`);
    res.json({ ok: true });
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
