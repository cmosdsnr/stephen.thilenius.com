#ifndef COFFEE_EEPROM_H
#define COFFEE_EEPROM_H

#include <Arduino.h>
#include "../EpromData.h"

#define ADDR_SHOT_TIME PROJECT_START // 8 bytes (136-143)

/**
 * @brief Saves the next shot timestamp/value to EEPROM.
 */
void saveNextShot(uint64_t n);

/**
 * @brief Retrieves the next shot value from EEPROM.
 */
uint64_t getNextShot();

#endif // COFFEE_EEPROM_H