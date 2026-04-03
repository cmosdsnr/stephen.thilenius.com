#include <WiFi.h>
#include <EEPROM.h>
#include "EpromData.h"
#include "Report.h"

/**
 * @file EpromData.cpp
 * @brief EEPROM data storage implementation.
 */

#define ADDR_MAGIC 0
#define ADDR_CHANNEL 1
#define ADDR_BSSID 2
#define ADDR_SSID 8
#define ADDR_PASSWORD 72

/**
 * @brief Initializes the EEPROM library.
 *
 * Allocates memory and checks for success. Restarts ESP on failure.
 */
void startEEprom()
{
    if (!EEPROM.begin(EEPROM_SIZE))
    {
        int i = EEPROM_SIZE;
        printf("Could not initialize EEPROM at %d bytes\r\n", i);
        delay(1000);
        ESP.restart();
    }
    printf("EEPROM setup done\n");
}

/**
 * @brief writes default values to EEPROM (Stub).
 */
void initEEprom()
{
    uint8_t address = 1;
}

/**
 * @brief Saves current WiFi configuration to EEPROM including BSSID and Channel.
 *        Uses current WiFi connection details.
 */
void saveWiFiConfig()
{
    String ssid = WiFi.SSID();
    String password = WiFi.psk();
    uint8_t channel = WiFi.channel();
    uint8_t *bssid = WiFi.BSSID();

    EEPROM.write(ADDR_MAGIC, MAGIC_BYTE);
    EEPROM.write(ADDR_CHANNEL, channel);

    for (int i = 0; i < 6; i++)
        EEPROM.write(ADDR_BSSID + i, bssid[i]);

    // Optionally persist SSID & password too
    for (int i = 0; i < 32; i++)
    {
        EEPROM.write(ADDR_SSID + i, i < ssid.length() ? ssid[i] : 0);
        EEPROM.write(ADDR_PASSWORD + i, i < password.length() ? password[i] : 0);
    }

    EEPROM.commit(); // ← required on ESP32!
    Serial.printf("Saved  ch=%d  BSSID=%02X:%02X:%02X:%02X:%02X:%02X\n",
                  channel,
                  bssid[0], bssid[1], bssid[2],
                  bssid[3], bssid[4], bssid[5]);
}

/**
 * @brief Reads WiFi configuration data from EEPROM.
 *
 * @return EpromData structure containing the loaded values.
 */
EpromData loadWiFiConfig()
{
    EpromData data;
    data.magicByte = EEPROM.read(ADDR_MAGIC);
    data.channel = EEPROM.read(ADDR_CHANNEL);
    for (int i = 0; i < 6; i++)
    {
        data.bssid[i] = EEPROM.read(ADDR_BSSID + i);
    }
    for (int i = 0; i < 32; i++)
    {
        data.ssid[i] = EEPROM.read(ADDR_SSID + i);
    }
    for (int i = 0; i < 32; i++)
    {
        data.password[i] = EEPROM.read(ADDR_PASSWORD + i);
    }
    return data;
}
