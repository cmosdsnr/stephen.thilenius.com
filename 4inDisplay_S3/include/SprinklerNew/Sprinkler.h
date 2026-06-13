/**
 * @file Sprinkler.h
 * @brief Sprinkler module API.
 */

#ifndef SPRINKLER_H
#define SPRINKLER_H

extern const uint8_t sprinklerPins[];
extern uint8_t daysSinceBoundary;
extern struct tm boundaryInfo;

/**
 * @brief Initialize sprinkler hardware and state.
 */
void sprinklerSetup();
/**
 * @brief Run the sprinkler control loop.
 */
void sprinklerLoop();
#endif