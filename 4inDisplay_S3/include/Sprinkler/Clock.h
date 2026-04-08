/**
 * @file Clock.h
 * @brief Sprinkler 14-day boundary clock and schedule position declarations.
 */

#ifndef SPRINKLER_CLOCK_H
#define SPRINKLER_CLOCK_H

#include "../Clock.h"

/**
 * @brief Data describing the current 14-day cycle boundary.
 */
struct BoundaryData
{
    time_t boundary;
    uint8_t daysSinceBoundary;
    time_t dayStart;
    struct tm boundaryInfo;
};

/**
 * @brief Current position within the 14-day schedule cycle.
 */
struct SchedulePosition
{
    uint8_t daysSinceBoundary;
    uint16_t minutesIntoDay;
};

// needed from Clock.cpp in project specific Clock.cpp files
extern bool lastRebootFlag;
extern struct tm timeInfo;
extern time_t timeSinceEpoch;
extern BoundaryData boundaryData;

/**
 * @brief Calculates and stores the 14-day cycle boundary.
 * @return true if the boundary was set successfully.
 */
bool setBoundaryTime();
/**
 * @brief Returns the epoch time of the start of the current day.
 * @return Epoch at local midnight today.
 */
time_t getDayStart();
/**
 * @brief Returns the current day and minute within the schedule cycle.
 * @return SchedulePosition with day index and minutes into day.
 */
SchedulePosition getSchedulePosition();
/**
 * @brief Returns the current day index within the 14-day cycle.
 * @return Day index (0-13).
 */
uint8_t getDaysSinceBoundary();
/**
 * @brief Returns the epoch time of the current cycle boundary.
 * @return Boundary epoch.
 */
time_t getBoundary();
#endif
