#ifdef DESK

#include <EEPROM.h>
#include "Desk/EpromData.h"
#include "Report.h"

/**
 * @brief Saves a timestamp value to EEPROM.
 *
 * @param n Timestamp or value to save
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

void savePowerChannels(uint8_t mask)
{
    EEPROM.writeByte(ADDR_POWER_CH, mask);
    EEPROM.commit();
}

uint8_t loadPowerChannels()
{
    uint8_t mask = EEPROM.readByte(ADDR_POWER_CH);
    return (mask == 0xFF) ? 0x01 : mask; //!< 0xFF = uninitialized, default to ch0 only
}

#endif