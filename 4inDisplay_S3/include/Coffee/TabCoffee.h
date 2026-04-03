/**
 * @file TabCoffee.h
 * @brief Coffee control tab declaration.
 */

#ifndef COFFEE_H
#define COFFEE_H
#include <Arduino.h>
#include <TFT_eSPI.h>
#include "Tab.h"
#include "Slider.h"

/**
 * @brief Coffee control UI tab.
 */
class TabCoffee : public Tab
{
public:
    /**
     * @brief Create a coffee tab.
     * @param tft Display driver
     */
    TabCoffee(TFT_eSPI *tft);
    /**
     * @brief Draw the coffee screen.
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

    bool _locked = true;
    bool _lightOn = false;
    bool _fillOn = false;

    int16_t _fill_x, _fill_y;  // x and y can be negative
    uint16_t _fill_w, _fill_h; //
};

#endif