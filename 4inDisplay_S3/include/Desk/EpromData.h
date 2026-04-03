#ifndef DESK_EEPROM_H
#define DESK_EEPROM_H

#include <Arduino.h>
#include "../EpromData.h"

#define ADDR_SHOT_TIME    PROJECT_START       // 8 bytes (136-143)
#define ADDR_POWER_CH     (PROJECT_START + 8) // 1 byte  (144) — channel bitmask

/**
 * @brief Saves the next shot timestamp/value to EEPROM.
 */
void saveNextShot(uint64_t n);

/**
 * @brief Retrieves the next shot value from EEPROM.
 */
uint64_t getNextShot();

/**
 * @brief Saves the power tab channel bitmask to EEPROM.
 *        Bit N = channel N enabled.
 */
void savePowerChannels(uint8_t mask);

/**
 * @brief Loads the power tab channel bitmask from EEPROM.
 * @return uint8_t Bitmask, defaults to 0x01 (ch0 only) if unset.
 */
uint8_t loadPowerChannels();

#endif // DESK_EEPROM_H