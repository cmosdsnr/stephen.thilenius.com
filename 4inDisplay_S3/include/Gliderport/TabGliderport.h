/**
 * @file TabGliderport.h
 * @brief Gliderport main tab declaration.
 */

#ifndef TAB_GLIDERPORT_H
#define TAB_GLIDERPORT_H

#include <Arduino.h>
#include <TFT_eSPI.h>
#include "Tab.h"

/**
 * @brief Gliderport main UI tab.
 */
class TabGliderport : public Tab
{
public:
    /**
     * @brief Create a Gliderport tab.
     * @param tft Display driver
     */
    TabGliderport(TFT_eSPI *tft);

    /**
     * @brief Set the low speed timestamp.
     */
    void setSpeedLow();
    /**
     * @brief Set the high speed timestamp.
     */
    void setSpeedHigh();
    /**
     * @brief Set the low direction timestamp.
     */
    void setDirectionLow();
    /**
     * @brief Set the high direction timestamp.
     */
    void setDirectionHigh();
    /**
     * @brief Update the timing window values.
     * @param speedLow Low speed timestamp
     * @param speedHigh High speed timestamp
     * @param directionLow Low direction timestamp
     * @param directionHigh High direction timestamp
     */
    void updateTimes(uint16_t speedLow, uint16_t speedHigh, uint16_t directionLow, uint16_t directionHigh);
    /**
     * @brief Set the wind speed display.
     * @param t Wind speed
     */
    void setSpeed(float t);
    /**
     * @brief Set the wind direction display.
     * @param t Wind direction
     */
    void setDirection(uint16_t t);
    /**
     * @brief Set humidity display.
     * @param h Humidity
     */
    void setHumidity(uint16_t h);
    /**
     * @brief Set inside temperature display.
     * @param t Temperature
     */
    void setInsideTemp(uint16_t t);
    /**
     * @brief Set outside temperature display.
     * @param t Temperature
     */
    void setOutsideTemp(uint16_t t);
    /**
     * @brief Set pressure display.
     * @param h Pressure
     */
    void setPressure(uint16_t h);

    /**
     * @brief Draw the tab screen.
     */
    void draw() override;
    /**
     * @brief Handle touch input.
     * @param x Touch x
     * @param y Touch y
     * @param lastClick Milliseconds since last click
     */
    void handle(uint16_t x, uint16_t y, uint32_t lastClick) override;
    /**
     * @brief Per-loop updates for the tab.
     */
    void loop() override;

private:
    TFT_eSPI *_tft;
    /**
     * @brief Render a numeric value on the screen.
     * @param t Value to write
     * @param side Screen side selector
     * @param halfLines Line offset
     */
    void writeToScreen(uint16_t t, uint8_t side, uint8_t halfLines);
    /**
     * @brief Render a floating-point value on the screen.
     * @param t Value to write
     * @param side Screen side selector
     * @param halfLines Line offset
     */
    void writeToScreen(float t, uint8_t side, uint8_t halfLines);
    /**
     * @brief Prepare a screen side for drawing.
     * @param side Screen side selector
     * @param halfLines Line offset
     */
    void prepScreen(uint8_t side, uint8_t halfLines);

    uint32_t seconds = 0;
    bool inPause = false;
};

#endif