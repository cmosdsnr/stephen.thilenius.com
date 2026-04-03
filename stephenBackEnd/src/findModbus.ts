import os from "os";
import ip from "ip";
import net from "net";
import pLimit from "p-limit";
import ModbusRTU from "modbus-serial";
import { logsDir, log } from "miscellaneous";
import fs from "fs";
import path from "path";
import { sign } from "crypto";

/**
 * Modbus device discovery module for network scanning and SolarEdge identification.
 * Provides network scanning capabilities to locate Modbus TCP devices and extract
 * SunSpec Common Model information from SolarEdge inverters.
 *
 * Features:
 * - Concurrent network scanning with configurable limits
 * - SolarEdge inverter identification via SunSpec protocol
 * - Modbus TCP communication on port 1502
 * - Environment-configurable subnet scanning
 * - Comprehensive logging of scan results
 *
 * @module findModbus
 */

/** Default Modbus TCP port for device communication */
const PORT = 1502;

/** Connection timeout in milliseconds per scan attempt */
const TIMEOUT = 200; // ms per attempt

/** Maximum number of concurrent socket connections during scan */
const CONCURRENCY = 100; // number of parallel sockets

/** Log file path for Modbus scanning operations */
const __logFile = path.join(logsDir, `modbus.log`);

/**
 * Determine the local network interface configuration for scanning.
 * Uses environment variable SCAN_SUBNET or defaults to 192.168.0.0/24.
 *
 * @returns Promise resolving to network configuration object
 * @returns {string} address - Network address in CIDR format
 * @returns {string} netmask - Network mask string
 *
 * @example
 * ```typescript
 * const config = await getLocalInterface();
 * // Returns: { address: "192.168.0.0/24", netmask: "255.255.255.0" }
 * ```
 */
async function getLocalInterface() {
  const hostIp = process.env.HOST_LAN_IP || "192.168.1.0";
  return {
    address: hostIp.split(".").slice(0, 3).join(".") + ".0",
    netmask: "255.255.255.0",
  };
}

/**
 * Generate all IP addresses within a given subnet range.
 * Creates an iterator that yields each IP address in the specified network.
 *
 * @param address - Base network address
 * @param netmask - Network mask to determine range
 * @yields Individual IP addresses within the subnet
 *
 * @example
 * ```typescript
 * for (const host of generateHosts("192.168.0.0", "255.255.255.0")) {
 *   console.log(host); // "192.168.0.1", "192.168.0.2", etc.
 * }
 * ```
 */
function* generateHosts(address: string, netmask: string) {
  const subnet = ip.subnet(address, netmask);
  const first = ip.toLong(subnet.firstAddress);
  const last = ip.toLong(subnet.lastAddress);
  for (let long = first; long <= last; long++) {
    yield ip.fromLong(long);
  }
}

/**
 * Test if a specific host has an open port on the Modbus TCP port.
 * Attempts a socket connection with timeout to determine port availability.
 *
 * @param host - IP address to test for port connectivity
 * @returns Promise resolving to true if port is open, false otherwise
 *
 * @example
 * ```typescript
 * const isOpen = await checkPort("192.168.0.100");
 * if (isOpen) console.log("Modbus device found");
 * ```
 */
function checkPort(host: string) {
  return new Promise<boolean>((resolve) => {
    const sock = new net.Socket();
    let done = false;

    sock.setTimeout(TIMEOUT);
    sock.once("connect", () => {
      done = true;
      sock.destroy();
      resolve(true);
    });
    sock.once("timeout", () => {
      if (!done) {
        done = true;
        sock.destroy();
        resolve(false);
      }
    });
    sock.once("error", () => {
      if (!done) {
        done = true;
        sock.destroy();
        resolve(false);
      }
    });

    sock.connect(PORT, host);
  });
}

/**
 * SunSpec Common Model information structure.
 * Contains device identification data extracted from SolarEdge inverters.
 *
 * @see {@link https://sunspec.org/} - SunSpec Alliance documentation
 */
interface SunSpecCommonInfo {
  /** SunSpec signature identifier (should be "SunS") */
  signature: string;
  /** Model ID number (1 for Common block) */
  modelId: number;
  /** Length of the data block in registers */
  blockLength: number;
  /** Device manufacturer name */
  manufacturer: string;
  /** Device model identifier */
  model: string;
  /** Firmware version string */
  version: string;
  /** Device serial number */
  serial: string;
}

/**
 * Scan the local network for Modbus TCP devices.
 * Performs concurrent port scanning and SolarEdge identification across the subnet.
 *
 * @returns Promise resolving to array of discovered devices with SunSpec info
 *
 * @example
 * ```typescript
 * const devices = await findModbusDevices();
 * devices.forEach(device => {
 *   console.log(`Found device at ${device.host}`);
 *   if (device.SunSpec) console.log(`Manufacturer: ${device.SunSpec.manufacturer}`);
 * });
 * ```
 */
