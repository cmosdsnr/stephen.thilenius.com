/**
 * @file Distance.h
 * @brief Garage distance sensor helpers.
 */

#ifndef DISTANCE_H
#define DISTANCE_H

#include <Wire.h>
#include "VL53L0X.h"
#include "devkit_s3_pins.h"

// Uncomment this line to use long range mode. This
// increases the sensitivity of the sensor and extends its
// potential range, but increases the likelihood of getting
// an inaccurate reading because of reflections from objects
// other than the intended target. It works best in dark
// conditions.

#define LONG_RANGE

// Uncomment ONE of these two lines to get
// - higher speed at the cost of lower accuracy OR
// - higher accuracy at the cost of lower speed

#define HIGH_SPEED
// #define HIGH_ACCURACY

/**
 * @brief Initialize the distance sensor.
 */
void setupDistance();
/**
 * @brief Update distance measurements.
 */
void distanceLoop();
/**
 * @brief Get the last distance reading.
 * @return Distance value
 */
uint16_t getDistance();

#endif // DISTANCE_H