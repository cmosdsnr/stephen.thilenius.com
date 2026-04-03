import * as fs from "fs";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { pb } from "pb";
import { logsDir } from "miscellaneous";

/**
 * Power meter data file management module.
 * Handles reading, writing, and processing of power meter data from JSON log files.
 * Manages synchronization between file-based logs and PocketBase database storage.
 *
 * @module dataFileMeter
 */

//exports {readMeterHours, addMeterPowerToFile, addMeterHourToFile, loadCurrentMeterHour}

/** Path to the meter data JSON log file */
const __logFile = logsDir + "meter.json";
console.log(__logFile);

/** Number of characters to read in each file chunk operation */
const CHARACTER_COUNT = 500;

/**
 * Read a chunk of characters from the meter log file.
 * Reads backwards from the end of the file for recent data processing.
 *
 * @param stat - File statistics object containing file size information
 * @param file - File descriptor for the opened log file
 * @param currentCharacterCount - Current position offset from end of file
 * @returns Promise resolving to string content of the read chunk
 */
async function readHundreds(stat: any, file: any, currentCharacterCount: number) {
  return new Promise((resolve, reject) => {
    const buffer = Buffer.alloc(CHARACTER_COUNT); // Create a Buffer
    fs.read(
      file,
      buffer as unknown as Uint8Array, // Explicitly cast Buffer to Uint8Array
      0,
      CHARACTER_COUNT,
      stat.size - 1 - currentCharacterCount,
      (err, bytesRead, buffer) => {
        if (err) {
          reject(err);
        } else {
          resolve((buffer as unknown as Buffer).toString("utf-8", 0, bytesRead));
        }
      }
    );
  });
}

/**
 * Convert hour number to zero-padded database ID string.
 * Creates consistent 15-character identifiers for PocketBase records.
 *
 * @param hr - Hour number (typically epoch hours)
 * @returns Zero-padded string of length 15
 * @example
 * ```typescript
 * hrToId(12345) // Returns "000000000012345"
 * ```
 */
const hrToId = (hr: number) => {
  return "0".repeat(15 - hr.toString().length) + hr.toString();
};

/**
 * Migrate meter data from JSON file to PocketBase database.
 * Reads all data from the log file and creates/updates corresponding database records.
 * Validates and fixes data integrity issues (ensures exactly 60 amperage readings per hour).
 *
 * @returns Promise resolving to the processed data array
 * @throws Error if file operations or database operations fail
 */
export const TranslateFile = async () => {
  //read the file as a JSON object
  const data = JSON.parse(fs.readFileSync(__logFile, "utf8"));
  console.log("data: ", data.length);
  for (let i = 0; i < data.length; i++) {
    const e = data[i];
    if (e.amperages.length != 60) {
      console.log(
        "powerMeter, bad data: ",
        e.hour,
        e.amperages.length,
        e.amperages.length > 60 ? "shortening" : "filling"
      );
      e.amperages =
        e.amperages.length > 60
          ? e.amperages.slice(0, 60)
          : [...e.amperages, ...Array(60 - e.amperages.length).fill(e.amperages[e.amperages.length - 1])];
    }
    const record = await pb
      .collection("powerMeter")
      .getFullList({
        filter: `id = "${hrToId(e.hour)}"`,
      })
      .catch((error: Error) => {
        console.log("powerMeter, couldn't get: ", error.message);
      });
    if (record.length > 0) {
      console.log("powerMeter, found, updating ", hrToId(e.hour));
      await pb
        .collection("powerMeter")
        .update(hrToId(e.hour), { amperages: e.amperages })
        .catch((error: Error) => {
          console.log("powerMeter, couldn't update: ", error.message);
        });
    } else {
      // if (record.length == 0) {
      console.log("powerMeter, not found, creating ", hrToId(e.hour));
      await pb
        .collection("powerMeter")
        .create({ id: hrToId(e.hour), amperages: e.amperages })
        .catch((error: Error) => {
          console.log("powerMeter, couldn't create: ", error.message);
        });
    }
  }
  return data;
};

