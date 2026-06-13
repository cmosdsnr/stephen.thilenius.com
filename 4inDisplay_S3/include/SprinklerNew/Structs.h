/**
 * @file Structs.h
 * @brief Sprinkler scheduling data structures.
 */

#ifndef STRUCTURES_H
#define STRUCTURES_H
#include <arduino.h>
#include <vector>

// Configuration constants
#define NUM_CHANNELS 7 // Number of sprinkler channels (CH1-CH5 + PUMP + spare)
#define NUM_DAYS 14    // 14-day cycle for sprinkler scheduling
#define NUM_SUSPENDS 3 // Number of upcoming watering slots tracked per channel

/**
 * @brief A single scheduled watering event (one channel, one day, one start time).
 *        Presence in the list implies enabled. Multiple entries per channel/day are allowed.
 */
struct ScheduleItem
{
    uint8_t day;      // day index in 14-day cycle (0-13)
    uint8_t channel;  // channel index (0-6)
    uint8_t duration; // duration in minutes
    uint16_t start;   // start time in minutes into the day (0-1439)
};

/**
 * @brief A single suspension entry identifying a specific scheduled event.
 */
struct SuspendItem
{
    uint8_t date;       // days since boundary (0-27; >= NUM_DAYS means next cycle)
    uint16_t startTime; // start time in minutes into the day
    uint8_t ch;         // channel index
};

/**
 * @brief Structure for update data.
 */
struct UpdateData
{
    uint8_t *channel;
    uint8_t channelCnt;
    int8_t *day;
    uint8_t dayCnt;
    uint8_t item;
    uint16_t value;
};

/**
 * @brief Represents a single watering event.
 */
struct WateringData
{
    uint16_t duration; // Duration in minutes
    time_t start;      // Start time as Unix timestamp
};

#endif

// External declarations - defined in Sprinkler.cpp
extern WateringData nextWatering[NUM_CHANNELS][NUM_SUSPENDS]; // Upcoming watering schedule per channel
extern std::vector<ScheduleItem> schedule;              // All scheduled watering entries
