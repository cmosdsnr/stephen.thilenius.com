/**
 * @file TabCoffee.cpp
 * @brief Coffee control tab implementation.
 */

#ifdef COFFEE
#include <TFT_eWidget.h> //!< Widget library
#include "bmp.h"
#include "Tabs.h"
#include "Coffee/TabCoffee.h"
#include "Coffee/Relays.h"
#include "Report.h"
#include "Buzzer.h"
#include "Slider.h"

#define LINEH 36
#define TIME_LIGHTS 180 //!< seconds
#define SEVEN_CUPS 20   //!< seconds

#define lineWidth 5

#define BUTTON_WIDTH 110
#define BUTTON_HEIGHT 82
#define BMP_WIDTH 64
#define BMP_HEIGHT 64
#define INDENT 10
#define ICON_SPACING (480 - 3 * BUTTON_WIDTH - 2 * INDENT) / 2
#define BUTTON_Y TAB_H + 10
#define IMAGE_X_OFFSET (BUTTON_WIDTH - BMP_WIDTH) / 2
#define IMAGE_Y_OFFSET (BUTTON_HEIGHT - BMP_HEIGHT) / 2

#define LIGHT_X INDENT
#define FILL_X LIGHT_X + ICON_SPACING + BUTTON_WIDTH
#define LOCK_X FILL_X + ICON_SPACING + BUTTON_WIDTH

#define BUTTON_ON_COLOR 0x421a //!< BLUE
#define BUTTON_OFF_COLOR TFT_LIGHTGREY
#define RADIUS 7

#define lockColor 0x5ae4

/**
 * @brief Construct a new Tab Coffee object.
 *
 * @param tft Display driver
 */
TabCoffee::TabCoffee(TFT_eSPI *tft) : Tab()
{
    name = "Coffee";
    _tft = tft;
    nameWidth = _tft->textWidth(name.c_str());
    changed = true;
}

/**
 * @brief Draws the Coffee tab interface.
 *
 * Logic includes drawing buttons for coffee machine control.
 */
void TabCoffee::draw()
{
    changed = false;
    _tft->fillRect(0, TAB_H - CORNER_RADIUS, _tft->width(), _tft->height() - TAB_H + CORNER_RADIUS, bgColor);

    if (relays->AreLightsOn())
    {

        _tft->fillRoundRect(LIGHT_X, BUTTON_Y, BUTTON_WIDTH, BUTTON_HEIGHT, RADIUS, BUTTON_ON_COLOR);
        _tft->drawXBitmap(LIGHT_X + IMAGE_X_OFFSET, BUTTON_Y + IMAGE_Y_OFFSET, light_on_bits, LIGHT_WIDTH, LIGHT_HEIGHT, TFT_YELLOW);
    }
    else
    {
        _tft->fillRoundRect(LIGHT_X, BUTTON_Y, BUTTON_WIDTH, BUTTON_HEIGHT, RADIUS, BUTTON_OFF_COLOR);
        _tft->drawXBitmap(LIGHT_X + IMAGE_X_OFFSET, BUTTON_Y + IMAGE_Y_OFFSET, light_off_bits, LIGHT_WIDTH, LIGHT_HEIGHT, TFT_WHITE);
    }

    if (relays->IsFillOn())
    {

        _tft->fillRoundRect(FILL_X, BUTTON_Y, BUTTON_WIDTH, BUTTON_HEIGHT, RADIUS, BUTTON_ON_COLOR);
        _tft->drawXBitmap(FILL_X + IMAGE_X_OFFSET, BUTTON_Y + IMAGE_Y_OFFSET, water_bits, WATER_WIDTH, WATER_HEIGHT, TFT_YELLOW);
    }
    else
    {
        _tft->fillRoundRect(FILL_X, BUTTON_Y, BUTTON_WIDTH, BUTTON_HEIGHT, RADIUS, BUTTON_OFF_COLOR);
        _tft->drawXBitmap(FILL_X + IMAGE_X_OFFSET, BUTTON_Y + IMAGE_Y_OFFSET, water_bits, WATER_WIDTH, WATER_HEIGHT, TFT_WHITE);
    }

    if (relays->IsLockOn())
    {

        _tft->fillRoundRect(LOCK_X, BUTTON_Y, BUTTON_WIDTH, BUTTON_HEIGHT, RADIUS, BUTTON_ON_COLOR);
        _tft->drawXBitmap(LOCK_X + IMAGE_X_OFFSET, BUTTON_Y + IMAGE_Y_OFFSET, lock_bits, LOCK_WIDTH, LOCK_HEIGHT, TFT_YELLOW);
    }
    else
    {
        _tft->fillRoundRect(LOCK_X, BUTTON_Y, BUTTON_WIDTH, BUTTON_HEIGHT, RADIUS, BUTTON_OFF_COLOR);
        _tft->drawXBitmap(LOCK_X + IMAGE_X_OFFSET, BUTTON_Y + IMAGE_Y_OFFSET, lock_bits, LOCK_WIDTH, LOCK_HEIGHT, TFT_WHITE);
    }
}

/**
 * @brief Handle touch input on the Coffee tab.
 *
 * Detects which button (lights, fill, or lock) was pressed based on
 * touch coordinates and toggles the corresponding relay.
 *
 * @param x Touch x coordinate.
 * @param y Touch y coordinate.
 * @param lastClick Milliseconds since the last touch event.
 */
void TabCoffee::handle(uint16_t x, uint16_t y, uint32_t lastClick)
{
    if (lastClick > 500)
    {
        //! buttons are on left
        if (y > BUTTON_Y && y < BUTTON_Y + BUTTON_HEIGHT)
        {
            quickBeep();
            if (x < FILL_X - ICON_SPACING / 2)
            {
                relays->LightsToggle();
                draw();
            }
            else if (x < LOCK_X - ICON_SPACING / 2)
            {
                relays->FillToggle();
                draw();
            }
            else
            {
                relays->LockToggle();
                draw();
            }
        }
        else
            Report.printf("Nothing x: %d y: %d\n", x, y);
    }
}
static uint8_t lastPct = 101;

/**
 * @brief Per-loop updates for the Coffee tab.
 *
 * Runs relay housekeeping, redraws the UI when state changes, and
 * updates the fill-level progress bar on screen.
 */
void TabCoffee::loop()
{
    relays->loop();
    if (changed)
        draw();
    uint8_t pct = relays->getPercentFill();
    if (pct != lastPct)
    {
        printf("Percent fill: %d\n", pct);
        lastPct = pct;
        _tft->fillRect(FILL_X + 10, BUTTON_Y + BUTTON_HEIGHT + 10, BUTTON_WIDTH - 20, _tft->height() - 10, bgColor);
        if (pct > 0)
            _tft->fillRect(
                FILL_X + 10,
                (BUTTON_Y + BUTTON_HEIGHT + 10) + pct * (_tft->height() - 10 - (BUTTON_Y + BUTTON_HEIGHT + 10)),
                BUTTON_WIDTH - 20,
                _tft->height() - 10,
                TFT_BLUE);
    }
}
#endif
