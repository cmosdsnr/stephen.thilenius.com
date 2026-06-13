/**
 * @file SerialCommands.cpp
 * @brief Coffee serial command handlers.
 */

#ifdef COFFEE
#include "Coffee/SerialCommands.h"
#include "Coffee/Relays.h"
#include "SerialMenu.h"
#include "Report.h"
#include <Arduino.h>

constexpr MenuItem menu2[] = {{'0', "Main menu", 0, nullptr},
                               {'a', "Toggle Lights (pin 47)", 0, nullptr},
                               {'b', "Toggle Fill (pin 6)", 0, nullptr},
                               {'c', "Toggle Lock (pin 15)", 0, nullptr},
                               {'d', "Toggle LockH (pin 7)", 0, nullptr},
                               {'?', "This help", 0, nullptr}};
const size_t menu2Size = sizeof(menu2) / sizeof(menu2[0]);

/**
 * @brief Handles serial commands for the Coffee module.
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
    case 'a': //!< Toggle Lights (pin 47)
        relays->LightsToggle();
        printf("Lights: %s\n", relays->AreLightsOn() ? "ON" : "OFF");
        break;
    case 'b': //!< Toggle Fill (pin 6)
        relays->FillToggle();
        printf("Fill: %s\n", relays->IsFillOn() ? "ON" : "OFF");
        break;
    case 'c': //!< Toggle Lock (pin 15)
        relays->LockToggle();
        printf("Lock: %s\n", relays->IsLockOn() ? "ON" : "OFF");
        break;
    case 'd': //!< Toggle LockH (pin 7)
        relays->LockhToggle();
        printf("LockH: %s\n", relays->IsLockhOn() ? "ON" : "OFF");
        break;
    case '?': //!< This help
        SerialMenu.printMenu(SPEC_MENU);
        break;
    }
}
#endif
