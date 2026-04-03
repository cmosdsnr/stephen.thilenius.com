#ifdef DESK
#include "Tabs.h"
#include "Desk/TabShot.h"
#include "Desk/WindTimer.h"
#include "Desk/EpromData.h"
#include "Report.h"
#include "Buzzer.h"
#include "Clock.h"

#define LINE_H 25
#define LINE_START TAB_H + 70

#define BAR_W 400

// Layout Constants
// ----------------------------------------------------------------------------
// Adjusters Area (Top)
#define ADJ_X 60                 // Starting X position for first adjuster
#define ADJ_Y_START (TAB_H + 35) // Y position for adjusters row
#define ADJ_X_GAP 480 / 3        // Horizontal spacing between adjusters
#define ADJ_W 50                 // Width of the value display box
#define ADJ_H 30                 // Height of the value display box

// Slider Area (Middle)
#define SLIDER_Y_START (TAB_H + 110)        // Y position for the progress bar
#define SLIDER_TEXT_Y (SLIDER_Y_START + 55) // Y position for labels below slider

/**
 * @file TabShot.cpp
 * @brief Shot schedule UI implementation.
 * Performs time tracking for medical schedule, allowing adjustments and reset.
 */

TabShot::TabShot(TFT_eSPI *tft) : Tab()
{
    name = "GLP";
    bgColor = 0xdf7f;
    _tft = tft;
    nameWidth = _tft->textWidth(name.c_str());
    _knob = new TFT_eSprite(tft); //!< Sprite for the slide knob
    _s1 = new Slider(tft, _knob);
    changed = true;
    _next = getNextShot();
}

/**
 * @brief Calculate and draw the reset button at the bottom of the screen.
 * Centers the button horizontally and positions it just above the bottom edge.
 */
void TabShot::drawResetButton()
{
    uint16_t nameWidth = _tft->textWidth("Reset");
    _buttonX = (_tft->width() - nameWidth - 60) / 2;
    _buttonWidth = nameWidth + 60;
    _buttonHeight = 45;
    _buttonY = _tft->height() - _buttonHeight - 5; // 5px from bottom

    _tft->fillRoundRect(_buttonX, _buttonY, _buttonWidth, _buttonHeight, CORNER_RADIUS, TFT_BLUE);
    _tft->setTextColor(TFT_WHITE);
    _tft->setTextDatum(ML_DATUM);
    _tft->drawString("Reset", (_tft->width() - nameWidth) / 2, _buttonY + (_buttonHeight / 2));
    _tft->setTextColor(TFT_BLACK);
}

/**
 * @brief Main draw function.
 * Clears the screen, sets up fonts, and renders all UI components.
 */
void TabShot::draw()
{
    changed = false;
    _tft->setFreeFont(&FreeSerif12pt7b);
    _tft->fillRect(0, TAB_H - CORNER_RADIUS, _tft->width(), _tft->height() - TAB_H + CORNER_RADIUS, bgColor);

    //! force a redraw of bar and text
    _next = 0;
    drawResetButton();
}

/**
 * @brief Handles touch interactions for the progress bar slider.
 * Calculates the new target time based on the slider position.
 * The slider represents a 4-day (345600 seconds) window.
 */
void TabShot::detectDrag()
{
    static uint64_t lastTouch = millis();  //!< Store the last touch time
    static int16_t lastX = -1, lastY = -1; //!< Store the last touch coordinates
    uint16_t x, y;                         //!< Current touch coordinates

    while (_tft->getTouch(&x, &y)) //!< Check if the screen is being touched
    {
        lastX = x; //!< Update the last touch coordinates
        lastY = y;
        // Debounce and bounds check
        if (millis() - lastTouch > 200 && lastX >= 10 && lastX <= _tft->width() - 20)
        {
            // Calculate new time delta based on X position
            _next = 345600L * (lastX - 10) / (_tft->width() - 20) + getEpoch();
            _lastW = lastX - 10;
            redrawBar(_lastW);
            _lastM = ((_next - getEpoch()) % 3600) / 60;
            drawAdjusters();
            drawAdjusters();
        }
    }
    if (lastX != -1 && lastY != -1) //!< If the screen was touched
    {
        Report.printf("Drag release detected at (%d, %d)\n", lastX, lastY);
        if (lastX >= 10 && lastX <= _tft->width() - 20)
        {
            saveNextShot((345600L * (lastX - 10)) / (_tft->width() - 20) + getEpoch()); //!< writes new time to EEPROM
            _next = getNextShot();
            _lastW = lastX - 10;
            redrawBar(_lastW);
            _lastM = ((_next - getEpoch()) % 3600) / 60;
            drawAdjusters();
            drawAdjusters();
        }
    }
    else
    {
        Report.print("No touch detected");
    }
}

