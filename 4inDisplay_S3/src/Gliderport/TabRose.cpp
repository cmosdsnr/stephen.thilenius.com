/**
 * @file TabRose.cpp
 * @brief Wind rose tab implementation.
 */

#ifdef GLIDERPORT
#include <Arduino.h>
#include "devkit_pins.h"
#include "Gliderport/TabRose.h"
#include "Gliderport/Gliderport.h"
//! Now can access lastWindReading directly
#include "Tabs.h"
#include "Report.h"
#include "Buzzer.h"

//! Define layout constants for the compass rose display
#define LINE_HEIGHT 20
#define RADIUS 90
#define CENTER_X 70 + RADIUS
#define CENTER_Y 320 - 40 - RADIUS

//! speed duty cycle is about 30% (high 30% of the time)

/**
 * @brief Construct a new Tab Rose object
 *
 * Initializes the tab with the name "Rose", sets the background color,
 * and initializes the TFT display pointer.
 *
 * @param tft Pointer to the TFT_eSPI object used for drawing.
 */
TabRose::TabRose(TFT_eSPI *tft) : Tab()
{
    name = "Rose";
    _tft = tft;
    nameWidth = _tft->textWidth(name.c_str());
    changed = true; //!< Mark as changed to trigger initial draw
}

/**
 * @brief periodic loop function for the tab
 *
 * Handles updating the display based on wind data freshness.
 * - Updates the arrow and speed display if data is fresh (< 1s old).
 * - Displays a "No signal" warning with elapsed time if data is stale (> 15s old).
 * - Clears the warning message if valid data returns.
 */
void TabRose::loop()
{
    static uint64_t last = millis();
    static uint16_t i = 0;

    //! Update logic runs once every second
    if (millis() - last > 1000)
    {
        last = millis();

        //! Check if we have received a wind reading recently (within the last second)
        //! if we've seen the value updated
        if (millis() - lastWindReading < 1000)
        {
            drawArrow();
            drawSpeed();
        }

        //! seen no ticks for 5s, set speed to 0
        if (millis() - lastWindReading > 5000 && speed != 0)
        {
            setSpeed(0); //!< Reset speed to 0
            drawSpeed();
            drawArrow(); //!< removes the arrow
        }

        //! Check for stale data (no reading for more than 15 seconds)
        if (millis() - lastWindReading > 30000)
        {
            validData = false;

            //! Draw "No signal" warning
            _tft->setTextColor(TFT_RED);
            _tft->drawString("No signal for:", 0.65 * _tft->width(), TAB_H + 155);

            _tft->drawRect(0.7 * _tft->width(), TAB_H + 170, 90, 30, TFT_BLACK);
            _tft->fillRect(0.7 * _tft->width() + 1, TAB_H + 171, 88, 28, bgColor);

            //! Format time elapsed string
            uint32_t t = (millis() - lastWindReading) / 1000;
            String s;
            if (t < 60)
                s = String(t) + " s";
            else if (t < 3600)
                s = ">" + String((int)(t / 60)) + " m";
            else if (t < 86400)
                s = ">" + String((int)(t / 3600)) + " h";
            else
                s = ">" + String((int)(t / 86400)) + " d";

            _tft->drawString(s, 0.7 * _tft->width() + 10, TAB_H + 185);
        }
        else if (validData == false)
        {
            //! Data has become valid again, clear the warning area
            _tft->fillRect(0.65 * _tft->width(), TAB_H + 155 - 12, 0.35 * _tft->width(), 120, bgColor);
        }
    }
}

/**
 * @brief Draws the full content of the Tab
 *
 * Draws the background, static labels, the compass rose circle,
 * directional ticks (E, ENE, etc.), and the initial arrow.
 * Used when switching to this tab or refreshing the whole screen.
 */
