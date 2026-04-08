/**
 * @file TabGarage.cpp
 * @brief Garage tab implementation.
 */

#ifdef GARAGE
#include "Garage/TabGarage.h"
#include "Tabs.h"
#include "Buzzer.h"
#include "Report.h"
#include "Bmp.h"
#include "Garage/Relays.h"
#include "Garage/Distance.h"
#include "Garage/Door.h"

#define lineWidth 5
#define ICON_SPACING 10
#define BUTTON_WIDTH 110
#define BUTTON_HEIGHT 82
#define LIGHT_X 10
#define LIGHT_Y TAB_H + ICON_SPACING
#define POWER_X LIGHT_X
#define POWER_Y LIGHT_Y + 140

#define DOOR_X 200
#define DOOR_Y POWER_Y
#define DOOR_I_X DOOR_X + ((BUTTON_WIDTH - 64) / 2)
#define DOOR_I_Y POWER_Y + ((BUTTON_HEIGHT - 64) / 2)

#define LOCK_X BUTTON_WIDTH + 30

#define IMAGE_X LIGHT_X + ((BUTTON_WIDTH - 64) / 2)
#define IMAGE_LIGHT_Y LIGHT_Y + ((BUTTON_HEIGHT - 64) / 2)
#define IMAGE_POWER_Y POWER_Y + ((BUTTON_HEIGHT - 64) / 2)

#define BAR_X 4
#define BAR_H 17
#define BAR_Y LIGHT_Y + BUTTON_HEIGHT + 20
#define RADIUS 7

#define BUTTON_ON_COLOR 0x421a //!< BLUE
#define BUTTON_OFF_COLOR TFT_LIGHTGREY

/**
 * @brief Construct a new Tab Garage object.
 *
 * @param tft Display driver
 */
TabGarage::TabGarage(TFT_eSPI *tft) : Tab()
{
    name = "Garage";
    _tft = tft;
    nameWidth = _tft->textWidth(name.c_str());
    changed = true;
    bar_w = _tft->width() - 8;
}

/**
 * @brief Main loop for Garage Tab.
 *
 * Updates UI if tab is active.
 */
void TabGarage::loop()
{
    if (changed)
        draw();

    if ((millis() - lastUpdate) > 500)
    {
        lastUpdate = millis();
        if (!relays->AreLightsForced() && relays->AreLightsOn())
        {
            uint16_t thisRemaining = relays->GetRemainingPct(bar_w);

            if (thisRemaining > lastRemaining)
            {
                _tft->fillRoundRect(BAR_X + 1, BAR_Y + 1, bar_w - 2, BAR_H - 2, RADIUS, bgColor);
                _tft->fillRoundRect(BAR_X + 1, BAR_Y + 1, thisRemaining, BAR_H - 2, RADIUS, TFT_BLUE);
                lastRemaining = thisRemaining;
            }
            while (thisRemaining != lastRemaining)
            {
                _tft->drawXBitmap(lastRemaining - 3, BAR_Y + 1, arc_bits, 8, 15, bgColor);
                lastRemaining--;
            }
        }
        distance = getDistance();
        if (distance != lastDistance)
        {
            lastDistance = distance;
            _tft->fillRect(_tft->width() - 80, TAB_H + 50, 80, 30, bgColor);
            _tft->setTextColor(TFT_BLACK);
            _tft->drawNumber(distance, _tft->width() - 80, TAB_H + 60, 1);
            if (distance > 300)
                doorIsOpen = false;
            else
                doorIsOpen = true;
            if (doorIsOpen != lastDoor)
            {
                lastDoor = doorIsOpen;
                if (doorIsOpen)
                {
                    _tft->fillRoundRect(DOOR_X, DOOR_Y, BUTTON_WIDTH, BUTTON_HEIGHT, RADIUS, BUTTON_ON_COLOR);
                    _tft->drawXBitmap(DOOR_I_X, DOOR_I_Y, door_open_bits, DOOR_WIDTH, DOOR_HEIGHT, TFT_WHITE);
                }
                else
                {
                    _tft->fillRoundRect(DOOR_X, DOOR_Y, BUTTON_WIDTH, BUTTON_HEIGHT, RADIUS, BUTTON_OFF_COLOR);
                    _tft->drawXBitmap(DOOR_I_X, DOOR_I_Y, door_closed_bits, DOOR_WIDTH, DOOR_HEIGHT, TFT_YELLOW);
                }
            }
        }
    }
    motion = relays->GetMotionPin();
    if (motion != lastMotion)
    {
        lastMotion = motion;
        if (lastMotion)
            _tft->fillCircle(_tft->width() - 20, TAB_H + 20, 10, TFT_RED);
        else
            _tft->fillCircle(_tft->width() - 20, TAB_H + 20, 10, TFT_BLACK);
    }
}

/**
 * @brief Draw the full garage UI screen.
 *
 * Renders light and power buttons, lock icons, the motion-timeout
 * progress bar, and the door open/closed indicator.
 */
