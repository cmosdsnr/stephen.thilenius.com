/**
 * @file TabGliderport.cpp
 * @brief Gliderport main tab implementation.
 */

#ifdef GLIDERPORT
#include <Arduino.h>
#include "devkit_pins.h"
#include "Gliderport/Gliderport.h"
#include "Gliderport/TabGliderport.h"
#include "Gliderport/Sensors.h"
#include "Tabs.h"
#include "Report.h"
#include "Buzzer.h"

#define LINE_HEIGHT 24
#define TOP_LINE TAB_H + 10
//! pins    colors              Function
//! 2 & 5   yellow & black      Speed reed switch (5.4 ohms closed)
//! 3 & 4   red & green         Direction reed switch (5.4 ohms closed)

//! speed duty cycle is about 30% (high 30% of the time)

TabGliderport::TabGliderport(TFT_eSPI *tft) : Tab()
{
    name = "Gliderport";
    bgColor = 0xd7ff;
    _tft = tft;
    nameWidth = _tft->textWidth(name.c_str());
    seconds = (millis() - lastWindReading) / 1000;
    inPause = false;
    changed = true;
}

void TabGliderport::loop()
{

    static uint32_t delay = 0;
    static uint8_t step = 0;

    if (millis() - delay > 5000)
    {
        delay = millis();
        dhtData d = sensors.getDhtData(false);
        writeToScreen(d.temperature, 0, 6);
        writeToScreen((uint16_t)(d.humidity), 0, 12);
        bmpData b = sensors.getBmpData(false);
        writeToScreen(b.temperature, 0, 8);
        writeToScreen((uint16_t)(b.pressure / 100.0f), 0, 16);
    }

    //! if seconds has not changed, return
    if (seconds == (millis() - lastWindReading) / 1000)
        return;
    else
        seconds = (millis() - lastWindReading) / 1000;

    if (seconds > 15)
    {
        if (!inPause)
        {
            _tft->fillCircle(11, _tft->height() - 12, 8, TFT_DARKGREY);
            _tft->fillCircle(32, _tft->height() - 12, 8, TFT_DARKGREY);
            _tft->fillCircle(53, _tft->height() - 12, 8, TFT_DARKGREY);
            _tft->fillCircle(74, _tft->height() - 12, 8, TFT_DARKGREY);
            _tft->setCursor(120, _tft->height() - 9);
            _tft->print("last edge seen");
            _tft->setCursor(320, _tft->height() - 9);
            _tft->print("ago");
            inPause = true;
            setSpeed(0);
            setDirection(0);
        }

        String s;
        if (seconds < 60)
            s = String(seconds) + "s";
        else if (seconds < 3600)
            s = ">" + String((int)(seconds / 60)) + "m";
        else if (seconds < 86400)
            s = ">" + String((int)(seconds / 3600)) + "h";
        else
            s = ">" + String((int)(seconds / 86400)) + "d";
        _tft->fillRect(260, _tft->height() - 25, 60, 25, bgColor);
        _tft->drawString(s, 260, _tft->height() - 17);
    }
    else if (inPause)
    {
        _tft->fillRect(120, _tft->height() - 23, _tft->width() - 120, 23, bgColor);
        inPause = false;
    }
}

