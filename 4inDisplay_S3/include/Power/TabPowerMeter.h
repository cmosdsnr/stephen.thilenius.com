/**
 * @file TabPowerMeter.h
 * @brief Power meter tab declaration.
 */

#ifndef TAB_POWERMETER_H
#define TAB_POWERMETER_H
#include <Arduino.h>
#include <TFT_eSPI.h>
#include <HTTPClient.h>
#include "Tab.h"
#include "Slider.h"
#include "devkit_pins.h"

/**
 * @brief Power meter UI tab.
 */
class TabPowerMeter : public Tab
{
public:
    /**
     * @brief Create a tab bound to the display driver.
     * @param tft Display driver instance
     */
    TabPowerMeter(TFT_eSPI *tft);
    /**
     * @brief Draw the power meter screen.
     */
    void draw() override;
    /**
     * @brief Per-loop updates for the tab.
     */
    void loop() override;
    /**
     * @brief Handle touch input.
     * @param x Touch x
     * @param y Touch y
     * @param lastClick Milliseconds since last click
     */
    void handle(uint16_t x, uint16_t y, uint32_t lastClick) override;

private:
    TFT_eSPI *_tft;
};

#endif