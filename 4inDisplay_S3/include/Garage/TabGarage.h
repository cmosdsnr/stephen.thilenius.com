/**
 * @file TabGarage.h
 * @brief Garage tab declaration.
 */

#ifndef TabGarage_h
#define TabGarage_h
#include <TFT_eSPI.h>
#include "Tab.h"

/**
 * @brief Garage UI tab.
 */
class TabGarage : public Tab
{
public:
    /**
     * @brief Create a garage tab.
     * @param tft Display driver
     */
    TabGarage(TFT_eSPI *tft);

    /**
     * @brief Draw the garage screen.
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
    uint32_t lastUpdate = 0;
    uint16_t bar_w;
    uint16_t lastRemaining = 0;
    bool motion = false;
    bool lastMotion = false;
    uint16_t distance = 0;
    uint16_t lastDistance = 0;
    bool doorIsOpen = false; // false = closed, true = open
    bool lastDoor = false;
};

#endif