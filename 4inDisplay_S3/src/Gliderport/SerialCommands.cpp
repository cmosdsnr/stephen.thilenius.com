/**
 * @file SerialCommands.cpp
 * @brief Gliderport serial command handlers.
 */

#ifdef GLIDERPORT
#include "Gliderport/SerialCommands.h"
#include "Gliderport/GliderportTimer.h"
#include "Gliderport/Sensors.h"
#include "devkit_pins.h"
#include "Interrupts.h"
#include "SerialMenu.h"
#include "Report.h"
#include <Arduino.h>

constexpr MenuItem menu2[] = {{'0', "Main menu", 0, nullptr},
                              {'a', "Scan IO14 and IO16 (speed & Direction)", 0, nullptr},
                              {'b', "Toggle reportSpeed", 0, nullptr},
                              {'c', "Detach Interrupts", 0, nullptr},
                              {'d', "Attach interrupts", 0, nullptr},
                              {'e', "Show interrupt counter", 0, nullptr},
                              {'?', "This help", 0, nullptr}};
const size_t menu2Size = sizeof(menu2) / sizeof(menu2[0]);

/**
 * @brief Handles serial commands for the Gliderport module.
 *
 * This function is called from Serial.cpp when the menu selector is set to SPEC_MENU (Menu 2).
 * It processes single-character commands specific to this module.
 *
 * @param command The character command received from serial.
 * @param data Optional data string accompanying the command.
 */
void handleCommand(char command, char *data)
{
    printf("Command:%c %s\n", command, data);
    switch (command)
    {
    case '0': //!< Main menu
        SerialMenu.menuSelector = MAIN_MENU;
        SerialMenu.printMenu(MAIN_MENU);
        break;
    case 'a': //!< Scan IO14 and IO16 (speed & Direction)
        Report.printf("Speed: %d Direction: %d\n", digitalRead(SPEED_PIN), digitalRead(DIRECTION_PIN));
        break;
    case 'b': //!< Toggle reportSpeed
        //! sensors.reportSpeed = !sensors.reportSpeed;
        //! printf("reportSpeed set to %s\n", reading.reportSpeed ? "true" : "false");
        break;
    case 'c': //!< Detach Interrupts
        printf("Detach Interrupts not implemented\n");
        break;
    case 'd': //!< Attach interrupts
        printf("Attach Interrupts not implemented\n");
        break;
    case 'e': //!< Show interrupt counter
        Report.printf("interruptCounter: %d\n", interruptCounter);
        break;
    case '?': //!< This help
        SerialMenu.printMenu(MAIN_MENU);
        break;
    }
}
#endif
