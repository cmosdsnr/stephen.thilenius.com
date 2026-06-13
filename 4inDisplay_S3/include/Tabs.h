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
#include "ProjectConfig.h"

#define TAB_H 65
#define CORNER_RADIUS 15

#define SPACING 2 // spacing between tabs at top of screen

#define NETWORK_TAB 0

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