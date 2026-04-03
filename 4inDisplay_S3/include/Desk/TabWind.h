#ifndef WIND_H
#define WIND_H
#include <Arduino.h>
#include <TFT_eSPI.h>
#include "Tab.h"
#include "Slider.h"

/**
 * @brief Wind tab for wind speed/direction and server reporting.
 */
class TabWind : public Tab
{
public:
    /** @brief Construct the wind tab UI. */
    TabWind(TFT_eSPI *tft);
    /** @brief Draw the tab contents. */
    void draw() override;
    /** @brief Update UI and send periodic data. */
    void loop() override;
    /** @brief Handle touch input. */
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