/**
 * Validate database integrity for power meter records.
 * Checks for missing hours and incorrect data lengths in the PocketBase collection.
 * Scans from the earliest record to the current hour and reports inconsistencies.
 *
 * @returns Promise resolving to empty object (used for status reporting)
 */
export const checkDb = async () => {
  const last = Math.ceil(new Date().getTime() / (1000 * 3600));
  //get pocketbase record with lowest id
  const lowest = await pb.collection("powerMeter").getList(1, 1, {
    sort: "+id", // ascending
  });
  let start = lowest.items[0].id;
  console.log(
    "starting: ",
    start,
    " ",
    new Date(1000 * 3600 * start).toLocaleDateString(),
    " with length ",
    lowest.items[0].amperages.length
  );
  start++;
  while (start < last) {
    const record = await pb
      .collection("powerMeter")
      .getFullList({
        filter: `id = "${hrToId(start)}"`,
      })
      .catch((error: Error) => {
        console.log("powerMeter, couldn't get: ", error.message);
      });
    if (record.length == 0) {
      console.log("powerMeter, missing ", hrToId(start));
    } else {
      if (record[0].amperages.length != 60)
        console.log(`powerMeter, hour ${hrToId(start)} wrong length: ${record[0].amperages.length}`);
    }
    start++;
  }
  return {};
};

/**
 * Read the most recent meter data entries from the JSON log file.
 * Reads backwards from the end of file to get recent hourly power meter readings.
 * Handles file parsing errors and data cleanup automatically.
 *
 * @param maxLineCount - Maximum number of hourly records to read
 * @returns Promise resolving to array of meter data objects with hour timestamps and amperage arrays
 * @throws Error if log file doesn't exist or cannot be opened
 *
 * @example
 * ```typescript
 * const recentHours = await readMeterHours(24); // Get last 24 hours
 * // Returns: [{ hour: Date, amperages: [[6 values], ...60 minutes] }, ...]
 * ```
 */
export async function readMeterHours(maxLineCount: number) {
  if (!fs.existsSync(__logFile)) throw new Error(`File ${__logFile} does not exist.`);

  const stat: any = await new Promise((resolve, reject) =>
    // Load file Stats.
    fs.stat(__logFile, (err, stat) => {
      if (err) {
        reject(err);
      } else {
        resolve(stat);
      }
    })
  );

  const file: any = await new Promise((resolve, reject) =>
    // Open file for reading.
    fs.open(__logFile, "r", (err, file) => {
      if (err) {
        reject(err);
      } else {
        resolve(file);
      }
    })
  );

  let chars = CHARACTER_COUNT - 1;
  let lineCount = 0;
  let lines = "";

  while (lines.length < stat.size && lineCount < maxLineCount) {
    const nextHundreds = await readHundreds(stat, file, chars);

    if ((nextHundreds + lines.substring(0, 7)).includes('{"hour":')) {
      lineCount++;
    }
    lines = nextHundreds + lines;
    chars += CHARACTER_COUNT;

    if (lines.length > stat.size) {
      lines = lines.substring(lines.length - stat.size);
    }
  }

  fs.closeSync(file);

  lines = lines.slice(lines.indexOf('{"hour":'));
  lines = lines.replaceAll("\n", "");
  lines = lines.replaceAll(" ", "");

  // fix some potential issues with the file
  if (lines.includes("}{")) {
    lines = lines.replaceAll("}{", "},{");
    console.log("M FILE ERROR!! :: Fixed file issue with missing comma");
  }
  if (lines.includes("[,")) {
    lines = lines.replaceAll("[,", "[");
    console.log("M FILE ERROR!! :: Fixed file issue with [,");
  }
  if (lines.includes("NaN")) {
    lines = lines.replaceAll("NaN", "0");
    console.log("M FILE ERROR!! :: Fixed file issue with NaN");
  }

  lines = "[" + lines + "]}]";

  if (lines.includes(",]")) {
    lines = lines.replaceAll(",]", "]");
    console.log("M FILE ERROR!! :: Fixed file issue ,]");
  }
  try {
    JSON.parse(lines);
  } catch (e) {
    console.log("Error parsing meter file: ", e);
    console.log("lines: ", lines);
    return [];
  }

  const ret: any[] = JSON.parse(lines);
  ret.forEach((e, i) => (ret[i].hour = new Date(3600 * 1000 * e.hour)));
  // console.log(JSON.stringify(lines));
  return ret;
}

