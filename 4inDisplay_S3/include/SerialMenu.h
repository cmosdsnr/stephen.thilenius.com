#ifndef SERIALMENU_H
#define SERIALMENU_H

#include <Arduino.h>
#include <array>
#include "ProjectConfig.h"

#define USE_SERIAL 0x01
#define WEB_SERIAL 0x02

/**
 * @file SerialMenu.h
 * @brief Menu definitions and helpers for serial UI.
 */

/**
 * @brief Structure for a single menu item.
 */
struct MenuItem
{
    const char cmd;
    const char *description;
    uint8_t numParams;
    const char *const *params;
};

/**
 * @brief Enum for active menu context (navigation).
 */
enum MenuSelect
{
    MAIN_MENU,
    SSID_MENU,
    SPEC_MENU,
};

const char *const p_freq[] = {"Frequency (Hz)"};
const char *const p_freq_dur[] = {"Frequency (Hz)", "Duration (ms)"};

/**
 * @brief Main menu definition.
 */
constexpr MenuItem menu0[] = {{'1', "SSID menu", 0, nullptr},
#ifdef PROJECT_MENU_LABEL
                              {'2', PROJECT_MENU_LABEL, 0, nullptr},
#endif
                              {'a', "IP Address", 0, nullptr},
                              {'b', "List SPIFFS filesystem", 0, nullptr},
                              {'c', "Wifi Status", 0, nullptr},
                              {'d', "Calibrate touch screen", 0, nullptr},
                              {'e', "QuickBeep", 0, nullptr},
                              {'f', "freq - set beep frequency", 1, p_freq},
                              {'g', "freq ms - play sound", 2, p_freq_dur},
                              {'h', "Restart ESP", 0, nullptr},
                              {'i', "All GPIO input values", 0, nullptr},
                              {'j', "Scan I2C Bus", 0, nullptr},
                              {'k', "Show current time", 0, nullptr},
                              {'l', "Setup time from NTP", 0, nullptr},
                              {'o', "Show all events", 0, nullptr},
                              {'?', "This help", 0, nullptr}};

constexpr MenuItem menu1[] = {{'0', "Main menu", 0, nullptr},
                              {'a', "List SSIDs", 0, nullptr},
                              {'b', "Add SSIDs", 0, nullptr},
                              {'c', "Delete SSID", 0, nullptr},
                              {'d', "", 0, nullptr},
                              {'e', "Scan for networks", 0, nullptr},
                              {'f', "regenerate network file", 0, nullptr},
                              {'?', "This help", 0, nullptr}};

// Project-specific SerialCommands.h is included via ProjectConfig.h above

// Array of pointers to MenuItem arrays
constexpr const MenuItem *menus[] = {menu0, menu1, menu2};

// Array of sizes for each menu
extern const size_t menuSizes[];

class SerialMenuClass
{
public:
    SerialMenuClass();
    ~SerialMenuClass();
    /** @brief Returns the number of parameters expected for a command. */
    uint8_t getNumberParameters(char cmd);
    /** @brief Prints a menu to the active output. */
    void printMenu(MenuSelect selector);
    MenuSelect menuSelector = MAIN_MENU;

private:
};

extern SerialMenuClass SerialMenu;
#endif