/**
 * @file TabPowerMeter.cpp
 * @brief Power meter tab implementation.
 */

#ifdef POWERMETER
#include <TFT_eWidget.h> //!< Widget library
#include "bmp.h"
#include "Tabs.h"
#include "Power/TabPowerMeter.h"
#include "Report.h"
#include "Buzzer.h"
#include "Slider.h"
#include "devkit_pins.h"

/**
 * @brief Construct a new Tab Power Meter object.
 *
 * @param tft Display driver
 */
TabPowerMeter::TabPowerMeter(TFT_eSPI *tft) : Tab()
{
    name = "Power Meter";
    bgColor = 0xd7ff;
    _tft = tft;
    nameWidth = _tft->textWidth(name.c_str());
    changed = true;
}

/**
 * @brief Draws the Power Meter tab.
 */
void TabPowerMeter::draw()
{
    changed = false;
    _tft->fillRect(0, TAB_H - CORNER_RADIUS, _tft->width(), _tft->height() - TAB_H + CORNER_RADIUS, bgColor);
}

/**
 * @brief Handles touch events on the Power Meter tab.
 */
void TabPowerMeter::handle(uint16_t x, uint16_t y, uint32_t lastClick)
{
    if (lastClick > 500)
    {

        Report.printf("Touch outside buttons x: %d y: %d\n", x, y);
    }
}

/**
 * @brief Loop handler for Power Meter tab.
 */
void TabPowerMeter::loop()
{
    if (changed)
        draw();
}
#endif
