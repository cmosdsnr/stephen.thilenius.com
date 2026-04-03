#include <Arduino.h>
#include <TFT_eSPI.h>
#include "Ring.h"
#include "Display.h"

#define DEG2RAD 0.0174532925

Ring::Ring(int _x, int _y, int _r, int _w, int _ringColor, int _backgroundColor, int _disabledColor, int _enabledColor, const uint8_t *_bits, int _width, int _height)
{
    x = _x;
    y = _y;
    seg = 0;
    r = _r;
    w = _w;
    bits = _bits;
    width = _width;
    height = _height;
    go = false;
    ringColor = _ringColor;
    backgroundColor = _backgroundColor;
    disabledColor = _disabledColor;
    enabledColor = _enabledColor;
}

void Ring::begin()
{
    go = true;
    tft.drawXBitmap(x - 32, y - 32, bits, width, height, enabledColor);
}

void Ring::fillToDeg(uint16_t deg)
{
    while (deg > seg)
    {
        // Calculate pair of coordinates for segment start
        float sx = cos((seg - 90) * DEG2RAD);
        float sy = sin((seg - 90) * DEG2RAD);
        uint16_t x0 = sx * (r - w) + x;
        uint16_t y0 = sy * (r - w) + y;
        uint16_t x1 = sx * r + x;
        uint16_t y1 = sy * r + y;

        // Calculate pair of coordinates for segment end
        seg += 3;
        float sx2 = cos((seg - 90) * DEG2RAD);
        float sy2 = sin((seg - 90) * DEG2RAD);
        int x2 = sx2 * (r - w) + x;
        int y2 = sy2 * (r - w) + y;
        int x3 = sx2 * r + x;
        int y3 = sy2 * r + y;

        tft.fillTriangle(x0, y0, x1, y1, x2, y2, ringColor);
        tft.fillTriangle(x1, y1, x2, y2, x3, y3, ringColor);
        if (seg >= 360)
        {
            Reset();
            break; // get out of while loop
        }
    }
}

void Ring::Increment()
{
    if (go)
    {
        // Calculate pair of coordinates for segment start
        float sx = cos((seg - 90) * DEG2RAD);
        float sy = sin((seg - 90) * DEG2RAD);
        uint16_t x0 = sx * (r - w) + x;
        uint16_t y0 = sy * (r - w) + y;
        uint16_t x1 = sx * r + x;
        uint16_t y1 = sy * r + y;

        // Calculate pair of coordinates for segment end
        seg += 3;
        float sx2 = cos((seg - 90) * DEG2RAD);
        float sy2 = sin((seg - 90) * DEG2RAD);
        int x2 = sx2 * (r - w) + x;
        int y2 = sy2 * (r - w) + y;
        int x3 = sx2 * r + x;
        int y3 = sy2 * r + y;

        tft.fillTriangle(x0, y0, x1, y1, x2, y2, ringColor);
        tft.fillTriangle(x1, y1, x2, y2, x3, y3, ringColor);
        if (seg == 360)
        {
            Reset();
        }
    }
}

void Ring::Reset()
{
    go = false;
    seg = 0;
    clear();
    tft.drawXBitmap(x - 32, y - 32, bits, width, height, disabledColor);
}

void Ring::flashOrange()
{
    tft.drawXBitmap(x - 32, y - 32, bits, width, height, TFT_ORANGE);
}

void Ring::flashBlack()
{
    tft.drawXBitmap(x - 32, y - 32, bits, width, height, TFT_BLACK);
}

void Ring::drawX()
{

    tft.drawXBitmap(x - 20, y - 20, bits, width, height, TFT_DARKGREY);
    for (int i = -6; i < 0; i++)
        tft.drawLine(x - 20, y - 20 - i, x + 20 + i, y + 20, TFT_RED);
    for (int i = 0; i < 7; i++)
        tft.drawLine(x - 20 + i, y - 20, x + 20, y + 20 - i, TFT_RED);
    for (int i = -6; i < 0; i++)
        tft.drawLine(x - 20, y + 20 - i, x + 20 - i, y - 20, TFT_RED);
    for (int i = 0; i < 7; i++)
        tft.drawLine(x - 20 + i, y + 20, x + 20, y - 20 + i, TFT_RED);
}

void Ring::clear()
{
    tft.fillCircle(x, y, r + 2, backgroundColor);
}
