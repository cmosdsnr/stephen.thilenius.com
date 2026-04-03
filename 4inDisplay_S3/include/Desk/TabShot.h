#ifndef SHOT_H
#define SHOT_H
#include <Arduino.h>
#include <TFT_eSPI.h>
#include "Tab.h"

/**
 * @brief Shot schedule UI for Semaglutide tracking.
 *
 * Layout:
 * - Top: Date adjusters (+/- days)
 * - Middle: Progress slider showing time until next shot
 * - Bottom: Reset button to log a new shot
 * - Text: Displays the calculated next shot date/time
 */
class TabShot : public Tab
{
public:
    /** @brief Construct the shot tab UI. */
    TabShot(TFT_eSPI *tft);
    /** @brief Draw the tab contents. */
    void draw() override;
    /** @brief Update the tab state. */
    void loop() override;
    /** @brief Handle touch input. */
    void handle(uint16_t x, uint16_t y, uint32_t lastClick) override;

private:
    TFT_eSPI *_tft;
    TFT_eSprite *_knob; // Sprite for the draggable slider knob
    Slider *_s1;        // Progress bar controller
    time_t _next;       // Timestamp for the next scheduled shot

    // Updates the progress bar visual state
    void redrawBar(int16_t w);
    void shortenBar(int16_t lastWidth, int16_t newWidth);
    void detectDrag();

    // Geometry for the reset button
    uint16_t _buttonY, _buttonWidth, _buttonX, _buttonHeight;
    int16_t _lastW = 0, _lastM = 0; // State tracking for slider updates

    // UI Component rendering
    void drawResetButton();
    void drawAdjusters();

    /** @brief Formats and displays the target date/time strings. */
    void drawTime();

    // Helper to draw +/- adjustment buttons
    void drawAdjuster(int16_t x, int16_t y, const char *label, int val);

    // Hit testing for top adjuster buttons
    void checkAdjusters(uint16_t px, uint16_t py);
};

#endif