#include <ArduinoJson.h>
#include "SerialMenu.h"
#include "Networks.h"

extern DynamicJsonDocument doc;
extern char str[4096];
extern Networks *wifiNetworks;

/**
 * @file Json.h
 * @brief JSON serialization helpers for WebSocket/WebSerial.
 */

/**
 * @brief Serializes an event row to JSON.
 *
 * @param time Event time string
 * @param event Event description
 */
void EventToJson(const char *time, const char *event);

/**
 * @brief Serializes the menu structure to JSON.
 *
 * Used for sending the available commands to the web interface.
 *
 * @param menu Array of MenuItem structures
 * @param size Number of items in the menu
 * @return void
 */
void MenusToJson();

/**
 * @brief Creates a JSON update for a single variable.
 *
 * @param name Name of the variable
 * @param value String value of the variable
 * @return void
 */
void VariableToJson(const char *name, String value);

/**
 * @brief Serializes all tracked variables to JSON.
 * @param force If true, sends all variables regardless of change status.
 * @return True if variables were serialized, False otherwise.
 */
bool AllVariablesToJson(bool force = false);

/**
 * @brief Serializes WiFi network information to JSON.
 * @return void
 */
void WiFiInfoToJson();

/**
 * @brief Serializes partition table info to JSON.
 * @return void
 */
void PartitionTableToJson();

/**
 * @brief Serializes file list to JSON.
 * @return void
 */
void FileListToJson();

/**
 * @brief Adds serial data to the JSON buffer for web output.
 *
 * @param buffer Pointer to data buffer
 * @param len Length of data
 * @return void
 */
void SerialToJson(const uint8_t *buffer, size_t len);

/**
 * @brief Serializes SD card information to JSON.
 * @return void
 */
void SDInfoToJson();

/**
 * @brief Serializes ESP chip info to JSON.
 */
void espChipInfoToJson();
/**
 * @brief Serializes GPIO input values to JSON.
 */
void PinValuesToJson();
