/**
 * @file EpromData.h
 * @brief Gliderport EEPROM storage declarations for camera MAC and IP addresses.
 */

#ifndef GLIDERPORT_EEPROM_H
#define GLIDERPORT_EEPROM_H

#include "Arduino.h"

#include "../EpromData.h"

#define ADDR_CAMERA1_MAC PROJECT_START     // 6 bytes
#define ADDR_CAMERA2_MAC PROJECT_START + 6 // 6 bytes
#define ADDR_CAMERA1_IP PROJECT_START + 12 // 4 bytes
#define ADDR_CAMERA2_IP PROJECT_START + 16 // 4 bytes

/**
 * @brief Saves a camera MAC address to EEPROM.
 *
 * @param cameraNumber Index of the camera
 * @param n Pointer to the MAC address array
 */
void saveCameraMac(uint8_t cameraNumber, uint8_t *n);

/**
 * @brief Loads a camera MAC address from EEPROM.
 *
 * @param cameraNumber Index of the camera
 * @param n Pointer to the buffer to store the MAC address
 */
void loadCameraMac(uint8_t cameraNumber, uint8_t *n);

/**
 * @brief Saves a camera IP address to EEPROM.
 *
 * @param cameraNumber Index of the camera
 * @param ip IP address object to save
 */
void saveCameraIP(uint8_t cameraNumber, IPAddress ip);

/**
 * @brief Loads a camera IP address from EEPROM.
 *
 * @param cameraNumber Index of the camera
 * @return IPAddress The stored IP address
 */
IPAddress loadCameraIP(uint8_t cameraNumber);

#endif // GLIDERPORT_EEPROM_H