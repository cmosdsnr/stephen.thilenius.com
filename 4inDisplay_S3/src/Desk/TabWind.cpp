#ifdef DESK

/**
 * @file TabWind.cpp
 * @brief Wind tab UI implementation for wind data.
 */

#include <TFT_eWidget.h> //!< Widget library
#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <freertos/FreeRTOS.h>
#include <freertos/task.h>

#include "bmp.h"
#include "Tabs.h"
#include "Desk/TabWind.h"
#include "Desk/Ultimeter.h"
#include "Desk/WindTimer.h"
#include "Report.h"
#include "Buzzer.h"
#include "Clock.h"

#define LINE_H 25
#define LINE_START TAB_H + 10
#define BUFFER_H 12
#define COL1 10
#define COL1B COL1 + 130
#define COL2 COL1 + 480 / 2
#define COL2B COL2 + 130

/**
 * @brief Construct a new Tab Wind object.
 *
 * Represents local wind/weather or desk dashboard.
 * @param tft Display driver
 */
TabWind::TabWind(TFT_eSPI *tft) : Tab()
{
    name = "Wind";
    _tft = tft;
    nameWidth = _tft->textWidth(name.c_str());
    changed = true;
}

/**
 * @brief Draws the Wind tab interface.
 *
 * Displays wind speed, direction, etc.
 */
void TabWind::draw()
{
    changed = false;
    _tft->fillRect(0, TAB_H - CORNER_RADIUS, _tft->width(), _tft->height() - TAB_H + CORNER_RADIUS, bgColor);

    _tft->setTextColor(TFT_BLUE);
    _tft->setFreeFont(&FreeSerif18pt7b);
    _tft->setCursor(COL1 + 30, LINE_START);
    _tft->print("Ultimeter");

    _tft->setFreeFont(&FreeSerif12pt7b);
    _tft->setTextColor(TFT_BLACK);
    _tft->setCursor(COL1, LINE_START + LINE_H + BUFFER_H);
    _tft->print("    Speed:");
    _tft->setCursor(COL1, LINE_START + 2 * LINE_H + BUFFER_H);
    _tft->print("Direction:");
    _tft->setCursor(COL1, LINE_START + 3 * LINE_H + BUFFER_H);
    _tft->print("    Count:");
    for (int i = 1; i < 3; i++)
    {
        _tft->fillCircle(50 + COL1 + 20 * i, LINE_START + 4 * LINE_H + BUFFER_H, 8, TFT_LIGHTGREY); //!< ultimeter
        _tft->fillCircle(50 + COL2 + 20 * i, LINE_START + 4 * LINE_H + BUFFER_H, 8, TFT_LIGHTGREY); //!< davis
    }

    _tft->setTextColor(TFT_BLUE);
    _tft->setFreeFont(&FreeSerif18pt7b);
    _tft->setCursor(COL2 + 40, LINE_START);
    _tft->print("Davis");

    _tft->setFreeFont(&FreeSerif12pt7b);
    _tft->setTextColor(TFT_BLACK);
    _tft->setCursor(COL2, LINE_START + LINE_H + BUFFER_H);
    _tft->print("    Speed:");
    _tft->setCursor(COL2, LINE_START + 2 * LINE_H + BUFFER_H);
    _tft->print("Direction:");
    _tft->setCursor(COL2, LINE_START + 3 * LINE_H + BUFFER_H);
    _tft->print("    Count:");

    _tft->setCursor(COL1, LINE_START + 6 * LINE_H + BUFFER_H);
    _tft->print("Last Sent:");
    _tft->setCursor(COL1, LINE_START + 7 * LINE_H + BUFFER_H);
    _tft->print("     Hour:");
    _tft->setCursor(COL1, LINE_START + 8 * LINE_H + BUFFER_H);
    _tft->print("     Tick:");
}

/**
 * @brief Handle touch input on the Wind tab.
 *
 * @param x Touch X coordinate.
 * @param y Touch Y coordinate.
 * @param lastClick Milliseconds since the previous touch event.
 */