/**
 * @brief Main input handler.
 * Routes touch events to specific UI components (Adjusters, Slider, Reset Button).
 *
 * @param x Touch X coordinate
 * @param y Touch Y coordinate
 * @param lastClick Duration since last click (for debounce)
 */
void TabShot::handle(uint16_t x, uint16_t y, uint32_t lastClick)
{
    // if (lastClick > 100)
    // {
    // 1. Check top adjusters first
    checkAdjusters(x, y);

    // 2. Check slider area
    if (y > SLIDER_Y_START - 10 && y < SLIDER_Y_START + 40)
    {
        quickBeep();
        detectDrag();
    }
    // 3. Check reset button area
    else if (y > _buttonY && y < _buttonY + _buttonHeight && x > _buttonX && x < _buttonX + _buttonWidth)
    {

        quickBeep();
        saveNextShot(4 * 24 * 3600 + getEpoch()); //!< Reset to 4 days from now
        _next = getNextShot();
        draw();
    }
    else
        Report.printf("Nothing x: %d y: %d\n", x, y);
    // }
}

/**
 * @brief Draws the progress bar background and fill.
 * @param w Width of the filled portion (pixels)
 */
void TabShot::redrawBar(int16_t w)
{
    _tft->fillRect(9, SLIDER_Y_START - 1, _tft->width() - 18, 27, bgColor);
    _tft->drawRect(9, SLIDER_Y_START - 1, _tft->width() - 18, 27, TFT_BLACK);
    // Draw blue for positive time, red for negative
    _tft->fillRect(10, SLIDER_Y_START, w >= 0 ? w : -w, 25, w >= 0 ? TFT_BLUE : TFT_RED);
}

/**
 * @brief Incrementally updates the bar width to avoid full redraws.
 */
void TabShot::shortenBar(int16_t lastWidth, int16_t newWidth)
{
    if (newWidth >= 0)
        _tft->fillRect(10 + newWidth + 1, SLIDER_Y_START, lastWidth - newWidth, 25, bgColor);
    else
        _tft->fillRect(10 + lastWidth, SLIDER_Y_START, lastWidth - newWidth, 25, TFT_RED);
}

/**
 * @brief Background loop.
 * Updates the screen when the state changes or time passes.
 * Updates the progress bar position and minute counter.
 */
void TabShot::loop()
{
    if (getEpoch() < 100000)
        return;

    // Calculate current width based on remaining time
    // 345600L = 4 days in seconds
    int16_t w = ((_tft->width() - 20) * (_next - getEpoch())) / 345600L;

    if (_next == 0)
    {
        _next = getNextShot();
        w = ((_tft->width() - 20) * (_next - getEpoch())) / 345600L;
        _lastW = w;
        if (_lastW > 0)
        {
            redrawBar(w);
            _lastM = ((_next - getEpoch()) % 3600) / 60;
            drawAdjusters();
            return;
        }
    }

    //! happens every 12.5 min or so (4days/460)
    if (w != _lastW)
    {
        shortenBar(_lastW, w);
        _lastW = w;
    }

    //! every minute
    if (_lastM != ((_next - getEpoch()) % 3600) / 60)
    {
        _lastM = ((_next - getEpoch()) % 3600) / 60;
        drawAdjusters();
    }
    static uint64_t lastDate = 0;
    if (millis() - lastDate > 1000)
    {
        lastDate = millis();
        drawTime();
    }
}

/**
 * @brief Renders the target date/time text.
 */
void TabShot::drawTime()
{
    _tft->fillRect(40, SLIDER_Y_START - 25, _tft->width() - 40, 20, bgColor);
    _tft->setFreeFont(&FreeSans9pt7b);
    _tft->setTextDatum(TL_DATUM);

    struct tm timeInfo;
    char str[64];
    localtime_r(&_next, &timeInfo);
    strftime(str, 64, "%A, %m/%d/%y at %H:%M", &timeInfo);
    _tft->drawString(str, 40, SLIDER_Y_START - 25);
}

/**
 * @brief Draws the adjustment buttons (Day, Hour, Min).
 * Shows current remaining time and +/- controls.
 */
