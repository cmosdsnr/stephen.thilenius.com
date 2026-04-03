#ifdef GLIDERPORT

#include <EEPROM.h>
#include "Gliderport/EpromData.h"
#include "Report.h"

/**
 * @brief Saves camera MAC address.
 *
 * @param cameraNumber 1 or 2
 * @param n Pointer to 6-byte MAC array
 */
void saveCameraMac(uint8_t cameraNumber, uint8_t *n)
{
    uint16_t base = cameraNumber == 1 ? CAMERA1_MAC_ADDRESS : CAMERA2_MAC_ADDRESS;
    EEPROM.writeBytes(base, n, 6);
    EEPROM.commit();
}

/**
 * @brief Reads camera MAC address.
 *
 * @param cameraNumber 1 or 2
 * @param n Pointer to buffer for 6-byte MAC
 */
void loadCameraMac(uint8_t cameraNumber, uint8_t *n)
{
    //! get the current timestamp
    uint16_t base = cameraNumber == 1 ? CAMERA1_MAC_ADDRESS : CAMERA2_MAC_ADDRESS;
    EEPROM.readBytes(base, n, 6);
}

void saveCameraIP(uint8_t cameraNumber, IPAddress ip)
{
    uint16_t base = cameraNumber == 1 ? CAMERA1_IP_ADDRESS : CAMERA2_IP_ADDRESS;
    char n[4];
    n[0] = ip[0];
    n[1] = ip[1];
    n[2] = ip[2];
    n[3] = ip[3];
    printf("Saving Camera %d IP: %s\n", cameraNumber, ip.toString().c_str());
    EEPROM.writeBytes(base, n, 4);
    EEPROM.commit();
}

IPAddress loadCameraIP(uint8_t cameraNumber)
{
    uint16_t base = cameraNumber == 1 ? CAMERA1_IP_ADDRESS : CAMERA2_IP_ADDRESS;
    char n[4];
    EEPROM.readBytes(base, n, 4);
    IPAddress ip;
    ip[0] = n[0];
    ip[1] = n[1];
    ip[2] = n[2];
    ip[3] = n[3];
    printf("Loaded Camera %d IP: %s\n", cameraNumber, ip.toString().c_str());
    return ip;
}

#endif
