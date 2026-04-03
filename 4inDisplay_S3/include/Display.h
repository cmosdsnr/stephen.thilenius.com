#ifndef DISPLAY_H
#define DISPLAY_H
#include <TFT_eSPI.h>
#include "Tabs.h"

extern Tabs *tabs;
extern TFT_eSPI tft;

/**
 * @file Display.h
 * @brief Display setup and UI helpers.
 */

/**
 * @brief Initializes the TFT display hardware.
 * @return void
 */
void setupDisplay();

/**
 * @brief Initializes the tab system for the UI.
 * @return void
 */
void setupTabs();

/**
 * @brief Displays a slideshow of images.
 * @return void
 */
void ShowImages();

/**
 * @brief Displays a meter gauge.
 * @return void
 */
void ShowMeter();

/**
 * @brief Runs the touch screen calibration routine.
 *
 * @param force If true, forces calibration even if data exists.
 * @return void
 */
void touch_calibrate(bool force = false);

#endif