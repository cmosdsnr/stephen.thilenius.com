/**
 * @packageDocumentation
 *
 * ## This module initializes the connection to the PocketBase backend service.
 * It performs the following tasks:
 *  - Sets up a global EventSource so that the PocketBase client can use it.
 *  - Loads environment variables from a `.env` file.
 *  - Defines a delay helper for retry logic.
 *  - Implements `testConnection` to verify if PocketBase is reachable.
 *  - Defines `pbInit`, which:
 *      * Tries to connect to a primary PocketBase URL.
 *      * If the connection fails, retries with a fallback URL.
 *      * Once connected, attempts to log in as an admin using preset credentials.
 *      * Uses retry logic (with a 15-second delay) for both connection and authentication.
 *  - Finally, it calls `pbInit()` to establish the connection and log in.
 *
 * ### Global Variables
 *  - `pb`: The PocketBase client instance.
 *  - `authData`: Holds authentication data after a successful login.
 *
 * ### Connection Strategy
 * The module implements a robust connection strategy with automatic failover:
 * 1. Primary: `http://pocketbase.web:5000` (local Docker container)
 * 2. Fallback: `https://pocketbase.thilenius.com` (external service)
 *
 * ### Security Note
 * This module contains hardcoded admin credentials for automated service initialization.
 * In production environments, consider using environment variables or secure credential storage.
 *
 * @module pb
 */

import PocketBase from "pocketbase";
import dotenv from "dotenv";

/** Global PocketBase client instance, available after successful initialization */
export let pb: any = null;

/** Authentication data containing admin session information after successful login */
export let authData: any = null;

// Load environment variables from .env file
dotenv.config();

/**
 * Returns a Promise that resolves after a specified delay.
 * Utility function used for implementing retry logic with exponential backoff.
 *
 * @param ms - The number of milliseconds to delay.
 * @returns A Promise that resolves after `ms` milliseconds.
 *
 * @example
 * ```typescript
 * await delay(5000); // Wait 5 seconds
 * console.log("This runs after 5 seconds");
 * ```
 */
const delay = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Tests the connection to the current PocketBase instance by calling its health endpoint.
 * Performs a health check to verify that the PocketBase service is accessible and responding.
 *
 * @param firstPass - Indicates if this is the first connection attempt (controls logging verbosity).
 *                    If true, connection failures are logged less verbosely to reduce noise during startup.
 * @returns A Promise that resolves to `true` if the health check succeeds; otherwise, `false`.
 *
 * @example
 * ```typescript
 * const isHealthy = await testConnection(true);
 * if (isHealthy) {
 *   console.log("PocketBase is ready");
 * } else {
 *   console.log("PocketBase is not responding");
 * }
 * ```
 */
async function testConnection(firstPass: boolean): Promise<boolean> {
  try {
    const health = await pb.health.check();
    console.log("pbInit:         ✅ Connection successful:", health);
    return true;
  } catch (error: any) {
    if (!firstPass) console.error("pbInit:         ❌ Connection failed:", error.message);
    return false;
  }
}

/**
 * Initializes the PocketBase connection and logs in as an admin.
 *
 * This function continuously attempts to:
 *  - Connect to the primary URL (`"http://pocketbase.web:5000"`). If that fails,
 *    switch to a fallback URL (`"https://pocketbase.thilenius.com"`).
 *  - Once connected, attempt to authenticate with admin credentials.
 *  - Use a 15-second delay between connection retries, and a 5-second delay between login retries.
 *
 * The function implements a robust retry mechanism that will continue attempting connection
 * and authentication until successful. This ensures the application can start even if
 * PocketBase is temporarily unavailable.
 *
 * @returns A Promise that resolves once a successful connection and login have been established.
 *
 * @throws Never throws - uses infinite retry logic until successful connection is established
 *
 * @example
 * ```typescript
 * // Initialize PocketBase connection
 * await pbInit();
 * console.log("PocketBase is ready for use");
 *
 * // Now pb and authData globals are available
 * const users = await pb.collection('users').getFullList();
 * ```
 *
 * @remarks
 * This function modifies the global `pb` and `authData` variables upon successful completion.
 * The connection strategy prioritizes local Docker containers over external services for performance.
 */
export const pbInit = (): Promise<void> => {
  return new Promise<void>(async (resolve, reject) => {
    /** Current PocketBase URL being attempted */
    let url = "";
    /** Flag indicating successful connection to PocketBase */
    let connected = false;
    /** Flag indicating successful admin authentication */
    let loggedIn = false;
    /** Flag to control logging verbosity on first connection attempt */
    let firstPass = true;

    console.log("pbInit:         connecting to pocketbase...");

    // Attempt to establish a connection to PocketBase
    while (!connected) {
      // Try primary URL
      url = "http://pocketbase.web:5000";
      console.log("pbInit:         Attempting to connect to PocketBase at:", url);
      pb = new PocketBase(url);
      pb.autoCancellation(false);
      connected = await testConnection(firstPass);

      // If primary fails, try fallback URL
      if (!connected) {
        url = "https://pocketbase.thilenius.com";
        console.log("pbInit:         Attempting to connect to PocketBase at:", url);
        pb = new PocketBase(url);
        pb.autoCancellation(false);
        connected = await testConnection(false);
      }
      firstPass = false;

      if (!connected) {
        console.log("pbInit:         Retrying in 15 seconds...");
        await delay(15000); // Wait 15 seconds before retrying
      }
    }

    // Once connected, attempt to log in with admin credentials
    while (!loggedIn) {
      try {
        authData = await pb.admins.authWithPassword(process.env.PB_ADMIN_EMAIL!, process.env.PB_ADMIN_PASSWORD!);
        console.log("pbInit:         pocketbase logged in to:", url);
        loggedIn = true;
        resolve();
      } catch (error: any) {
        console.error("pbInit:         pb connected but failed to login", error.message);
        console.log("pbInit:         Retrying login in 5 seconds...");
        await delay(5000); // Wait 5 seconds before retrying login
      }
    }
  });
};

// Immediately initialize the PocketBase connection and login
await pbInit();
