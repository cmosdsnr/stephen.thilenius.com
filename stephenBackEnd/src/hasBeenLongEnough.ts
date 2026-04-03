/**
 * Rate limiting utility module for preventing rapid successive operations.
 * Provides throttling mechanisms with configurable time intervals to control
 * access frequency for resource-intensive operations.
 *
 * @module hasBeenLongEnough
 */

/** Global timestamp tracking the last access time for rate limiting */
let lastAccess = new Date("10-10-1999");

/**
 * Check if enough time has passed since the last access to allow a new operation.
 * Implements a simple rate limiting mechanism with a 2-second cooldown period.
 * Updates the last access time when sufficient time has elapsed.
 *
 * @param where - Identifier string for logging which operation is being rate limited
 * @returns True if enough time has passed (>2000ms), false otherwise
 *
 * @example
 * ```typescript
 * if (hasBeenLongEnough("database-query")) {
 *   // Proceed with operation - enough time has passed
 *   performDatabaseQuery();
 * } else {
 *   // Skip operation - too soon since last access
 *   console.log("Rate limited");
 * }
 * ```
 *
 * @remarks
 * The function uses a global lastAccess variable, making it shared across all
 * callers. Consider using separate instances for different operation types.
 */
export const hasBeenLongEnough = (where: string) => {
  // return true;

  if (new Date().getTime() - lastAccess.getTime() > 2000) {
    lastAccess = new Date();
    console.log(where + " long enough");
    return true;
  } else {
    console.log(where + " not long enough");
    return false;
  }
};

/**
 * Asynchronously wait until enough time has passed for an operation to proceed.
 * Continuously polls the rate limiter until the cooldown period expires.
 * Useful for ensuring operations respect rate limits without manual checking.
 *
 * @param where - Identifier string for logging which operation is waiting
 * @returns Promise that resolves when sufficient time has elapsed
 *
 * @example
 * ```typescript
 * await waitForLongEnough("api-request");
 * // Now safe to proceed with the API request
 * makeApiRequest();
 * ```
 *
 * @example
 * ```typescript
 * // Use in a loop to ensure rate limiting
 * for (const item of items) {
 *   await waitForLongEnough("batch-process");
 *   processItem(item);
 * }
 * ```
 *
 * @remarks
 * This function polls every 500ms until the rate limit allows the operation.
 * For high-frequency operations, consider adjusting the polling interval.
 */
export const waitForLongEnough = async (where: string) => {
  while (!hasBeenLongEnough(where)) {
    await new Promise((r) => setTimeout(r, 500));
  }
};
