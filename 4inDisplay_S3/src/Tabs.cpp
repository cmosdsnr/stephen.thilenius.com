/**
 * @file Tabs.cpp
 * @brief Tabs manager implementation.
 */

#include "Tabs.h"
#include "Buzzer.h"
#include "Report.h"
#include "Networks.h"

Tabs *tabs;

/**
 * @brief Construct a new Tabs object.
 *
 * Initializes all configured tabs for the project.
 *
 * @param tft Display driver
 * @param wifiNetworks Network manager
 */
Tabs::Tabs(TFT_eSPI *tft, Networks *wifiNetworks)
{
    _tft = tft;
    _tabCount = NUMBER_TABS;
    tab = new Tab *[_tabCount];

    //! Initialize other tabs here
    tab[NETWORK_TAB] = new TabNetwork(_tft, wifiNetworks);

#ifdef GLIDERPORT
    tab[GLIDERPORT_TAB] = new TabGliderport(_tft);
    tab[ROSE_TAB] = new TabRose(_tft);
    tab[STATUS_TAB] = new TabStatus(_tft, wifiNetworks);
#elif defined COFFEE
    tab[COFFEE_TAB] = new TabCoffee(_tft);
    tab[CONFIG_TAB] = new TabConfig(_tft);
#elif defined GARAGE
    tab[GARAGE_TAB] = new TabGarage(_tft);
#elif defined DESK
    tab[WIND_TAB] = new TabWind(_tft);
    tab[DEVICES_TAB] = new TabDevices(_tft);
    tab[POWER_TAB] = new TabPower(_tft);
    tab[SHOT_TAB] = new TabShot(_tft);
#elif defined SPRINKLER
#include "Sprinkler/Sprinkler.h"
    tab[SPRINKLER_TAB] = new TabSprinkler(_tft);
    tab[STATUS_TAB] = new TabStatus(_tft);
#elif defined POWERMETER
#include "Power/PowerMeter.h"
    tab[POWERMETER_TAB] = new TabPowerMeter(_tft);
#endif

    // Try font 4 first; fall back to font 2 if padding would be too tight
    _tft->setTextFont(4);
    int totalNameWidth = 0;
    for (uint8_t i = 0; i < _tabCount; i++)
    {
        tab[i]->nameWidth = _tft->textWidth(tab[i]->name.c_str());
        tab[i]->bgColor = rgbTo565(TAB_COLORS[i % TAB_COLOR_COUNT]);
        totalNameWidth += tab[i]->nameWidth;
    }
    _padding = (_tft->width() - totalNameWidth - (_tabCount - 1) * SPACING) / (2 * _tabCount);
    if (_padding > 4)
    {
        _headerFont = 4;
    }
    else
    {
        _headerFont = 2;
        _tft->setTextFont(2);
        totalNameWidth = 0;
        for (uint8_t i = 0; i < _tabCount; i++)
        {
            tab[i]->nameWidth = _tft->textWidth(tab[i]->name.c_str());
            totalNameWidth += tab[i]->nameWidth;
        }
        _padding = (_tft->width() - totalNameWidth - (_tabCount - 1) * SPACING) / (2 * _tabCount);
    }

    //! draw tab 0
    _currentTab = 0;
    drawTabsHeader();
    tab[_currentTab]->draw();
}

/**
 * @brief Main loop for tab management.
 *
 * Handles touch input and delegates to active tab.
 *
 * @param block If true, skip touch checking
 */
void Tabs::loop(bool block)
{
    static uint64_t lastClick = 0;
    uint16_t x, y;

    if (((TabNetwork *)tab[0])->isConnected() && !connected)
    {
        delay(1000);
        connected = true;
        _currentTab = NUMBER_TABS - 1;
#ifdef COFFEE
        _currentTab = COFFEE_TAB;
#endif
        drawTabsHeader();
        tab[_currentTab]->draw();
    }

    if (!block && _tft->getTouch(&x, &y))
    {
        if (y <= TAB_H - CORNER_RADIUS)
            handle(x, y, millis() - lastClick);
        else
            tab[_currentTab]->handle(x, y, millis() - lastClick);
        lastClick = millis();
    }
    tab[_currentTab]->loop();
    tab[_currentTab]->isActive = true;
}

/**
 * @brief Initializes variables for all tabs (on startup).
 */
void Tabs::initializeVariables()
{
    for (uint8_t i = 0; i < _tabCount; i++)
    {
        tab[i]->initializeVariables();
    }
}

/**
 * @brief Draws the top navigation bar with tab names.
 */
void Tabs::drawTabsHeader()
{
    uint16_t x = 0;
    _tft->setTextFont(_headerFont);
    _tft->setTextDatum(ML_DATUM);
    for (uint8_t i = 0; i < _tabCount; i++)
    {
        _tft->fillRoundRect(x, 0, tab[i]->nameWidth + 2 * _padding, TAB_H, CORNER_RADIUS, tab[i]->bgColor);
        _tft->setTextColor(_currentTab == i ? TFT_BLACK : TFT_DARKGREY);
        int16_t w = _tft->textWidth(tab[i]->name);
        _tft->drawString(tab[i]->name, x + _padding, (TAB_H - CORNER_RADIUS) / 2);

        x += tab[i]->nameWidth + 2 * _padding + SPACING;
    }
}

/**
 * @brief Handles touch input on the tab header bar.
 *
 * Determines which tab was tapped and switches to it if different
 * from the current tab.
 *
 * @param x Touch X coordinate
 * @param y Touch Y coordinate
 * @param lastClick Milliseconds since the last touch event
 */
void Tabs::handle(uint16_t x, uint16_t y, uint32_t lastClick)
{
    uint8_t c = _tabCount - 1;
    if (lastClick > 100)
    {
        quickBeep();
        uint16_t edge = 0;
        for (uint8_t i = 0; i < _tabCount - 1; i++)
        {
            edge += tab[i]->nameWidth + 2 * _padding + SPACING;
            if (x < edge)
            {
                c = i;
                break;
            }
        }

        if (c != _currentTab)
        {
            tab[c]->isActive = true;
            tab[_currentTab]->isActive = false;

            //! Report.printf("Switching to tab %d from %d\n", c, _currentTab);
            //! if (tab[_currentTab]->isActive)
            //!     Report.printf("tab[%d] is active\n", _currentTab);
            //! else
            //!     Report.printf("tab[%d] is not active\n", _currentTab);
            //! if (tab[c]->isActive)
            //!     Report.printf("tab[%d] is active\n", c);
            //! else
            //!     Report.printf("tab[%d] is not active\n", c);

            _currentTab = c;
            drawTabsHeader();
            tab[_currentTab]->draw();
        }
    }
}

/**
 * @brief Destroys the Tabs object and frees allocated tab memory.
 */
//! Add destructor to clean up memory
Tabs::~Tabs()
{
    for (int i = 0; i < _tabCount; i++)
    {
        delete tab[i];
    }
    delete[] tab;
}
