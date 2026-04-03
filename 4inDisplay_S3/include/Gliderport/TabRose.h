/**
 * @file TabRose.h
 * @brief Wind rose tab declaration.
 */

#ifndef TAB_ROSE_H
#define TAB_ROSE_H

#include <Arduino.h>
#include <TFT_eSPI.h>
#include "Tab.h"

/**
 * @brief Wind rose UI tab.
 */
class TabRose : public Tab
{
public:
    /**
     * @brief Create a wind rose tab.
     * @param tft Display driver
     */
    TabRose(TFT_eSPI *tft);

    /**
     * @brief Set wind speed for display.
     * @param s Wind speed
     */
    void setSpeed(float s);
    /**
     * @brief Set wind direction for display.
     * @param d Wind direction degrees
     */
    void setDirection(uint16_t d);

    /**
     * @brief Draw the wind arrow.
     */
    void drawArrow();
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
    /**
     * @brief Draw the speed readout.
     */
    void drawSpeed();

private:
    float speed;
    bool validData = true;
    uint16_t direction;
    TFT_eSPI *_tft;
    /**
     * @brief Render a numeric value on the screen.
     * @param t Value to write
     * @param side Screen side selector
     * @param halfLines Line offset
     */
    void writeToScreen(uint16_t t, uint8_t side, uint8_t halfLines);
};

#endif