/** Current hour record being built - contains timestamp and 60-minute amperage array */
let record = { hour: new Date(), amperages: Array(60).fill(Array(6).fill(0)) };
const minute = record.hour.getMinutes() + 1;
record.hour.setTime(1000 * 3600 * Math.floor(record.hour.getTime() / (1000 * 3600)));

/**
 * Load and synchronize the current meter hour from the log file.
 * Reads the most recent hour from file, fills missing minutes with zeros,
 * and handles hour transitions by backfilling complete hours as needed.
 *
 * @returns Promise resolving to the current hour record with amperage data
 *
 * @example
 * ```typescript
 * const currentHour = await loadCurrentMeterHour();
 * // Returns: { hour: Date, amperages: Array(60) of 6-element arrays }
 * ```
 */
export const loadCurrentMeterHour = async () => {
  const lines: any[] = await readMeterHours(1);

  // console.log("lineS: ", JSON.stringify(lines));
  if (lines.length == 1) {
    let r: any = lines[0];
    const hour = r.hour.getTime() / (3600 * 1000);
    console.log("dataFileMeter last hour seen: ", hour);

    let readMinutes = r.amperages.length;
    const lastValue = [0, 0, 0, 0, 0, 0]; // r.amperages[r.amperages.length - 1];
    r.amperages = [...r.amperages, ...Array(60 - r.amperages.length).fill(Array(6).fill(lastValue))];
    const hoursOff = record.hour.getTime() / (3600 * 1000) - hour;
    if (hoursOff > 0) {
      // Write the rest of this hour
      for (let i = readMinutes; i < 60; i++) addMeterPowerToFile(JSON.stringify(lastValue), i);
      addMeterHourToFile(hour + 1);

      // add additional complete hours to file
      for (let i = 1; i < hoursOff; i++) {
        for (let j = 0; j < 60; j++) addMeterPowerToFile(JSON.stringify(lastValue), j);
        addMeterHourToFile(i + hour + 1);
      }
      console.log(
        "hours did NOT match, finished current hours and added " + hoursOff + " hours. Starting new hour at minute ",
        minute
      );
    } else {
      //hours match, pick up where we left off
      //copy the amperages, but not the hr (which is still a number, not a Date object)
      record.amperages = r.amperages;
    }

    // fill the rest of the current hour if some minutes are missing
    if (hoursOff > 0) readMinutes = 0;
    for (let i = readMinutes; i < minute - 1; i++) addMeterPowerToFile(JSON.stringify(lastValue), i);
    if (minute - 1 - readMinutes > 0)
      console.log("dataFileMeter Had to write ", minute - 1 - readMinutes, " zeros, missed minutes");
  }
  // console.log("line: ", JSON.stringify(record));
  return record;
};

/**
 * Append power measurement data to the meter log file.
 * Formats and writes amperage readings with proper JSON structure and spacing.
 *
 * @param str - JSON string containing 6-element amperage array
 * @param cnt - Minute counter within the hour (0-59)
 *
 * @example
 * ```typescript
 * addMeterPowerToFile('[1.2, 2.3, 3.4, 4.5, 5.6, 6.7]', 15); // 15th minute of hour
 * ```
 */
export const addMeterPowerToFile = (str: string, cnt: number) => {
  fs.appendFileSync(
    __logFile,
    (cnt == 0 ? "" : cnt % 5 == 0 ? ",\n" : ", ") + " ".repeat(str?.length < 26 ? 26 - str.length : 0) + str
  );
};

/**
 * Start a new hour section in the meter log file.
 * Closes the current hour's amperage array and begins a new hour record.
 *
 * @param hour - Hour identifier (typically epoch hours)
 *
 * @example
 * ```typescript
 * addMeterHourToFile(483615); // Start hour 483615
 * ```
 */
export const addMeterHourToFile = (hour: number) => {
  fs.appendFileSync(__logFile, ']},\n{"hour":' + hour + ', "amperages": [\n');
};
