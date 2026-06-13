#ifdef COFFEE

/**
 * @file TabShot.cpp
 * @brief Shot schedule UI implementation.
 *
 * Handles only display and touch interaction.
 * All schedule logic (persistence, tracking, beeping) is in Shot.
 */

#include "Tabs.h"
#include "Coffee/TabShot.h"
#include "Coffee/Shot.h"
#include "Report.h"
#include "Buzzer.h"
#include "Clock.h"

#define LINE_H 25
#define LINE_START TAB_H + 70

#define BAR_W 400

// Layout Constants
// ----------------------------------------------------------------------------
// Adjusters Area (Top)
// Screen width = 480, divided into 3 equal 160-px zones centred at 80/240/400.
// Each group is [box(36) + gap(8) + arrow(24)] = 68 px wide; box_x = zone_centre - 34.
#define ADJ_X 46                  // First adjuster box X  (80 - 34)
#define ADJ_Y_START (TAB_H + 60)  // Y of box top; label sits 4 px above (BC_DATUM)
#define ADJ_X_GAP 160             // Zone width (480 / 3)
#define ADJ_W 36                  // Width of the value display box
#define ADJ_H 36                  // Height of the value display box

// Slider Area (Middle)
#define SLIDER_Y_START (ADJ_Y_START + 100)  // Y position for the progress bar
#define SLIDER_TEXT_Y (SLIDER_Y_START + 55) // Y position for labels below slider

/**
 * @brief Construct the GLP shot tab UI.
 *
 * @param tft Pointer to the TFT display driver.
 */
