/**
 * @file TabSprinkler.h
 * @brief Sprinkler control tab declaration.
 */

#ifndef TAB_SPRINKLER_H
#define TAB_SPRINKLER_H
#include <Arduino.h>
#include <TFT_eSPI.h>
#include <HTTPClient.h>
#include "Tab.h"
#include "Slider.h"
#include "devkit_pins.h"

/**
 * @brief Sprinkler control UI tab.
 */
class TabSprinkler : public Tab
{
public:
    /**
     * @brief Create a sprinkler tab bound to the display driver.
     * @param tft Display driver
     */
    TabSprinkler(TFT_eSPI *tft);
    /**
     * @brief Draw the sprinkler screen.
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
    uint64_t lastComm = 0;
    int16_t _fill_x, _fill_y;  // x and y can be negative
    uint16_t _fill_w, _fill_h; //

    // Define button layout: 2 rows of 3 buttons
    const char *buttonLabels[6] = {
        "PUMP",
        "CH1",
        "CH2",
        "CH3",
        "CH4",
        "N/C",
    };

    // Define corresponding pins for each button
    const int buttonPins[6] = {
        PUMP_PIN,
        CH1_PIN,
        CH2_PIN,
        CH3_PIN,
        CH4_PIN,
        NC_PIN,
    };
};

#endif