void TabRose::draw()
{
    changed = false;
    //! Clear the tab area
    _tft->fillRect(0, TAB_H - CORNER_RADIUS, _tft->width(), _tft->height() - TAB_H + CORNER_RADIUS, bgColor);

    //! Draw Speed labels
    _tft->setTextColor(TFT_BLACK);
    _tft->setTextSize(2);
    _tft->drawString("Speed:", 0.65 * _tft->width(), TAB_H + 20);
    _tft->setTextSize(1);
    _tft->drawString("(MPH)", 0.65 * _tft->width() + 40, TAB_H + 120);

    //! Draw main compass circle
    _tft->drawCircle(CENTER_X, CENTER_Y, RADIUS, TFT_BLACK);
    _tft->drawCircle(CENTER_X, CENTER_Y, RADIUS - 1, TFT_BLACK);

    //! Draw crosshairs (extended outside the circle)
    _tft->drawLine(CENTER_X, CENTER_Y - RADIUS - 15, CENTER_X, CENTER_Y + RADIUS + 15, TFT_BLACK);
    _tft->drawLine(CENTER_X - RADIUS - 15, CENTER_Y, CENTER_X + RADIUS + 15, CENTER_Y, TFT_BLACK);

    //! Draw compass points (16 directions)
    const char *dir[] = {"E", "ENE", "NE", "NNE", "N", "NNW", "NW", "WNW", "W", "WSW", "SW", "SSW", "S", "SSE", "SE", "ESE"};
    for (int i = 0; i < 16; i++)
    {
        //! Calculate position for tick marks
        float x = RADIUS * cos(2 * PI * i / 16);
        float y = -RADIUS * sin(2 * PI * i / 16);

        //! Determine tick length based on major/minor direction
        float ts = (i % 4 == 0 ? 15 : (i % 4 == 2 ? 10 : 5));
        ts = 1 + ts / RADIUS;

        //! Draw the tick mark
        _tft->drawLine(
            CENTER_X + x, CENTER_Y + y,
            CENTER_X + ts * x, CENTER_Y + ts * y, TFT_BLACK);
        //! Draw thickening line for bold effect
        _tft->drawLine(
            1 + CENTER_X + x, 1 + CENTER_Y + y,
            1 + CENTER_X + ts * x, 1 + CENTER_Y + ts * y, TFT_BLACK);

        //! Calculate position for text labels
        ts = 1.0 + 15.0 / RADIUS;
        _tft->setTextColor(TFT_BLACK);

        uint16_t xt = CENTER_X + ts * x;
        uint16_t yt = CENTER_Y + ts * y;

        //! Alternate fonts for visual distinction
        if (i % 2 == 1)
        {
            _tft->setFreeFont(&FreeSerif9pt7b);
        }
        else
        {
            _tft->setFreeFont(&FreeSerif12pt7b);
        }

        //! Adjust position for text alignment
        //! left side shift left
        if (i > 4 && i < 12)
            xt -= _tft->textWidth(dir[i]);

        //! center top and bottom
        if (i == 4 || i == 12)
            xt -= _tft->textWidth(dir[i]) / 2;
        if (i == 4)
            yt -= 10;
        if (i == 12)
            yt += 10;

        _tft->drawString(dir[i], xt, yt);
    }
    //! restore default font
    _tft->setFreeFont(&FreeSerif12pt7b);

    drawArrow();
}

/**
 * @brief Draws the wind direction arrow
 *
 * Clears the center of the compass and redraws the arrow pointing
 * in the current wind direction. Also displays numeric degrees.
 */