TabShot::TabShot(TFT_eSPI *tft) : Tab()
{
    name = "GLP";
    _tft = tft;
    nameWidth = _tft->textWidth(name.c_str());
    _knob = new TFT_eSprite(tft);
    _s1 = new Slider(tft, _knob);
    changed = true;
    _next = 0; //!< 0 triggers a full redraw on first loop()
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

    //! force a redraw of bar and text on next loop()
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
    static uint64_t lastTouch = millis();
    static int16_t lastX = -1, lastY = -1;
    uint16_t x, y;

    while (_tft->getTouch(&x, &y))
    {
        lastX = x;
        lastY = y;
        if (millis() - lastTouch > 200 && lastX >= 10 && lastX <= _tft->width() - 20)
        {
            _next = SHOT_WINDOW_SEC * (lastX - 10) / (_tft->width() - 20) + getEpoch();
            _lastW = lastX - 10;
            redrawBar(_lastW);
            _lastM = ((_next - getEpoch()) % 3600) / 60;
            drawAdjusters();
            drawAdjusters();
        }
    }
    if (lastX != -1 && lastY != -1)
    {
        Report.printf("Drag release detected at (%d, %d)\n", lastX, lastY);
        if (lastX >= 10 && lastX <= _tft->width() - 20)
        {
            time_t t = (SHOT_WINDOW_SEC * (lastX - 10)) / (_tft->width() - 20) + getEpoch();
            shot->setNext(t);
            _next = shot->getNext();
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
    // 1. Check top adjusters first
    checkAdjusters(x, y);

    // 2. Check slider area
    if (y > SLIDER_Y_START - 10 && y < _buttonY - 5)
    {
        quickBeep();
        detectDrag();
    }
    // 3. Check reset button area
    else if (y > _buttonY && y < _buttonY + _buttonHeight && x > _buttonX && x < _buttonX + _buttonWidth)
    {
        quickBeep();
        shot->reset();
        _next = shot->getNext();
        draw();
    }
    else
        Report.printf("Nothing x: %d y: %d\n", x, y);
}

/**
 * @brief Draws the progress bar background and fill.
 * @param w Width of the filled portion (pixels)
 */
void TabShot::redrawBar(int16_t w)
{
    _tft->fillRect(9, SLIDER_Y_START - 1, _tft->width() - 18, 27, bgColor);
    _tft->drawRect(9, SLIDER_Y_START - 1, _tft->width() - 18, 27, TFT_BLACK);
    _tft->fillRect(10, SLIDER_Y_START, w >= 0 ? w : -w, 25, w >= 0 ? TFT_BLUE : TFT_RED);
}

/**
 * @brief Incrementally updates the bar width to avoid full redraws.
 *
 * @param lastWidth Previous fill width in pixels.
 * @param newWidth New fill width in pixels.
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
 * Syncs display cache from shot, updates the progress bar and minute counter.
 */
void TabShot::loop()
{
    if (getEpoch() < EPOCH_VALID_THRESHOLD)
        return;

    int16_t w = ((_tft->width() - 20) * (shot->getNext() - getEpoch())) / SHOT_WINDOW_SEC;

    if (_next == 0)
    {
        _next = shot->getNext();
        w = ((_tft->width() - 20) * (_next - getEpoch())) / SHOT_WINDOW_SEC;
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
    if (_lastM != ((shot->getNext() - getEpoch()) % 3600) / 60)
    {
        _lastM = ((shot->getNext() - getEpoch()) % 3600) / 60;
        _next = shot->getNext(); //!< keep display cache in sync
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
    time_t next = shot->getNext();
    _tft->fillRect(40, SLIDER_Y_START - 25, _tft->width() - 40, 20, bgColor);
    _tft->setFreeFont(&FreeSans9pt7b);
    _tft->setTextDatum(TL_DATUM);

    if (next == 0)
    {
        _tft->drawString("Not scheduled", 40, SLIDER_Y_START - 25);
        return;
    }

    struct tm timeInfo;
    char str[64];
    localtime_r(&next, &timeInfo);
    strftime(str, 64, "%A, %m/%d/%y at %H:%M", &timeInfo);
    _tft->drawString(str, 40, SLIDER_Y_START - 25);
}

/**
 * @brief Draws the adjustment buttons (Day, Hour, Min).
 * Shows current remaining time and +/- controls.
 * Text turns red when the shot is overdue.
 */
void TabShot::drawAdjusters()
{
    time_t next = shot->getNext();
    // Clear: "Next shot" text row + label row + box+arrow row
    _tft->fillRect(0, ADJ_Y_START - 40, _tft->width(), ADJ_H + 50, bgColor);

    _tft->setFreeFont(&FreeSerif12pt7b);
    _tft->setTextDatum(TL_DATUM);

    String t = "Next shot ";
    t += ((next >= getEpoch()) ? "in " : "is late by ");
    if (shot->isOverdue())
        _tft->setTextColor(TFT_RED);

    _tft->drawString(t, 80, ADJ_Y_START - 38);
    _tft->setTextColor(TFT_BLACK);

    uint8_t days = abs(next - getEpoch()) / 86400;
    uint8_t hours = (abs(next - getEpoch()) % 86400) / 3600;
    uint8_t minutes = (abs(next - getEpoch()) % 3600) / 60;

    drawAdjuster(ADJ_X,                  ADJ_Y_START, "Day",  days);
    drawAdjuster(ADJ_X + ADJ_X_GAP,     ADJ_Y_START, "Hour", hours);
    drawAdjuster(ADJ_X + 2 * ADJ_X_GAP, ADJ_Y_START, "Min",  minutes);
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
    _tft->setFreeFont(&FreeSans9pt7b);
    _tft->setTextColor(TFT_BLACK);

    // Label centred above the box (bottom of text sits 4 px above box top)
    _tft->setTextDatum(BC_DATUM);
    _tft->drawString(label, x + ADJ_W / 2, y - 4);

    // Value box
    _tft->fillRect(x, y, ADJ_W, ADJ_H, TFT_WHITE);
    _tft->drawRect(x, y, ADJ_W, ADJ_H, TFT_BLACK);
    _tft->setTextDatum(MC_DATUM);
    _tft->drawString(String(val), x + ADJ_W / 2, y + ADJ_H / 2);

    // Arrows to the right — scaled to the smaller box
    // arrX is the horizontal centre of the arrow column (8 px gap after box + 12 px half-width)
    int arrX = x + ADJ_W + 20;
    int mid  = y + ADJ_H / 2;

    _tft->fillTriangle(arrX, mid - 18, arrX - 12, mid - 4,  arrX + 12, mid - 4,  TFT_BLUE); // up
    _tft->fillTriangle(arrX, mid + 18, arrX - 12, mid + 4,  arrX + 12, mid + 4,  TFT_BLUE); // down

    _tft->setTextDatum(TL_DATUM);
}

/**
 * @brief Checks for touch events on the adjustment buttons.
 *
 * @param px Touch X coordinate.
 * @param py Touch Y coordinate.
 */
void TabShot::checkAdjusters(uint16_t px, uint16_t py)
{
    if (py < ADJ_Y_START - 10 || py > ADJ_Y_START + ADJ_H + 10)
        return;

    long delta = 0;

    auto checkArrows = [&](int baseX) -> int
    {
        int arrowCenter = baseX + ADJ_W + 20;
        if (px >= (uint16_t)(arrowCenter - 20) && px <= (uint16_t)(arrowCenter + 20))
        {
            if (py < ADJ_Y_START + ADJ_H / 2)
                return 1;
            else
                return -1;
        }
        return 0;
    };

    int dir = 0;

    dir = checkArrows(ADJ_X);
    if (dir != 0)
        delta = dir * 86400;

    dir = checkArrows(ADJ_X + ADJ_X_GAP);
    if (dir != 0)
        delta = dir * 3600;

    dir = checkArrows(ADJ_X + 2 * ADJ_X_GAP);
    if (dir != 0)
        delta = dir * 60;

    if (delta != 0)
    {
        quickBeep();
        shot->adjust(delta);
        _next = shot->getNext();
        drawAdjusters();
        drawTime();
        _lastW = ((_tft->width() - 20) * (_next - getEpoch())) / SHOT_WINDOW_SEC;
        redrawBar(_lastW);
    }
}

#endif
