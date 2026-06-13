#ifdef COFFEE

/**
 * @file EpromData.cpp
 * @brief Coffee-specific EEPROM persistence for shot schedule.
 */

#include <EEPROM.h>
#include "Coffee/EpromData.h"
#include "Report.h"

/**
 * @brief Saves a timestamp value to EEPROM.
 *
 * @param n Timestamp or value to save.
 */
void saveNextShot(uint64_t n)
{
    EEPROM.writeULong64(ADDR_SHOT_TIME, n);
    EEPROM.commit();
}

/**
 * @brief Reads the saved timestamp from EEPROM.
 * @return uint64_t The saved value
 */
uint64_t getNextShot()
{
    return EEPROM.readULong64(ADDR_SHOT_TIME);
}

#endif
