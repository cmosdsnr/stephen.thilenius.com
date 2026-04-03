/**
 * @file TabStatus.h
 * @brief Sprinkler status tab declaration.
 */

#ifndef STATUS_H
#define STATUS_H
#include <Arduino.h>
#include <TFT_eSPI.h>
#include "Tab.h"
#include "Slider.h"
#include "Button.h"
#include "Networks.h"
#include "Clock.h"

/**
 * @brief Sprinkler status UI tab.
 */
class TabStatus : public Tab
{
public:
    /**
     * @brief Create a status tab bound to the display driver.
     * @param tft Display driver
     */
    TabStatus(TFT_eSPI *tft);
    /**
     * @brief Set the boundary epoch for schedule display.
     * @param boundary Boundary timestamp
     */
    void SetBoundary(BoundaryData boundary);
    /**
     * @brief Draw the status screen.
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
    String ssid = "Connecting...";
    IPAddress ip = IPAddress(0, 0, 0, 0);
    int8_t rssi = 0;

    int availableHeight;
    int availableWidth;
    int nameWidth;
    int top;
    int middle;
    int bottom;
    int month;
    int day;
    BoundaryData boundary;
    Button *backButton = nullptr;

    void addDay();
    void resetBoundary();
    void drawSummary();
    void drawDetails();
    void drawDay(int day);
};

#endif