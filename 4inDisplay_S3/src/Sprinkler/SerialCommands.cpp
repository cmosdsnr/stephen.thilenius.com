/**
 * @file SerialCommands.cpp
 * @brief Sprinkler serial command handlers.
 */

#ifdef SPRINKLER
#include "Sprinkler/SerialCommands.h"
#include "SerialMenu.h"
#include "Report.h"
#include "Sprinkler/DataFile.h"
#include <Arduino.h>
#include <Sprinkler/Structs.h>
#include <algorithm>
#include <Sprinkler/WebSockets.h>
#include "../../include/Sprinkler/Clock.h"

constexpr MenuItem menu2[] = {{'0', "Main menu", 0, nullptr},
                              {'1', "Initialize data", 0, nullptr},
                              {'2', "Show data", 0, nullptr},
                              {'?', "This help", 0, nullptr}};
const size_t menu2Size = sizeof(menu2) / sizeof(menu2[0]);

/**
 * @brief Prints the full schedule and current state to the serial console.
 */
void showData()
{
    const char *dayLabels[] = {"Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"};
    for (uint8_t day = 0; day < NUM_DAYS; day++)
    {
        // collect entries for this day
        std::vector<const ScheduleItem *> entries;
        for (const ScheduleItem &e : schedule)
            if (e.day == day)
                entries.push_back(&e);

        if (entries.empty())
            continue;

        // sort by start time
        std::sort(entries.begin(), entries.end(),
                  [](const ScheduleItem *a, const ScheduleItem *b)
                  { return a->start < b->start; });

        printf("%s(d:%d w:%d):\n", dayLabels[day % 7], day % 7, day / 7 + 1);
        for (const ScheduleItem *e : entries)
            printf("  ch%d start:%d:%02d dur:%d\n",
                   e->channel, e->start / 60, e->start % 60, e->duration);
    }
    printf("active channel: %d\n", runningChannel);
    // number of days since boundary
    printf("daysSinceBoundary: %d\n", getDaysSinceBoundary());
    // time of day
    time_t now = getEpoch();
    struct tm timeinfo;
    localtime_r(&now, &timeinfo);
    printf("current time: %02d:%02d\n", timeinfo.tm_hour, timeinfo.tm_min);
}
/**
 * @brief Handles serial commands for the Sprinkler module.
 *
 * This function is called from Serial.cpp when the menu selector is set to SPEC_MENU (Menu 2).
 * It processes single-character commands specific to this module.
 *
 * @param command The character command received from serial.
 * @param data Optional data string accompanying the command.
 */
void handleCommand(char command, char *data)
{
    printf("Command:%c %s\n", command, data);
    switch (command)
    {
    case '0': //!< Main menu
        SerialMenu.menuSelector = MAIN_MENU;
        SerialMenu.printMenu(MAIN_MENU);
        break;

    case '1': //!< Initialize data
        initData();
        break;
    case '2': //!< Show data
        showData();
        break;
    case '?': //!< This help
        SerialMenu.printMenu(MAIN_MENU);
        break;
    }
}
#endif
