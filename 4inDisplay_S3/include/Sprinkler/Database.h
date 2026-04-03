/**
 * @file Database.h
 * @brief Sprinkler database helpers.
 */

#ifndef DATABASE_H
#define DATABASE_H
#include <Arduino.h>

/**
 * @brief Retry uploading schedule data to PocketBase.
 * @param localShortTime Time string for the record
 * @return True on success
 */
bool retryUpdatePocketBase(char *localShortTime);
/**
 * @brief Upload schedule data to PocketBase.
 * @param localShortTime Time string for the record
 * @param activeHour Active hour index
 * @param hour Hourly schedule matrix
 * @return True on success
 */
bool updatePocketBase(char *localShortTime, int32_t activeHour, double hour[6][60]);
/**
 * @brief Get the current record id from PocketBase.
 */
void getRecordId();
/**
 * @brief URL-encode a string for HTTP requests.
 * @param str Input string
 * @return Encoded string
 */
String urlencode(String str);
#endif