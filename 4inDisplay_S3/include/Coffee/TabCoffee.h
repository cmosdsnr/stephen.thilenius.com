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

    /**
     * @brief Get the configured fill time.
     * @return Fill time in milliseconds
     */
    uint16_t getFillTime(void);

private:
    TFT_eSPI *_tft;
    TFT_eSprite *_knob;
    Slider *_s1;
    void drawBarFrame(int16_t y, const char *label);
    void updateBar(int16_t y, uint8_t pct, uint8_t &last, bool &drawn, bool grow = true, const char *label = "");
    void drawSlider();
};

#endif