void TabGliderport::draw()
{

    //! Report.print("draw");
    changed = false;
    _tft->fillRect(0, TAB_H - CORNER_RADIUS, _tft->width(), _tft->height() - TAB_H + CORNER_RADIUS, bgColor);
    _tft->setTextColor(TFT_BLACK);
    _tft->setCursor(10, TOP_LINE);
    _tft->print("Speed:");
    _tft->setCursor(10, TOP_LINE + 1 * LINE_HEIGHT);
    _tft->print("Dir  :");
    _tft->setCursor(10, TOP_LINE + 3 * LINE_HEIGHT);
    _tft->print("DHT T:");
    _tft->setCursor(10, TOP_LINE + 4 * LINE_HEIGHT);
    _tft->print("BMP  T:");
    _tft->setCursor(10, TOP_LINE + 6 * LINE_HEIGHT);
    _tft->print("Humid:");
    _tft->setCursor(10, TOP_LINE + 8 * LINE_HEIGHT);
    _tft->print("Pressure:");
    _tft->setCursor(180, TOP_LINE);
    _tft->print("MPH");
    _tft->setCursor(180, TOP_LINE + 1 * LINE_HEIGHT);
    _tft->print("Deg");
    _tft->setCursor(180, TOP_LINE + 3 * LINE_HEIGHT);
    _tft->print("F");
    _tft->setCursor(180, TOP_LINE + 4 * LINE_HEIGHT);
    _tft->print("F");
    _tft->setCursor(180, TOP_LINE + 6 * LINE_HEIGHT);
    _tft->print("%");
    _tft->setCursor(180, TOP_LINE + 8 * LINE_HEIGHT);
    _tft->print("hPa");

    _tft->setCursor(_tft->width() - 190, TOP_LINE + 0 * LINE_HEIGHT);
    _tft->print("Speed\n");
    _tft->setCursor(_tft->width() - 190, TOP_LINE + 1.5 * LINE_HEIGHT);
    _tft->print("Low  :");
    _tft->setCursor(_tft->width() - 190, TOP_LINE + 2.5 * LINE_HEIGHT);
    _tft->print("High :");
    _tft->setCursor(_tft->width() - 190, TOP_LINE + 3.5 * LINE_HEIGHT);
    _tft->print("Per  :");

    _tft->setCursor(_tft->width() - 190, TOP_LINE + 5 * LINE_HEIGHT);
    _tft->print("Direction\n");
    _tft->setCursor(_tft->width() - 190, TOP_LINE + 6.5 * LINE_HEIGHT);
    _tft->print("Low  :");
    _tft->setCursor(_tft->width() - 190, TOP_LINE + 7.5 * LINE_HEIGHT);
    _tft->print("High :");
    _tft->setCursor(_tft->width() - 190, TOP_LINE + 8.5 * LINE_HEIGHT);
    _tft->print("Per  :");

    _tft->setCursor(_tft->width() - 60, TOP_LINE + 1.5 * LINE_HEIGHT);
    _tft->print("ms");
    _tft->setCursor(_tft->width() - 60, TOP_LINE + 2.5 * LINE_HEIGHT);
    _tft->print("ms");
    _tft->setCursor(_tft->width() - 60, TOP_LINE + 3.5 * LINE_HEIGHT);
    _tft->print("ms");
    _tft->setCursor(_tft->width() - 60, TOP_LINE + 6.5 * LINE_HEIGHT);
    _tft->print("ms");
    _tft->setCursor(_tft->width() - 60, TOP_LINE + 7.5 * LINE_HEIGHT);
    _tft->print("ms");
    _tft->setCursor(_tft->width() - 60, TOP_LINE + 8.5 * LINE_HEIGHT);
    _tft->print("ms");

    if (inPause)
    {
        _tft->fillCircle(11, _tft->height() - 12, 8, TFT_DARKGREY);
        _tft->fillCircle(32, _tft->height() - 12, 8, TFT_DARKGREY);
        _tft->fillCircle(53, _tft->height() - 12, 8, TFT_DARKGREY);
        _tft->fillCircle(74, _tft->height() - 12, 8, TFT_DARKGREY);
        _tft->setCursor(120, _tft->height() - 9);
        _tft->print("last edge seen");
        _tft->setCursor(320, _tft->height() - 9);
        _tft->print("ago");
    }
}

void TabGliderport::handle(uint16_t x, uint16_t y, uint32_t lastClick)
{
    //! screen has been tapped at (x,y)

    //! Rescan networks
    if (x < 220 && y > 200 && lastClick > 2000)
    {
        quickBeep();
        Report.print("Rescan");
        _tft->fillRoundRect(5, 200, 210, 100, 7, TFT_BLACK);
        _tft->setTextColor(TFT_WHITE);
        _tft->setCursor(15, 210);
        _tft->print("Scanning...");

        draw();
    }
    //! Select network
    if (x > 255 && y > TAB_H)
    {
        quickBeep();
        draw();
    }
}