void TabWind::handle(uint16_t x, uint16_t y, uint32_t lastClick)
{
    if (lastClick > 500)
    {
        //! buttons are on left
        if (y > 0 && y < 480)
        {
            quickBeep();
        }
        else
            Report.printf("Nothing x: %d y: %d\n", x, y);
    }
}

/**
 * @brief Periodic update loop; reads Ultimeter data and sends 15-second aggregated reports.
 */
void TabWind::loop()
{
    uint8_t state = 0;
    static bool sp = false, dr = false;

    //! Check Ultimeter state and update UI if state changed
    if (ultimeter->state(state))
    {
        if (sp && (state & 0x02) == 0)
            _tft->fillCircle(50 + COL1 + 20, LINE_START + 4 * LINE_H + BUFFER_H, 8, TFT_LIGHTGREY);
        if (!sp && (state & 0x02) == 2)
            _tft->fillCircle(50 + COL1 + 20, LINE_START + 4 * LINE_H + BUFFER_H, 8, TFT_BLUE);

        if (dr && (state & 0x01) == 0)
            _tft->fillCircle(50 + COL1 + 40, LINE_START + 4 * LINE_H + BUFFER_H, 8, TFT_LIGHTGREY);
        if (!dr && (state & 0x01) == 1)
            _tft->fillCircle(50 + COL1 + 40, LINE_START + 4 * LINE_H + BUFFER_H, 8, TFT_BLUE);

        sp = (state & 0x02) != 0;
        dr = (state & 0x01) != 0;
    }

    static int64_t last = millis();
    float s = 0;
    uint16_t d, c;
    if (millis() - last > 1000)
    {
        last = millis();
        ultimeter->get(s, d, c);
        if (c > 0)
        {
            writeVariable("Speed", String(s));
            writeVariable("Direction", String(d));
            writeVariable("Count", String(c));

            _tft->fillRect(COL1B, LINE_START + LINE_H - 4, 100, 3 * LINE_H, bgColor);
            _tft->setCursor(COL1B, LINE_START + LINE_H + BUFFER_H);
            _tft->printf("%2.1f", s);
            _tft->setCursor(COL1B, LINE_START + 2 * LINE_H + BUFFER_H);
            _tft->printf("%d", d);
            _tft->setCursor(COL1B, LINE_START + 3 * LINE_H + BUFFER_H);
            _tft->printf("%d", c);
        }
    }

    static uint64_t lastHr = 0;
    static uint64_t lastTick = 0;
    static uint64_t lastMillis = 0;
    if (lastMillis == 0)
    {
        lastMillis = 1000 * (15 - (getEpoch() % 15));
        printf("tabWind lastMillis: %ld\n", lastMillis);
    }
    if (lastMillis + 15000 < millis())
    {
        //! get data and reset counter
        ultimeter->get(s, d, c, true);
        lastMillis += 15000;
        time_t now = getEpoch();
        uint64_t hr = now / 3600L;
        uint64_t tick = (now - hr * 3600L) / 15L;
        if (hr != lastHr || tick != lastTick)
        {
            lastHr = hr;
            lastTick = tick;

            _tft->setTextColor(TFT_BLACK);
            _tft->fillRect(COL1B, LINE_START + 6 * LINE_H - 5, _tft->width() - COL1B, 3 * LINE_H + 10, bgColor);

            _tft->setCursor(COL1B, LINE_START + 7 * LINE_H + BUFFER_H);
            _tft->printf("%lld", hr);
            _tft->setCursor(COL1B, LINE_START + 8 * LINE_H + BUFFER_H);
            _tft->printf("%lld", tick);

            time_t eTime = hr * 3600 + tick * 15;
            struct tm *timeInfo;
            char buffer[30];
            timeInfo = localtime(&eTime);
            strftime(buffer, sizeof(buffer), "%Y-%m-%d %H:%M:%S", timeInfo);

            _tft->setCursor(COL1B, LINE_START + 6 * LINE_H + BUFFER_H);
            _tft->printf("%s", buffer);
        }
    }
}

#endif