void TabShot::drawAdjusters()
{
    _tft->fillRect(70, ADJ_Y_START - 35, _tft->width() - 40, 2 * 18, bgColor);
    _tft->setFreeFont(&FreeSerif12pt7b);
    _tft->setTextDatum(TL_DATUM);

    String t = "Next shot ";
    t += ((_next >= getEpoch()) ? "in " : "is late by ");
    if (_next - getEpoch() < 0)
    {
        _tft->setTextColor(TFT_RED);
        quickBeep();
    }
    _tft->drawString(t, 80, ADJ_Y_START - 35);
    _tft->setTextColor(TFT_BLACK);

    uint8_t days = abs(_next - getEpoch()) / 86400;
    uint8_t hours = (abs(_next - getEpoch()) % 86400) / 3600;
    uint8_t minutes = (abs(_next - getEpoch()) % 3600) / 60;

    drawAdjuster(ADJ_X, ADJ_Y_START, "Day", days);
    drawAdjuster(ADJ_X + ADJ_X_GAP, ADJ_Y_START, "Hour", hours);
    drawAdjuster(ADJ_X + 2 * ADJ_X_GAP, ADJ_Y_START, "Min", minutes);
}

/**
 * @brief Helper to draw a single adjuster unit with arrows.
 * @param x X Coordinate
 * @param y Y Coordinate
 * @param label Text Label (Day/Hour/Min)
 * @param val Current value to display
 */
void TabShot::drawAdjuster(int16_t x, int16_t y, const char *label, int val)
{
    //! Label to the left
    _tft->setFreeFont(&FreeSans9pt7b);
    _tft->setTextColor(TFT_BLACK);
    _tft->setTextDatum(MR_DATUM);
    _tft->drawString(label, x - 10, y + 15);

    //! Value Box
    _tft->fillRect(x, y, ADJ_W, ADJ_H, TFT_WHITE);
    _tft->drawRect(x, y, ADJ_W, ADJ_H, TFT_BLACK);

    //! Value
    _tft->setFreeFont(&FreeSerif12pt7b);
    _tft->setTextDatum(MC_DATUM);
    _tft->drawString(String(val), x + ADJ_W / 2, y + 15);

    //! Arrows (Right Side)
    int arrX = x + ADJ_W + 15;

    //! Up Button (Top half)
    _tft->fillTriangle(arrX, y, arrX - 10, y + 12, arrX + 10, y + 12, TFT_BLUE);

    //! Down Button (Bottom half)
    _tft->fillTriangle(arrX, y + 30, arrX - 10, y + 18, arrX + 10, y + 18, TFT_BLUE);

    _tft->setTextDatum(TL_DATUM); //!< Reset datum
}

/**
 * @brief Checks for touch events on the adjustment buttons.
 * Adjusts the target time based on which button was pressed.
 */
void TabShot::checkAdjusters(uint16_t px, uint16_t py)
{
    uint16_t touchX = px;
    uint16_t touchY = py;

    //! Check if within the vertical band of the adjusters
    if (touchY < ADJ_Y_START - 10 || touchY > ADJ_Y_START + ADJ_H + 10)
        return;

    long delta = 0;

    //! Helper to check arrow area for a specific adjuster X position
    //! returns 1 (Up), -1 (Down), 0 (None)
    auto checkArrows = [&](int baseX) -> int
    {
        int arrowCenter = baseX + ADJ_W + 15;
        //! Accept touches nearby the arrow center
        if (touchX >= arrowCenter - 25 && touchX <= arrowCenter + 25)
        {
            if (touchY < ADJ_Y_START + ADJ_H / 2)
                return 1; //!< Up
            else
                return -1; //!< Down
        }
        return 0;
    };

    int dir = 0;

    //! Check Day
    dir = checkArrows(ADJ_X);
    if (dir != 0)
        delta = dir * 86400;

    //! Check Hour
    dir = checkArrows(ADJ_X + ADJ_X_GAP);
    if (dir != 0)
        delta = dir * 3600;

    //! Check Min
    dir = checkArrows(ADJ_X + 2 * ADJ_X_GAP);
    if (dir != 0)
        delta = dir * 60;

    if (delta != 0)
    {
        quickBeep();
        _next += delta;
        saveNextShot(_next);
        drawAdjusters();
        drawTime();
        _lastW = ((_tft->width() - 20) * (_next - getEpoch())) / 345600L;
        redrawBar(_lastW);
    }
}

#endif
