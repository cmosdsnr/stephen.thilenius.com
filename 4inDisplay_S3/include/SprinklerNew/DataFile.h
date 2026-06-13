/**
 * @file DataFile.h
 * @brief Sprinkler configuration file helpers.
 */

/**
 * @brief Load sprinkler configuration from storage.
 * @return True on success
 */
bool loadDataFile();
/**
 * @brief Save sprinkler configuration to storage.
 * @return True on success
 */
bool saveDataFile();

/**
 * @brief Initializes the schedule with test data and saves to persistent storage.
 */
void initData();