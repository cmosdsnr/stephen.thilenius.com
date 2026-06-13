/**
 * @file ProjectConfig.h
 * @brief Single point of truth for build project selection.
 *
 * This is the ONLY file that contains an #if-elif project selection chain.
 * All other files include this header and use the macros it defines.
 *
 * To add a new project:
 *   1. Add #elif defined NEW_PROJECT block below
 *   2. Add [env:new_project] to platformio.ini
 */

#pragma once

#include <ArduinoJson.h>

// ── GLIDERPORT ────────────────────────────────────────────────────────────────
#ifdef GLIDERPORT
#include "Gliderport/TabGliderport.h"
#include "Gliderport/TabRose.h"
#include "Gliderport/TabStatus.h"
#include "Gliderport/SerialCommands.h"
#include "Gliderport/SocketCodes.h"
#include "Gliderport/HostName.h"
#include "Gliderport/Gliderport.h"
#include "Gliderport/GliderportTimer.h"
#include "Gliderport/Sensors.h"
#define PROJECT_MENU_LABEL "Gliderport menu"
#define STATUS_TAB     1
#define GLIDERPORT_TAB 2
#define ROSE_TAB       3
#define NUMBER_TABS    4
#define INIT_PROJECT_TABS()                            \
    tab[GLIDERPORT_TAB] = new TabGliderport(_tft);     \
    tab[ROSE_TAB]       = new TabRose(_tft);           \
    tab[STATUS_TAB]     = new TabStatus(_tft, wifiNetworks)
#define PROJECT_EARLY_SETUP()   // nothing
#define PROJECT_LATE_SETUP()    \
    InitGliderportTimer();      \
    sensors.initBMP();          \
    sensors.reset();            \
    sensors.sampleDht11();      \
    sensors.sampleBmp()
#define PROJECT_LOOP()  gpLoop()

// ── COFFEE ────────────────────────────────────────────────────────────────────
#elif defined COFFEE
#include "Coffee/TabCoffee.h"
#include "Coffee/TabShot.h"
#include "Coffee/SerialCommands.h"
#include "Coffee/HostName.h"
#include "Coffee/Shot.h"
#define COFFEE_TAB  1
#define SHOT_TAB    2
#define NUMBER_TABS 3
#define INIT_PROJECT_TABS()                 \
    tab[COFFEE_TAB] = new TabCoffee(_tft); \
    tab[SHOT_TAB]   = new TabShot(_tft)
#define PROJECT_EARLY_SETUP()   shot = new Shot()
#define PROJECT_LATE_SETUP()    // nothing
#define PROJECT_LOOP()          shot->loop()

// ── GARAGE ────────────────────────────────────────────────────────────────────
#elif defined GARAGE
#include "Garage/TabGarage.h"
#include "Garage/SerialCommands.h"
#include "Garage/HostName.h"
#include "Garage/Relays.h"
#include "Garage/Distance.h"
#define PROJECT_MENU_LABEL "Garage menu"
#define GARAGE_TAB  1
#define NUMBER_TABS 2
#define INIT_PROJECT_TABS() \
    tab[GARAGE_TAB] = new TabGarage(_tft)
#define PROJECT_EARLY_SETUP()   setupDistance()
#define PROJECT_LATE_SETUP()    // nothing
#define PROJECT_LOOP()          \
    distanceLoop();             \
    relays->Check()

// ── DESK ──────────────────────────────────────────────────────────────────────
#elif defined DESK
#include "Desk/TabWind.h"
#include "Desk/TabDevices.h"
#include "Desk/TabPower.h"
#include "Desk/TabShot.h"
#include "Desk/SerialCommands.h"
#include "Desk/HostName.h"
#include "Desk/Ultimeter.h"
#include "Desk/Shot.h"
#define PROJECT_MENU_LABEL "Desk menu"
#define WIND_TAB    1
#define DEVICES_TAB 2
#define POWER_TAB   3
#define SHOT_TAB    4
#define NUMBER_TABS 5
#define INIT_PROJECT_TABS()                         \
    tab[WIND_TAB]    = new TabWind(_tft);           \
    tab[DEVICES_TAB] = new TabDevices(_tft);        \
    tab[POWER_TAB]   = new TabPower(_tft);          \
    tab[SHOT_TAB]    = new TabShot(_tft)
#define PROJECT_EARLY_SETUP()               \
    ultimeter = new Ultimeter();            \
    shot = new Shot()
#define PROJECT_LATE_SETUP()    // nothing
#define PROJECT_LOOP()          \
    ultimeter->loop();          \
    shot->loop()

// ── SPRINKLER ─────────────────────────────────────────────────────────────────
#elif defined SPRINKLER
#include "Sprinkler/TabSprinkler.h"
#include "Sprinkler/TabStatus.h"
#include "Sprinkler/SerialCommands.h"
#include "Sprinkler/WebSockets.h"
#include "Sprinkler/SocketCodes.h"
#include "Sprinkler/HostName.h"
#include "Sprinkler/Sprinkler.h"
#define PROJECT_MENU_LABEL "Sprinkler menu"
#define SPRINKLER_TAB 1
#define STATUS_TAB    2
#define NUMBER_TABS   3
#define INIT_PROJECT_TABS()                         \
    tab[SPRINKLER_TAB] = new TabSprinkler(_tft);   \
    tab[STATUS_TAB]    = new TabStatus(_tft)
#define PROJECT_EARLY_SETUP()   // nothing
#define PROJECT_LATE_SETUP()    sprinklerSetup()
#define PROJECT_LOOP()          sprinklerLoop()

// ── SPRINKLER_NEW ─────────────────────────────────────────────────────────────
#elif defined SPRINKLER_NEW
#include "SprinklerNew/TabSprinkler.h"
#include "SprinklerNew/TabStatus.h"
#include "SprinklerNew/SerialCommands.h"
#include "SprinklerNew/WebSockets.h"
#include "SprinklerNew/SocketCodes.h"
#include "SprinklerNew/HostName.h"
#include "SprinklerNew/Sprinkler.h"
#define PROJECT_MENU_LABEL "Sprinkler menu"
#define SPRINKLER_TAB 1
#define STATUS_TAB    2
#define NUMBER_TABS   3
#define INIT_PROJECT_TABS()                         \
    tab[SPRINKLER_TAB] = new TabSprinkler(_tft);   \
    tab[STATUS_TAB]    = new TabStatus(_tft)
#define PROJECT_EARLY_SETUP()   // nothing
#define PROJECT_LATE_SETUP()    sprinklerSetup()
#define PROJECT_LOOP()          sprinklerLoop()

// ── POWERMETER ────────────────────────────────────────────────────────────────
#elif defined POWERMETER
#include "Power/TabPowerMeter.h"
#include "Power/SerialCommands.h"
#include "Power/HostName.h"
#include "Power/PowerMeter.h"
#define PROJECT_MENU_LABEL "PowerMeter menu"
#define POWERMETER_TAB 1
#define NUMBER_TABS    2
#define INIT_PROJECT_TABS() \
    tab[POWERMETER_TAB] = new TabPowerMeter(_tft)
#define PROJECT_EARLY_SETUP()   // nothing
#define PROJECT_LATE_SETUP()    powerMeterSetup()
#define PROJECT_LOOP()          block = powerMeterLoop()

#endif
