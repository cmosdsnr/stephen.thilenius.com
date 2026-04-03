/**
 * @file TabConfig.h
 * @brief Coffee configuration tab declaration.
 */

#ifndef CONFIG_H
#define CONFIG_H
#include <Arduino.h>
#include <TFT_eSPI.h>
#include "Tab.h"
#include "Slider.h"

/**
 * @brief Coffee configuration UI tab.
 */
class TabConfig : public Tab
{
public:
    /**
     * @brief Create a config tab.
     * @param tft Display driver
     */
    TabConfig(TFT_eSPI *tft);
    /**
     * @brief Draw the config screen.
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
     * @brief Initialize variable values for display.
     */
    void initializeVariables() override;
    /**
     * @brief Get the configured fill time.
     * @return Fill time in seconds
     */
    uint16_t getFillTime(void);

private:
    TFT_eSPI *_tft;
    TFT_eSprite *_knob; // Sprite for the slide knob
    Slider *_s1;

    bool _locked = true;
    bool _lightOn = false;
    bool _fillOn = false;

    int16_t _fill_x, _fill_y;  // x and y can be negative
    uint16_t _fill_w, _fill_h; //
    bool _x = false;
};

#endif