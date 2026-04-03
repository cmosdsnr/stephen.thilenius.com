#ifndef FUNCTIONS_H
#define FUNCTIONS_H

extern uint16_t measurementCount;
extern double magnitude[];
extern const uint16_t inputPins[];

/**
 * @file Functions.h
 * @brief GPIO and measurement helpers.
 */

/**
 * @brief Performs a set of analog measurements.
 * @return void
 */
void takeMeasurements();

/**
 * @brief Initializes the GPIO pins for input/output.
 * @return void
 */
void initializePins();

/**
 * @brief Prints measurement debug info to Serial.
 *
 * @param n Specific measurement index to debug (if applicable)
 * @return void
 */
void debugMeasurements(uint8_t n);

#endif