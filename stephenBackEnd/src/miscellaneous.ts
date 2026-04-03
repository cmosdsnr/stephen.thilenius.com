/**
 * @packageDocumentation
 *
 * Provides utility functions for file system checks and string formatting.
 * It includes functions to determine if a given path is a directory and to convert a string
 * into a fixed-length ID with leading zeros.
 *
 * @module miscellaneous
 */

import fs from "fs"; // Synchronous file system methods
import path from "path";
import { fileURLToPath } from "url";
import cron from "node-cron";
import { DateTime } from "luxon";

/**
 * Checks whether the specified file system path is a directory.
 *
 * @param pathToCheck - The file system path to verify.
 * @returns `true` if the path exists and is a directory; otherwise, `false`.
 *
 * @remarks
 * Uses synchronous `fs.statSync` to check. If any error occurs (e.g., path does not exist),
 * the function catches it and returns `false`.
 */
export function isDirectory(pathToCheck: string): boolean {
  try {
    return fs.statSync(pathToCheck).isDirectory();
  } catch {
    return false;
  }
}

/**
 * Converts a given string into a fixed-length ID by prepending leading zeros.
 *
 * The resulting string will be exactly 15 characters long. If the input string exceeds 15
 * characters, it is truncated to the first 15. If shorter, it is left-padded with zeros.
 * All characters are converted to lowercase.
 *
 * @param x - The input string to convert.
 * @returns A 15-character lowercase string with leading zeros if necessary.
 *
 * @example
 * ```ts
 * ToId("Hello")       // "000000000000hello"
 * ToId("abcdefghijklmnopqrstuvwxyz") // "000000000abcdefghijkl"
 * ```
 */
export const ToId = (x: string | number): string => {
  const str = x.toString();
  const truncated = str.slice(0, 15).toLowerCase();
  return "0".repeat(15 - truncated.length) + truncated;
};

/**
 * The directory name of the parent folder containing this module.
 *
 * Calculates `__dirname` based on the `import.meta.url` to support ES modules.
 */
const __filename = fileURLToPath(import.meta.url);

/** The directory path of the parent folder containing this module, calculated for ES modules */
export const __dirname = path.dirname(path.dirname(__filename));

/** The absolute path to the logs directory for storing application log files */
export let logsDir = path.join(__dirname, `/stephen/logs/`);

console.log("logsDir: ", logsDir);

/** Set tracking all log files that have been written to during application runtime */
const logFiles = new Set<string>();

/**
 * Appends a formatted log entry to the specified log file.
 *
 * - Prepends the message with the current date and time in `MM-DD-YYYY HH:mm:ss` format (Los Angeles timezone)
 * - Pads the first argument (label) to 17 characters for alignment
 * - Joins all arguments into a single string and writes it to the file
 * - Automatically tracks which log files have been used
 *
 * @param __logFile - The absolute path to the log file to write to
 * @param args - The message components to log. The first element is used as a label and will be padded
 *
 * @example
 * ```typescript
 * log("/path/to/app.log", "UserAuth", "User logged in:", "john@example.com");
 * // Writes: "12-25-2023 14:30:15  UserAuth:         User logged in: john@example.com"
 * ```
 *
 * @example
 * ```typescript
 * log("/path/to/error.log", "Database", "Connection failed", { host: "localhost", port: 5432 });
 * // Writes: "12-25-2023 14:30:15  Database:         Connection failed [object Object]"
 * ```
 */
export const log = (__logFile: string, ...args: any[]): void => {
  const date = DateTime.fromMillis(Date.now(), { zone: "America/Los_Angeles" })
    .toFormat("MM-dd-yyyy HH:mm:ss")
    .padEnd(20, " ");

  // keep a record of all log files used
  logFiles.add(__logFile);
  // Label formatting: append colon and pad to 17 characters.
  args[0] = args[0].toString() + ":";
  args[0] = args[0].padEnd(17, " ");

  // Join all arguments into one message string.
  const message = args.join(" ");

  // Append to log file with newline.
  fs.appendFileSync(__logFile, `${date} ${message}\n`);
};

/** Maximum number of lines to retain in each log file during truncation */
const max = 5000;

/** Path to the cron job log file for logging maintenance operations */
const __LogFile = path.join(logsDir, "cron.log");

/**
 * Truncates all log files in the logs directory to the most recent N lines.
 * Prevents excessive file size buildup by keeping only the most recent entries.
 * Scans the logs directory for all .log files and processes each one individually.
 *
 * @remarks
 * - Default maximum lines retained: 5000
 * - Only processes files with .log extension
 * - Logs its own operations to the cron log file
 * - Safe to call multiple times - will only truncate if necessary
 *
 * @example
 * ```typescript
 * // Called automatically by cron job, but can be invoked manually:
 * limitLogLineNumbers();
 * // Checks all .log files in logsDir and truncates any over 5000 lines
 * ```
 */
const limitLogLineNumbers = () => {
  if (!fs.existsSync(logsDir)) {
    console.log("Log directory does not exist:", logsDir);
    return;
  }
  //scan logsDir for log files
  const logFiles = fs.readdirSync(logsDir).filter((file) => file.endsWith(".log"));
  if (logFiles.length === 0) {
    log(__LogFile, "No log files found in directory:", logsDir);
    return;
  }
  // Process each log file
  logFiles.forEach((file) => {
    const filePath = path.join(logsDir, file);
    const data = fs.readFileSync(filePath, "utf8");
    const lines = data.split("\n");
    if (lines.length > max) {
      const newLines = lines.slice(lines.length - max).join("\n");
      fs.writeFileSync(filePath, newLines);
      log(__LogFile, "Cron", `Log file ${file} trimmed to ${max} lines.`);
    } else {
      log(__LogFile, "Cron", `Log file ${file} has ${lines.length} lines, no truncation needed.`);
    }
  });
};

// Initial call to trim log files on module load
// limitLogLineNumbers();

/**
 * Scheduled cron job that runs log file maintenance.
 * Executes daily at 2:00 AM Los Angeles time to truncate log files.
 * Prevents log files from growing indefinitely by maintaining a maximum line count.
 *
 * @see {@link limitLogLineNumbers} - The function executed by this cron job
 * @see {@link https://github.com/node-cron/node-cron} - node-cron documentation
 *
 * @example
 * Schedule format: "0 2 * * *" means:
 * - 0: minute (2:00, not 2:01)
 * - 2: hour (2 AM)
 * - *: any day of month
 * - *: any month
 * - *: any day of week
 */
cron.schedule("0 2 * * *", limitLogLineNumbers, {
  timezone: "America/Los_Angeles",
});