void TabRose::drawArrow()
{
    //! Clear previous arrow area inside the circle
    _tft->fillCircle(CENTER_X, CENTER_Y, RADIUS - 2, bgColor);
    //! Redraw crosshairs inside
    _tft->drawLine(CENTER_X, CENTER_Y - RADIUS, CENTER_X, CENTER_Y + RADIUS, TFT_BLACK);
    _tft->drawLine(CENTER_X - RADIUS, CENTER_Y, CENTER_X + RADIUS, CENTER_Y, TFT_BLACK);

    //! no vector needed if there is no wind
    if (speed < 0.1)
        return;

    //! Calculate trigonometry for arrow direction
    float x = RADIUS * cos(2 * PI * (90 - direction) / 360); //!< run
    float y = RADIUS * sin(2 * PI * (90 - direction) / 360); //!< rise
    float s = 1e6, yn, xn;
    if (y != 0)
        s = -x / y; //!< perpendicular slope

    //! Calculate perpendicular offsets for arrow width
    xn = sqrt(6.25 / (1 + s * s));
    yn = s * xn;

    //! Draw the arrow shaft (using two triangles to make a thick line/rectangle representation)
    _tft->fillTriangle(CENTER_X - xn, CENTER_Y - yn, CENTER_X + xn, CENTER_Y + yn, CENTER_X + xn + x, CENTER_Y + yn - y, TFT_BLACK);
    _tft->fillTriangle(CENTER_X - xn, CENTER_Y - yn, CENTER_X - xn + x, CENTER_Y - yn - y, CENTER_X + xn + x, CENTER_Y + yn - y, TFT_BLACK);

    //! Arrow head calculation
    float x1 = x * (RADIUS - 12) / RADIUS;
    float y1 = -y * (RADIUS - 12) / RADIUS;

    //! Draw arrow head
    _tft->fillTriangle(CENTER_X + x, CENTER_Y - y, CENTER_X - 4 * xn + x1, CENTER_Y + 4 * yn + y1, CENTER_X + 4 * xn + x1, CENTER_Y - 4 * yn + y1, TFT_BLACK);

    //! Draw digital direction text
    _tft->setTextColor(TFT_BLUE);
    _tft->setFreeFont(&FreeSerif9pt7b);
    _tft->setTextSize(2);
    String d = String(direction) + (char)176; //!< degree symbol
    if (direction > 360)
        d = "ERR";

    //! Position text in the opposite quadrant to the arrow to avoid overlap
    if (direction < 90)
        _tft->drawString(d, CENTER_X - RADIUS * 0.5, CENTER_Y - RADIUS * 0.4);
    else if (direction < 180)
        _tft->drawString(d, CENTER_X + RADIUS * 0.1, CENTER_Y - RADIUS * 0.4);
    else if (direction < 270)
        _tft->drawString(d, CENTER_X + RADIUS * 0.1, CENTER_Y + RADIUS * 0.4);
    else
        _tft->drawString(d, CENTER_X - RADIUS * 0.7, CENTER_Y + RADIUS * 0.4);

    _tft->setFreeFont(&FreeSerif12pt7b);
    _tft->setTextSize(1);
}

/**
 * @brief Draws the numerical wind speed
 */
void TabRose::drawSpeed()
{
    _tft->setTextColor(TFT_BLACK);
    _tft->setTextSize(2); //!< 12*2
    //! Clear and redraw speed
    _tft->fillRect(0.65 * _tft->width(), TAB_H + 50, 0.35 * _tft->width(), 50, bgColor);
    _tft->drawFloat(speed, 1, 0.65 * _tft->width() + 25, TAB_H + 70);
    _tft->setTextSize(1); //!< restore to 1
}

/**
 * @brief Touch event handler
 *
 * @param x Touch X coordinate
 * @param y Touch Y coordinate
 * @param lastClick Time of last click
 */
void TabRose::handle(uint16_t x, uint16_t y, uint32_t lastClick)
{
    //! screen has been tapped at (x,y)
}

/**
 * @brief Setter for speed
 *
 * @param s New speed value (float)
 */
void TabRose::setSpeed(float s)
{
    if (speed != s)
    {
        speed = s;
    }
}

/**
 * @brief Setter for direction
 *
 * @param d New direction value in degrees
 */
void TabRose::setDirection(uint16_t d)
{
    if (direction != d)
    {
        direction = d;
    }
}

#endif