async function findModbusDevices() {
  const { address, netmask } = await getLocalInterface();
  log(__logFile, "findModbus", `Scanning ${address}/${netmask} for Modbus port ${PORT}…`);

  const limit = pLimit(CONCURRENCY);
  const tasks: Promise<{ host: string; open: boolean; SunSpec: SunSpecCommonInfo | null }>[] = [];

  for (const host of generateHosts(address, netmask)) {
    tasks.push(
      limit(async () => {
        const open = await checkPort(host);
        let SunSpec = null;
        if (open) SunSpec = await identifySolarEdge(host);
        return { host, open, SunSpec };
      }),
    );
  }
  const results = await Promise.all(tasks);
  return results.filter((r) => r.open).map((r) => ({ host: r.host, SunSpec: r.SunSpec }));
}

/**
 * Decode SunSpec Common Model data from Modbus register array.
 * Parses the standard SunSpec Common block (Model 1) containing device information.
 *
 * @param regs - Array of 16-bit register values from Modbus read
 * @returns Decoded SunSpec common information structure
 *
 * @example
 * ```typescript
 * const registers = [0x5375, 0x6e53, 1, 65, ...]; // "SunS" + model data
 * const info = decodeSunSpecCommon(registers);
 * console.log(info.manufacturer); // "SolarEdge"
 * ```
 */
function decodeSunSpecCommon(regs: number[]): SunSpecCommonInfo {
  // helper: grab `count` regs starting at `start`, decode two ASCII chars each
  const readAscii = (start: number, count: number): string =>
    regs
      .slice(start, start + count)
      .map((w) => String.fromCharCode((w >> 8) & 0xff, w & 0xff))
      .join("")
      .trim();

  return {
    // 0–1: Signature "SunS"
    signature: readAscii(0, 2),

    // 2: Model ID (should be 1 for Common block)
    modelId: regs[2],

    // 3: Block Length (number of regs in this block)
    blockLength: regs[3],

    // 4–8: Manufacturer ("SolarEdge")
    manufacturer: readAscii(4, 5),

    // 20–24: Model ("SE7600H-US")
    model: readAscii(20, 5),

    // 44–50: Version (e.g. "0004.0023.0036")
    version: readAscii(44, 7),

    // 52–55: Serial number (ASCII, e.g. "7413C0E2")
    serial: readAscii(52, 4),
  };
}

/**
 * Connect to a SolarEdge inverter and read SunSpec Common Model information.
 * Establishes Modbus TCP connection and reads the standard SunSpec registers.
 *
 * @param ip - IP address of the SolarEdge device
 * @returns Promise resolving to SunSpec common information or error placeholder
 *
 * @example
 * ```typescript
 * const info = await identifySolarEdge("192.168.0.100");
 * if (info.manufacturer === "SolarEdge") {
 *   console.log(`Found SolarEdge ${info.model}, Serial: ${info.serial}`);
 * }
 * ```
 */
async function identifySolarEdge(ip: string) {
  const client = new ModbusRTU();
  await client.connectTCP(ip, { port: 1502 });
  client.setID(1);
  client.setTimeout(300); // give it 300 ms

  try {
    // read 65 registers starting at 40000
    const regs = await client.readHoldingRegisters(40000, 65);
    return decodeSunSpecCommon(regs.data);
  } catch (err: any) {
    log(__logFile, "identifySolarEdge", `Error reading from ${ip}:`, err.message);
    return {
      signature: "Unknown",
      modelId: 0,
      blockLength: 0,
      manufacturer: "Unknown",
      model: "Unknown",
      version: "Unknown",
      serial: "Unknown",
    };
  } finally {
    client.close();
  }
}

/**
 * Main entry point for Modbus device discovery.
 * Scans the network for SolarEdge inverters and returns the first valid device found.
 * Logs all discovery operations to the modbus log file.
 *
 * @returns Promise resolving to first SolarEdge device found, or null if none discovered
 *
 * @example
 * ```typescript
 * const solarEdge = await findModbus();
 * if (solarEdge) {
 *   console.log(`SolarEdge found at ${solarEdge.host}`);
 *   console.log(`Model: ${solarEdge.SunSpec.model}`);
 * } else {
 *   console.log("No SolarEdge devices found");
 * }
 * ```
 *
 * @remarks
 * This function specifically looks for devices with MAC address 00:19:9d:e4:c2:17
 * which is characteristic of SolarEdge inverters.
 */
// MAC address of solar edge is 00:19:9d:e4:c2:17
export const findModbus = async () => {
  log(__logFile, "findModbus", "searching port 1502");
  try {
    const devices = await findModbusDevices();
    if (devices.length) {
      log(__logFile, "findModbus", "Found Modbus on port 1502 at:");
      for (const unit of devices) {
        if (unit.SunSpec?.manufacturer === "SolarEdge") {
          log(__logFile, "findModbus", unit.host, JSON.stringify(unit.SunSpec));
          return unit;
        }
      }
    } else {
      log(__logFile, "findModbus", "No devices responded on port 1502");
    }
  } catch (err) {
    log(__logFile, "findModbus", "ERROR", err);
  }
  return null;
};
