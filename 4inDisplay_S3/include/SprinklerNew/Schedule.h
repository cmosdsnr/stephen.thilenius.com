/**
 * @file Schedule.h
 * @brief Sprinkler schedule utilities.
 */

#ifndef SCHEDULE_H
#define SCHEDULE_H
#include <arduino.h>
#include <SprinklerNew/Structs.h>

/**
 * @brief Convert a watering entry to a string.
 * @param d Watering data entry
 * @return Formatted string
 */
String stringifyDate(WateringData d);
/**
 * @brief Populate all dates for the schedule.
 */
void getAllDates();
/**
 * @brief Check and handle date boundary changes.
 */
void checkForDateChange();
/**
 * @brief Evaluate schedule for the given day and time.
 */
void checkSchedule();
/**
 * @brief Stops any active manual channel override.
 */
void stopManual();

#endif