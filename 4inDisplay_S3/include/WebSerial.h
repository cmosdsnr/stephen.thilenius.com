#ifndef WEBSERIAL_H
#define WEBSERIAL_H

#include <Arduino.h>
#include <AsyncWebSocket.h>
#include <SerialMenu.h>

/**
 * @file WebSerial.h
 * @brief WebSerial and WebSocket broadcast helpers.
 */

/**
 * @brief Sends an event message to connected clients.
 */
void sendEvent(const char *subject, const char *message);
/**
 * @brief Sends a variable update to the web interface.
 *
 * @param name Variable identifier
 * @param value New value
 * @return void
 */
void writeVariable(const char *name, String value);

/**
 * @brief Writes raw data buffer to WebSerial.
 *
 * @param buffer Data buffer
 * @param len Length
 * @return size_t Bytes written
 */
size_t writeWebSerial(const uint8_t *buffer, size_t len);

/**
 * @brief Sends a list of available commands to the web interface.
 *
 * @param cmds Array of command strings
 * @param size Number of commands
 * @return void
 */
void writeWebSerialCommands(const char *cmds[30], uint8_t size);

/**
 * @brief Prints WebSerial status info.
 * @return void
 */
void webSerialInfo();

/**
 * @brief Sends filesystem list to client.
 * @return void
 */
void sendFileList(AsyncWebSocketClient *client = nullptr);

/**
 * @brief Sends partition table to client.
 * @return void
 */
void sendPartitionTable(AsyncWebSocketClient *client = nullptr);

/**
 * @brief Sends current WiFi info to client.
 * @return void
 */
void sendWifiInfo(AsyncWebSocketClient *client = nullptr);

/**
 * @brief Sends SD card info to client.
 * @return void
 */
void sendSDInfo(AsyncWebSocketClient *client = nullptr);

/**
 * @brief Sends serial menu commands to client.
 * @return void
 */
void sendMenus(AsyncWebSocketClient *client = nullptr);

/**
 * @brief Sends all variables to client.
 * @return void
 */
void sendAllVariables(AsyncWebSocketClient *client = nullptr);

/**
 * @brief Sends ESP chip info to client.
 */
void sendESPInfo(AsyncWebSocketClient *client = nullptr);

// ***** MUST have client parameter *******

/**
 * @brief Sends all current data/variables to a client.
 *
 * @param client Specific client connection
 * @return void
 */
void writeAllData(AsyncWebSocketClient *client);

/**
 * @brief Sends GPIO pin values to client.
 */
void sendPinValues(AsyncWebSocketClient *client);

#endif