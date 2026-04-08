#ifndef TABS_H
#define TABS_H

/**
 * @file Tabs.h
 * @brief Tab collection manager and layout constants.
 */

/**
 * @brief Configuration and selection of application tabs.
 *
 * Defines which tabs are active based on the compilation target
 * (GLIDERPORT, GARAGE, etc.) and sets visual constants.
 */

#include "Tab.h"
#include "TabNetwork.h"
#include "Colors.h"

#define TAB_H 65
#define CORNER_RADIUS 15

#define SPACING 2 // spacing between tabs at top of screen

#define NETWORK_TAB 0

#ifdef GLIDERPORT
#include "Gliderport/TabGliderport.h"
#include "Gliderport/TabRose.h"
#include "Gliderport/TabStatus.h"
#define STATUS_TAB 1
#define GLIDERPORT_TAB 2
#define ROSE_TAB 3
#define NUMBER_TABS 4
#elif defined COFFEE
#include "Coffee/TabCoffee.h"
#include "Coffee/TabConfig.h"
#define COFFEE_TAB 1
#define CONFIG_TAB 2
#define NUMBER_TABS 3
#elif defined GARAGE
#include "Garage/TabGarage.h"
#define GARAGE_TAB 1
#define NUMBER_TABS 2
#elif defined DESK
#include "Desk/TabWind.h"
#include "Desk/TabDevices.h"
#include "Desk/TabPower.h"
#include "Desk/TabShot.h"
#define WIND_TAB 1
#define DEVICES_TAB 2
#define POWER_TAB 3
#define SHOT_TAB 4
#define NUMBER_TABS 5
#elif defined SPRINKLER
#include "Sprinkler/TabSprinkler.h"
#include "Sprinkler/TabStatus.h"
#define SPRINKLER_TAB 1
#define STATUS_TAB 2
#define NUMBER_TABS 3
#elif defined POWERMETER
#include "Power/TabPowerMeter.h"
#define POWERMETER_TAB 1
#define NUMBER_TABS 2
#endif

class Tabs
{
public:
    /** @brief Construct the tabs manager. */
    Tabs(TFT_eSPI *tft, Networks *wifiNetworks);
    /** @brief Destroy the tabs manager. */
    ~Tabs();
    /** @brief Update the active tab. */
    void loop(bool block);
    /** @brief Handle touch input for tabs and content. */
    void handle(uint16_t x, uint16_t y, uint32_t lastClick); // see if we touched the tab or tab content and handle the touch
    /** @brief Draw the tab header bar. */
    void drawTabsHeader(); // draw tabs at top of screen
    /** @brief Initialize variables for all tabs. */
    void initializeVariables(); // initialize variables for all tabs
    Tab **tab;

private:
    TFT_eSPI *_tft;
    uint8_t _currentTab = 0;
    uint8_t _tabCount = 4;
    bool connected = false;
    int16_t _padding = 0;
    uint8_t _headerFont = 2;
};

extern Tabs *tabs;
#endif