void TabGliderport::prepScreen(uint8_t side, uint8_t halfLines)
{
    uint16_t x = side ? _tft->width() - 120 : 120;
    _tft->setTextColor(TFT_BLACK);
    int16_t h = _tft->fontHeight();
    //! Serial0.println(h);  = 29
    _tft->fillRect(x, TOP_LINE - 18 + (halfLines * LINE_HEIGHT) / 2, 60, 23, bgColor); //!< TFT_LIGHTGREY);
    _tft->setCursor(x, TOP_LINE + (halfLines * LINE_HEIGHT) / 2);
}

void TabGliderport::writeToScreen(uint16_t t, uint8_t side, uint8_t halfLines)
{
    if (isActive == false)
        return;
    if (t > 9999)
        t = 9999;
    prepScreen(side, halfLines);
    _tft->print(t);
}

void TabGliderport::writeToScreen(float t, uint8_t side, uint8_t halfLines)
{
    if (isActive == false)
        return;
    if (t > 9999)
        t = 9999;
    prepScreen(side, halfLines);
    _tft->printf("%3.1f", t);
}

void TabGliderport::setSpeed(float t)
{
    writeToScreen(t, 0, 0);
}
void TabGliderport::setDirection(uint16_t t)
{
    writeToScreen(t, 0, 2);
}
void TabGliderport::setInsideTemp(uint16_t t)
{
}
void TabGliderport::setOutsideTemp(uint16_t t)
{
    writeToScreen(t, 0, 8);
}
void TabGliderport::setHumidity(uint16_t h)
{
}

void TabGliderport::setPressure(uint16_t p)
{
    writeToScreen(p, 0, 14);
}

void TabGliderport::setSpeedHigh()
{
    _tft->fillCircle(11, _tft->height() - 12, 8, TFT_BLUE);
    _tft->fillCircle(32, _tft->height() - 12, 8, TFT_LIGHTGREY);
    _tft->fillCircle(53, _tft->height() - 12, 8, TFT_LIGHTGREY);
    _tft->fillCircle(74, _tft->height() - 12, 8, TFT_LIGHTGREY);
}
void TabGliderport::setDirectionHigh()
{
    _tft->fillCircle(11, _tft->height() - 12, 8, TFT_LIGHTGREY);
    _tft->fillCircle(32, _tft->height() - 12, 8, TFT_BLUE);
    _tft->fillCircle(53, _tft->height() - 12, 8, TFT_LIGHTGREY);
    _tft->fillCircle(74, _tft->height() - 12, 8, TFT_LIGHTGREY);
}
void TabGliderport::setSpeedLow()
{
    _tft->fillCircle(11, _tft->height() - 12, 8, TFT_LIGHTGREY);
    _tft->fillCircle(32, _tft->height() - 12, 8, TFT_LIGHTGREY);
    _tft->fillCircle(53, _tft->height() - 12, 8, TFT_BLUE);
    _tft->fillCircle(74, _tft->height() - 12, 8, TFT_LIGHTGREY);
}

void TabGliderport::setDirectionLow()
{
    _tft->fillCircle(11, _tft->height() - 12, 8, TFT_LIGHTGREY);
    _tft->fillCircle(32, _tft->height() - 12, 8, TFT_LIGHTGREY);
    _tft->fillCircle(53, _tft->height() - 12, 8, TFT_LIGHTGREY);
    _tft->fillCircle(74, _tft->height() - 12, 8, TFT_BLUE);
}

void TabGliderport::updateTimes(uint16_t speedLow, uint16_t speedHigh, uint16_t directionLow, uint16_t directionHigh)
{
    writeToScreen((uint16_t)(2 * (speedHigh - speedLow)), 1, 3);
    writeToScreen((uint16_t)(2 * speedLow), 1, 5);
    writeToScreen((uint16_t)(2 * speedHigh), 1, 7);

    if (directionHigh > directionLow)
    {
        writeToScreen((uint16_t)(2 * (directionHigh - directionLow)), 1, 13);
        writeToScreen((uint16_t)(2 * (speedHigh - directionHigh + directionLow)), 1, 15);
        writeToScreen((uint16_t)(2 * speedHigh), 1, 17);
    }
    else
    {
        writeToScreen((uint16_t)(2 * (directionLow - directionHigh)), 1, 13);
        writeToScreen((uint16_t)(2 * (speedHigh - directionLow + directionHigh)), 1, 15);
        writeToScreen((uint16_t)(2 * speedHigh), 1, 17);
    }
}

#endif
