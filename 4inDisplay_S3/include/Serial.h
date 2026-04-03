#ifndef SERIAL_H
#define SERIAL_H
#include <Arduino.h>
#include "SerialMenu.h"

/**
 * @file Serial.h
 * @brief Serial and WebSerial command handling.
 */

/**
 * @brief Processes commands received from WebSerial.
 *
 * @param command Command identifier
 * @param data Command data
 * @return void
 */
void handleWebSerialCommands(uint8_t command, char *data, uint8_t menuSelector = MAIN_MENU);

/**
 * @brief Main loop handler for incoming serial commands.
 * @return void
 */
void handleSerialCommands();

extern bool turnOnPins;

// per project definitions but same header:
/**
 * @brief Project-specific command handler.
 *
 * @param command Command character
 * @param data Optional data string
 */
void handleCommand(char command, char *data);
#endif