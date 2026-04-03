/**
 * @file SerialMenu.cpp
 * @brief Serial menu implementation.
 */

#include <Arduino.h>
#include "SerialMenu.h"
#include "Json.h"
#include "WebSockets.h"
#include "Report.h"

const size_t menuSizes[] = {sizeof(menu0) / sizeof(menu0[0]), sizeof(menu1) / sizeof(menu1[0]), menu2Size};

SerialMenuClass::SerialMenuClass()
{
}

SerialMenuClass::~SerialMenuClass()
{
}

/**
 * @brief Retrieves the number of parameters for a given command in the selected menu.
 *
 * @param selector The current menu selection.
 * @param cmd The command character to look up.
 * @return Number of parameters required for the command, or 0 if not found.
 */
uint8_t SerialMenuClass::getNumberParameters(char cmd)
{
    const MenuItem *selectedMenu = menus[menuSelector];
    size_t menuSize = menuSizes[menuSelector];
    if (selectedMenu != nullptr)
    {
        for (size_t i = 0; i < menuSize; ++i)
        {
            if (selectedMenu[i].cmd == cmd)
            {
                return selectedMenu[i].numParams;
            }
        }
    }
    return 0;
}

/**
 * @brief Prints the current menu to specified devices.
 *
 * @param d Target device(s) (MAIN_MENU)
 */
void SerialMenuClass::printMenu(MenuSelect selector)
{
    printf("Serial Menu:\n");
    menuSelector = selector;
    const MenuItem *selectedMenu = menus[selector];
    size_t menuSize = menuSizes[selector];
    if (selectedMenu != nullptr)
    {
        for (size_t i = 0; i < menuSize; ++i)
        {
            printf("%c", selectedMenu[i].cmd);
            printf(" - ");
            printf("%s\n", selectedMenu[i].description);
        }
    }
}

SerialMenuClass SerialMenu;
