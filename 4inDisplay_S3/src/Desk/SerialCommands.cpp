#ifdef DESK
#include "Desk/SerialCommands.h"
#include "Desk/WindTimer.h"
#include "Desk/Ultimeter.h"
#include "SerialMenu.h"
#include "Report.h"
#include "Desk/EpromData.h"
#include "Interrupts.h"

#include <Arduino.h>

constexpr MenuItem menu2[] = {{'0', "Main menu", 0, nullptr},
                              {'a', "Show next semaglutide shot", 0, nullptr},
                              {'b', "Show interrupt counter", 0, nullptr},
                              {'c', "Toggle ultimeter response logging (default: off)", 0, nullptr},
                              {'?', "This help", 0, nullptr}};
const size_t menu2Size = sizeof(menu2) / sizeof(menu2[0]);
#include <time.h>

/**
 * @file SerialCommands.cpp
 * @brief Desk-specific serial command handling.
 */

/**
 * @brief Handles serial commands for the Desk module.
 *
 * This function is called from Serial.cpp when the menu selector is set to SPEC_MENU (Menu 2).
 * It processes single-character commands specific to this module.
 *
 * @param command The character command received from serial.
 * @param data Optional data string accompanying the command.
 */
void handleCommand(char command, char *data)
{
    time_t e;
    printf("Command:%c %s\n", command, data);
    switch (command)
    {
    case '0': //!< Main menu
        SerialMenu.printMenu(MAIN_MENU);
        break;
    case 'a': //!< Show next semaglutide shot
        e = getNextShot();
        if (e)
        {
            Report.printf("Next shot: %s", asctime(localtime(&e)));
        }
        else
        {
            printf("No next shot\n");
        }
        break;
    case 'b': //!< Show interrupt counter
        windTimerInstance.reportInterruptCounter();
        break;
    case 'c': //!< Toggle ultimeter response logging
        ultimeterVerbose = !ultimeterVerbose;
        printf("ultimeterUpdate logging: %s\n", ultimeterVerbose ? "ON" : "OFF");
        break;
    case '?': //!< This help
        SerialMenu.printMenu(SPEC_MENU);
        break;
    }
}
#endif
