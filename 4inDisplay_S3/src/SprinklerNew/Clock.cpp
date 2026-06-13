/**
 * @file Clock.cpp
 * @brief Sprinkler 14-day boundary clock and schedule position calculations.
 */

#ifdef SPRINKLER_NEW

#include "SprinklerNew/Clock.h"
#include "SprinklerNew/Structs.h"
#include "Report.h"
#include "SprinklerNew/WebSockets.h"

BoundaryData boundaryData = {0, 0, 0, {0}};

/**
 * @brief Calculates the 14-day cycle boundary aligned to local Sunday midnight.
 *
 * @return true if the time system is ready and the boundary was set, false otherwise.
 */
bool setBoundaryTime()
{
    if (!lastRebootFlag)
    {
        return false;
    }
    setenv("TZ", "PST8PDT,M3.2.0,M11.1.0", 1);
    tzset();
    time_t now = time(nullptr);
    struct tm localTm;
    localtime_r(&now, &localTm);
    int32_t gmtOffset_sec = -(int32_t)_timezone + (localTm.tm_isdst ? 3600 : 0);

    Report.printf("TZ env: %s\n", getenv("TZ") ? getenv("TZ") : "not set");
    Report.printf("tm_isdst: %d, _timezone: %ld\n", localTm.tm_isdst, _timezone);
    Report.printf("GMT offset in seconds: %ld\n", gmtOffset_sec);

    //! Calculate 14-day cycle boundary
    //! Jan 5, 1970 was the first Sunday (4 days after Unix epoch)
    int32_t FirstLocalSunday = (4 * 24 * 3600) + gmtOffset_sec;
    boundaryData.boundary = 14 * 24 * 3600 * (int)((timeSinceEpoch + FirstLocalSunday) / (14 * 24 * 3600)) - FirstLocalSunday;

    //! Calculate current position within the cycle
    boundaryData.daysSinceBoundary = (int)((timeSinceEpoch - boundaryData.boundary) / (24 * 60 * 60));
    boundaryData.dayStart = boundaryData.boundary + (24 * 60 * 60) * boundaryData.daysSinceBoundary;

    time_t boundary = boundaryData.boundary;
    localtime_r(&boundary, &boundaryData.boundaryInfo);

    //! Log timing information for debugging
    Report.printf("2 week boundary: %d\n", boundaryData.boundary);
    Report.printf("day of this week: %d\n", timeInfo.tm_wday);
    Report.printf("days since boundary: %d\n", boundaryData.daysSinceBoundary);
    Report.printf("epoch now: %d\n", getEpoch());
    char localTimeBuf[12];
    getLocalTime(localTimeBuf, sizeof(localTimeBuf));
    Report.printf("localTime: %s\n", localTimeBuf);
    Report.printf("today starts at: %d\n", boundaryData.dayStart);

    sendVariables();
    return true;
}

/**
 * @brief Returns the epoch time of the current 14-day cycle boundary.
 *
 * @return time_t Boundary epoch.
 */
time_t getBoundary()
{
    return boundaryData.boundary;
}

/**
 * @brief Computes days elapsed since the boundary from the current epoch.
 *
 * Boundary is aligned to local midnight, so integer division rolls over
 * at local midnight.
 *
 * @return Number of days elapsed.
 */
static uint32_t daysElapsed()
{
    return (uint32_t)((getEpoch() - boundaryData.boundary) / (24 * 60 * 60));
}

/**
 * @brief Returns the current day index within the 14-day cycle (0-13).
 *
 * @return Day index modulo NUM_DAYS.
 */
uint8_t getDaysSinceBoundary()
{
    return (uint8_t)(daysElapsed() % NUM_DAYS);
}

/**
 * @brief Returns the epoch time of the start of the current day.
 *
 * @return time_t Epoch at local midnight today.
 */
time_t getDayStart()
{
    return boundaryData.boundary + daysElapsed() * (24 * 60 * 60);
}

/**
 * @brief Returns the current position within the schedule (day index and minutes into day).
 *
 * @return SchedulePosition containing daysSinceBoundary and minutesIntoDay.
 */
SchedulePosition getSchedulePosition()
{
    SchedulePosition pos;
    time_t now = getEpoch();
    uint32_t days = daysElapsed();
    pos.daysSinceBoundary = (uint8_t)(days % NUM_DAYS);
    time_t dayStart = boundaryData.boundary + days * (24 * 60 * 60);
    pos.minutesIntoDay = (uint16_t)((now - dayStart) / 60);
    return pos;
}
#endif