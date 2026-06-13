/**
 * @file Schedule.cpp
 * @brief Sprinkler schedule evaluation logic.
 */

#ifdef SPRINKLER_NEW
#include "DebugServer.h"
#include "WebSerial.h"
#include "SprinklerNew/Clock.h"
#include "SprinklerNew/Sprinkler.h"
#include "SprinklerNew/Structs.h"
#include "SprinklerNew/SocketCodes.h"
#include "SprinklerNew/WebSockets.h"

/// @brief 2D array storing upcoming watering schedules for each channel
WateringData nextWatering[NUM_CHANNELS][NUM_SUSPENDS];

/**
 * @brief Converts a WateringData structure to a human-readable date/time string
 */
String stringifyDate(WateringData d)
{
    time_t t = d.start;
    struct tm timeinfo;
    char buf1[64];
    char buf2[32];

    localtime_r(&t, &timeinfo);
    strftime(buf1, 32, "%A, %B %d %Y %H:%M", &timeinfo);
    t += 60 * d.duration;
    localtime_r(&t, &timeinfo);
    strftime(buf2, 32, " to %H:%M", &timeinfo);
    strcat(buf1, buf2);
    sprintf(buf2, " (%d min)", d.duration);
    strcat(buf1, buf2);
    return String(buf1);
}

/**
 * @brief Populates the schedule array with upcoming watering events for all channels.
 *        Iterates schedule entries sorted by day offset from today, filling up to
 *        NUM_SUSPENDS slots per channel.
 */
void getAllDates()
{
    for (uint8_t i = 0; i < NUM_CHANNELS; i++)
        for (uint8_t j = 0; j < NUM_SUSPENDS; j++)
        {
            nextWatering[i][j].start = 0;
            nextWatering[i][j].duration = 0;
        }

    time_t now = getEpoch();
    uint8_t today = getDaysSinceBoundary();
    time_t ds = getDayStart();

    for (uint8_t inc = 0; inc < NUM_SUSPENDS * NUM_DAYS; inc++)
    {
        uint8_t day = (today + inc) % NUM_DAYS;
        time_t dayStart = ds + (time_t)inc * 24 * 3600;

        for (const ScheduleItem &e : schedule)
        {
            if (e.day != day)
                continue;
            time_t eventStart = dayStart + (time_t)e.start * 60;
            if (eventStart <= now)
                continue;

            for (uint8_t j = 0; j < NUM_SUSPENDS; j++)
            {
                if (nextWatering[e.channel][j].start == 0)
                {
                    nextWatering[e.channel][j].start = eventStart;
                    nextWatering[e.channel][j].duration = e.duration;
                    break;
                }
            }
        }
    }
}

/**
 * @brief Checks for changes in the upcoming schedule and notifies clients of any updates.
 */
void checkForDateChange()
{
    time_t now = getEpoch();
    uint8_t today = getDaysSinceBoundary();
    time_t ds = getDayStart();

    WateringData newSchedule[NUM_CHANNELS][NUM_SUSPENDS] = {};

    for (uint8_t inc = 0; inc < NUM_SUSPENDS * NUM_DAYS; inc++)
    {
        uint8_t day = (today + inc) % NUM_DAYS;
        time_t dayStart = ds + (time_t)inc * 24 * 3600;

        for (const ScheduleItem &e : schedule)
        {
            if (e.day != day)
                continue;
            time_t eventStart = dayStart + (time_t)e.start * 60;
            if (eventStart <= now)
                continue;

            for (uint8_t j = 0; j < NUM_SUSPENDS; j++)
            {
                if (newSchedule[e.channel][j].start == 0)
                {
                    newSchedule[e.channel][j].start = eventStart;
                    newSchedule[e.channel][j].duration = e.duration;
                    break;
                }
            }
        }
    }

    for (uint8_t i = 0; i < NUM_CHANNELS; i++)
        for (uint8_t j = 0; j < NUM_SUSPENDS; j++)
            if (nextWatering[i][j].start != newSchedule[i][j].start)
            {
                nextWatering[i][j] = newSchedule[i][j];
                updateNextWatering(i, j, nextWatering[i][j].start != 0 ? stringifyDate(nextWatering[i][j]).c_str() : "N/A");
            }
}

/**
 * @brief Stops any active manual channel override and notifies clients.
 */
void stopManual()
{
    if (manualChannel >= 0)
    {
        digitalWrite(sprinklerPins[manualChannel], LOW);
        uint8_t ch = (uint8_t)manualChannel;
        sendOnOff(ch, false);
        char buf[32];
        sprintf(buf, "Manual deactivate ch%d", manualChannel);
        printf("%s\n", buf);
        sendEvent("Manual Deactivate", buf);
        manualDuration = 0;
        manualStart = 0;
        manualChannel = -1;
    }
}

/**
 * @brief Main scheduling engine. Activates/deactivates channels based on current time.
 *        Only one channel runs at a time; manual control takes priority over scheduled.
 */
void checkSchedule()
{
    char buf[64];
    SchedulePosition pos = getSchedulePosition();
    uint8_t day = pos.daysSinceBoundary;

    // Manual channel takes priority
    if (manualChannel >= 0)
    {
        if (manualStart == 0)
        {
            manualStart = pos.minutesIntoDay;
            digitalWrite(sprinklerPins[manualChannel], HIGH);
            sendOnOff((uint8_t)manualChannel, true);
            sprintf(buf, "Manual activate ch%d for %d min", manualChannel, manualDuration);
            printf("%s\n", buf);
            sendEvent("Manual Activate", buf);
        }
        else if (pos.minutesIntoDay >= manualStart + manualDuration || manualDuration == 0)
        {
            stopManual();
        }
        return;
    }

    // If a channel is currently running, check whether its window is still valid
    if (runningChannel >= 0)
    {
        bool stillInWindow = false;
        for (const ScheduleItem &e : schedule)
        {
            if (e.channel == (uint8_t)runningChannel && e.day == day)
            {
                uint16_t stop = e.start + e.duration;
                if (pos.minutesIntoDay >= e.start && pos.minutesIntoDay < stop &&
                    !isSuspended(e.channel, day, e.start))
                {
                    stillInWindow = true;
                    break;
                }
            }
        }
        if (!stillInWindow)
        {
            digitalWrite(sprinklerPins[runningChannel], LOW);
            sendOnOff((uint8_t)runningChannel, false);
            sprintf(buf, "Deactivate ch%d", runningChannel);
            printf("%s\n", buf);
            sendEvent("Deactivate", buf);
            runningChannel = -1;
        }
        return;
    }

    // No channel running — find the first entry whose window is open
    for (const ScheduleItem &e : schedule)
    {
        if (e.day != day)
            continue;
        uint16_t stop = e.start + e.duration;
        if (pos.minutesIntoDay >= e.start && pos.minutesIntoDay < stop &&
            !isSuspended(e.channel, day, e.start))
        {
            digitalWrite(sprinklerPins[e.channel], HIGH);
            sendOnOff(e.channel, true);
            runningChannel = e.channel;
            sprintf(buf, "Activate ch%d", e.channel);
            printf("%s\n", buf);
            sendEvent("Activate", buf);
            break;
        }
    }
}

#endif
