/**
 * @file Sprinkler.cpp
 * @brief Sprinkler module implementation.
 */

#ifdef SPRINKLER
#include <Arduino.h>
#include "Clock.h"
#include "Tabs.h"
#include "Report.h"
#include "devkit_pins.h"
#include "Sprinkler/Sprinkler.h"
#include "Sprinkler/Structs.h"
#include "Sprinkler/DataFile.h"
#include "Sprinkler/Schedule.h"
#include "Sprinkler/WebSockets.h"

/// @brief All scheduled watering entries (day, channel, duration, start).
std::vector<ScheduleItem> schedule;

/// @brief GPIO pin assignments for sprinkler channels
/// @details Maps to: [PUMP, CH1, CH2, CH3, CH4, CH5, NC]
const uint8_t sprinklerPins[] = {PUMP_PIN, CH1_PIN, CH2_PIN, CH3_PIN, CH4_PIN, NC_PIN};

bool boundarySet = false;

/**
 * @brief Main initialization function for the sprinkler system
 * @details Performs complete system setup including:
 *          1. Loading configuration from persistent storage
 *          2. Extracting current time components
 *          3. Calculating timezone offset from system time
 *          4. Computing 14-day cycle boundary and current position
 *          5. Initializing scheduling system
 *          6. Running initial schedule check
 *
 * @note Must be called after time synchronization (setupTime())
 * @warning Requires valid timeInfo structure from time system
 */
void sprinklerSetup()
{
    if (!loadDataFile())
        initData();
}

/**
 * @brief Main loop function for sprinkler system (currently unused)
 * @details Reserved for future periodic tasks such as:
 *          - Sensor readings
 *          - Network communication
 *          - Status updates
 * @note Currently empty - scheduling is handled by main system timer
 */
void sprinklerLoop()
{

    if (!boundarySet)
    {
        if (setBoundaryTime())
        {
            boundarySet = true;
            //! Configure status tab with boundary information
            // ((TabStatus *)tabs->tab[STATUS_TAB])->SetBoundary(boundaryData);

            //! Initialize scheduling system
            getAllDates();
        }
    }
    else
    {
        //! Regular schedule check every minute
        checkSchedule();
    }
}

#endif
