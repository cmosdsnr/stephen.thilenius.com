#include <Arduino.h>
#include "devkit_pins.h"
#include "report.h"
#include <Wire.h>
#include <vector>

/**
 * @file I2C.cpp
 * @brief I2C initialization and scan helpers.
 */

/**
 * @brief Scans the I2C bus for devices.
 *
 * Iterates through all possible I2C addresses and reports
 * any ACK responses.
 *
 * 0: Success (device found and acknowledged).
 * 1: Data too long to fit in transmit buffer.
 * 2: Received NACK on transmit of address (No device at this address, or device busy).
 * 3: Received NACK on transmit of data.
 * 4: Other Error.
 *
 * The valid range of 7-bit I2C addresses is 0x08 to 0x77 (decimal 8 to 119) for general-purpose devices.
 * 0x00 - 0x07: Reserved addresses (e.g., 0x00 is General Call, 0x01 is CBUS).
 * 0x08 - 0x77: Valid addresses for slave devices.
 * 0x78 - 0x7F: Reserved (10-bit address extension, etc.).
 */
void scanI2CDevices()
{
    byte error, address;

    std::vector<uint8_t> foundAddresses;
    std::vector<uint8_t> errorAddresses;
    printf("Scanning I2C bus...\n");
    for (address = 1; address < 127; address++)
    {
        Wire.beginTransmission(address);
        error = Wire.endTransmission();
        if (error == 0)
            foundAddresses.push_back(address);
        else if (error == 4)
            errorAddresses.push_back(address);
    }

    String r = "";
    if (foundAddresses.empty())
    {
        r += "No I2C devices found\n";
    }
    else
    {
        if (foundAddresses.size() > 5)
            r += String(foundAddresses.size()) + " I2C devices found\n";
        else
            for (uint8_t addr : foundAddresses)
            {
                char buf[50];
                sprintf(buf, "I2C device found at address 0x%02X\n", addr);
                r += buf;
            }
    }
    if (errorAddresses.size() > 5)
        r += String(errorAddresses.size()) + " I2C ERRORED devices found\n";
    else
        for (uint8_t addr : errorAddresses)
        {
            char buf[50];
            sprintf(buf, "Unknown error at address 0x%02X\n", addr);
            r += buf;
        }
    
    printf(r.c_str());
}

/**
 * @brief Initializes the I2C peripheral.
 *
 * Sets SDA and SCL pins and clock speed.
 */
void InitI2C(void)
{
    Wire.setPins(SDA_PIN, SCL_PIN);
    Wire.begin(SDA_PIN, SCL_PIN, 400000); //!< SDA, SCL
}