void TabGarage::draw()
{
    changed = false;
    _tft->fillRect(0, TAB_H - CORNER_RADIUS, _tft->width(), _tft->height() - TAB_H + CORNER_RADIUS, bgColor);

    if (relays->AreLightsOn())
    {

        _tft->fillRoundRect(LIGHT_X, LIGHT_Y, BUTTON_WIDTH, BUTTON_HEIGHT, RADIUS, BUTTON_ON_COLOR);
        _tft->drawXBitmap(IMAGE_X, IMAGE_LIGHT_Y, light_on_bits, LIGHT_WIDTH, LIGHT_HEIGHT, TFT_YELLOW);
    }
    else
    {
        _tft->fillRoundRect(LIGHT_X, LIGHT_Y, BUTTON_WIDTH, BUTTON_HEIGHT, RADIUS, BUTTON_OFF_COLOR);
        _tft->drawXBitmap(IMAGE_X, IMAGE_LIGHT_Y, light_off_bits, LIGHT_WIDTH, LIGHT_HEIGHT, TFT_WHITE);
    }

    _tft->drawRoundRect(BAR_X, BAR_Y, bar_w, BAR_H, RADIUS, TFT_BLACK);
    _tft->fillRoundRect(BAR_X + 1, BAR_Y + 1, bar_w - 2, BAR_H - 2, RADIUS, bgColor);
    if (relays->AreLightsForced())
    {
        _tft->drawXBitmap(LOCK_X, LIGHT_Y, lock_bits, LOCK_WIDTH, LOCK_HEIGHT, TFT_BLACK);
    }
    else
    {
        _tft->drawXBitmap(LOCK_X, LIGHT_Y, unlock_bits, UNLOCK_WIDTH, UNLOCK_HEIGHT, TFT_LIGHTGREY);
        _tft->fillRoundRect(BAR_X + 1, BAR_Y + 1, relays->GetRemainingPct(bar_w), BAR_H - 2, RADIUS, TFT_BLUE);
        lastRemaining = relays->GetRemainingPct(bar_w);
    }

    if (relays->IsPowerOn())
    {
        _tft->fillRoundRect(POWER_X, POWER_Y, BUTTON_WIDTH, BUTTON_HEIGHT, RADIUS, BUTTON_ON_COLOR);
        _tft->drawXBitmap(IMAGE_X, IMAGE_POWER_Y, power_bits, POWER_WIDTH, POWER_HEIGHT, TFT_YELLOW);
    }
    else
    {
        _tft->fillRoundRect(POWER_X, POWER_Y, BUTTON_WIDTH, BUTTON_HEIGHT, RADIUS, BUTTON_OFF_COLOR);
        _tft->drawXBitmap(IMAGE_X, IMAGE_POWER_Y, power_bits, POWER_WIDTH, POWER_HEIGHT, TFT_WHITE);
    }
    if (relays->IsPowerForced())
        _tft->drawXBitmap(LOCK_X, POWER_Y, lock_bits, LOCK_WIDTH, LOCK_HEIGHT, TFT_BLACK);
    else
        _tft->drawXBitmap(LOCK_X, POWER_Y, unlock_bits, UNLOCK_WIDTH, UNLOCK_HEIGHT, TFT_LIGHTGREY);
    if (distance > 300)
    {
        _tft->fillRoundRect(DOOR_X, DOOR_Y, BUTTON_WIDTH, BUTTON_HEIGHT, RADIUS, BUTTON_OFF_COLOR);
        _tft->drawXBitmap(DOOR_I_X, DOOR_I_Y, door_closed_bits, DOOR_WIDTH, DOOR_HEIGHT, TFT_WHITE);
    }
    else
    {
        _tft->fillRoundRect(DOOR_X, DOOR_Y, BUTTON_WIDTH, BUTTON_HEIGHT, RADIUS, BUTTON_ON_COLOR);
        _tft->drawXBitmap(DOOR_I_X, DOOR_I_Y, door_open_bits, DOOR_WIDTH, DOOR_HEIGHT, TFT_YELLOW);
    }
}

/**
 * @brief Handle a touch event on the garage tab.
 *
 * Maps the touch coordinates to light, power, lock, and door
 * buttons and triggers the corresponding action.
 *
 * @param x Touch x coordinate.
 * @param y Touch y coordinate.
 * @param lastClick Milliseconds since the previous touch (debounce).
 */
void TabGarage::handle(uint16_t x, uint16_t y, uint32_t lastClick)
{
    //! screen has been tapped at (x,y)

    if (lastClick > 500)
    {
        //! lights
        if (x > LIGHT_X && x < LIGHT_X + BUTTON_WIDTH && y > LIGHT_Y && y < LIGHT_Y + BUTTON_HEIGHT)
        {
            quickBeep();
            relays->LightsToggle();
            draw();
        }
        if (x > POWER_X && x < POWER_X + BUTTON_WIDTH && y > POWER_Y && y < POWER_Y + BUTTON_HEIGHT)
        {
            quickBeep();
            relays->PowerToggle();
            draw();
        }
        if (x > 300 + LIGHT_X && x < 300 + LIGHT_X + BUTTON_WIDTH && y > LIGHT_Y && y < LIGHT_Y + BUTTON_HEIGHT)
        {
            quickBeep();
            relays->ToggleForceLights();
            draw();
        }
        if (x > 300 + POWER_X && x < 300 + POWER_X + BUTTON_WIDTH && y > POWER_Y && y < POWER_Y + BUTTON_HEIGHT)
        {
            quickBeep();
            relays->ToggleForcePower();
            draw();
        }
        if (x > DOOR_X && x < DOOR_X + BUTTON_WIDTH && y > DOOR_Y && y < DOOR_Y + BUTTON_HEIGHT)
        {
            quickBeep();
            door->Press();
        }
    }
}
#endif
