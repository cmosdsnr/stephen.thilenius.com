#ifndef EPROMDATA_H
#define EPROMDATA_H

#include <Arduino.h>

#define EEPROM_SIZE 512
#define PROJECT_START 136
#define MAGIC_BYTE 0xAB

struct EpromData
{
    char magicByte;
    char channel;
    char bssid[6];
    char ssid[32];
    char password[32];
};

/**
 * @file EpromData.h
 * @brief EEPROM access helpers for device settings.
 */

/**
 * @brief Begins the EEPROM interface.
 * @return void
 */
void startEEprom();

/**
 * @brief Initializes the EEPROM with default values if invalid.
 * @return void
 */
void initEEprom();

/**
 * @brief Saves current WiFi configuration to EEPROM including BSSID and Channel.
 *        Uses current WiFi connection details.
 */
void saveWiFiConfig();

/**
 * @brief Loads WiFi configuration from EEPROM.
 * @return EpromData struct containing WiFi config
 */
EpromData loadWiFiConfig();

#endif // EPROMDATA_H
