/**
 * @file Serial.cpp
 * @brief Serial command handling and diagnostics.
 */

#include <Arduino.h>
#include <WiFi.h>
#include <SD.h>
#include "Memory.h" // for sdCardMounted
#include "driver/gpio.h"
#include "devkit_pins.h" // For TFT_CS and TOUCH_CS
#include "Report.h"
#include "Serial.h"
#include "Display.h"
#include "Buzzer.h"
#include "WebSerial.h"
#include "FileSystem.h"
#include "SerialMenu.h"
#include "I2C.h"
#include "Clock.h"
#include "WebSerial.h" //!< need sendEvent
#include <cstdlib>

extern Networks *wifiNetworks;

bool debugTaskDone = false; //!< auto turn off debug task
bool turnOnPins = false;
bool pendingI2C = false;

/**
 * @brief Parses data string for freq and duration, then plays sound.
 *
 * @param data String containing "freq duration"
 */
void makeSound(char *data)
{
    uint16_t freq;
    uint16_t ms;
    sscanf(data, "%d %d", &freq, &ms);
    buzz(freq, ms);
    Report.printf("Sound for %d ms at %d Hz\n", ms, freq);
}

/**
 * @brief Sets the global buzzer frequency from data string.
 *
 * @param data String containing the frequency value.
 */
void changeFreq(char *data)
{
    uint16_t freq;
    sscanf(data, "%d", &buzzerFreq);
    Report.printf("Freq set to %d Hz\n", freq);
}

/**
 * @brief Prints current WiFi status to Report.
 */
void reportWiFiStatus()
{
    if (WiFi.status() == WL_CONNECTED)
        Report.print("wifi WL_CONNECTED\n");
    else if (WiFi.status() == WL_NO_SHIELD)
        Report.print("wifi WL_NO_SHIELD\n");
    else if (WiFi.status() == WL_IDLE_STATUS)
        Report.print("wifi WL_IDLE_STATUS\n");
    else if (WiFi.status() == WL_NO_SSID_AVAIL)
        Report.print("wifi WL_NO_SSID_AVAIL\n");
    else if (WiFi.status() == WL_SCAN_COMPLETED)
        Report.print("wifi WL_SCAN_COMPLETED\n");
    else if (WiFi.status() == WL_CONNECT_FAILED)
        Report.print("wifi WL_CONNECT_FAILED\n");
    else if (WiFi.status() == WL_CONNECTION_LOST)
        Report.print("wifi WL_CONNECTION_LOST\n");
    else if (WiFi.status() == WL_DISCONNECTED)
        Report.print("wifi WL_DISCONNECTED\n");
    else
        Report.print("wifi status unknown\n");
}

/**
 * @brief Prints the digital state of all valid GPIO pins.
 *
 * Formats output in rows of 8 pins.
 */
void gpioInputValues()
{
    String s = "";
    for (int i = 0; i < 44; i++)
    {
        if (i % 8 == 0)
        {
            s += "\r\npin ";
            if (i < 10)
                s += " ";
            s += i;
            s += "-";
            if (i < 3)
                s += " ";
            s += (i + 7);
            s += ": ";
        }
        if (GPIO_IS_VALID_GPIO((gpio_num_t)i))
            s += digitalRead(i);
        else
            s += "X";
        s += " ";
    }
    s += "\r\n";
    Report.print(s);
}

/**
 * @brief Interactive prompt to add a new WiFi network.
 *
 * Reads SSID and Password from Serial input and adds it to the network list.
 */
void newNetwork()
{
    char s[32], p[32];
    uint8_t i = 0, j = 0;
    char c;

    Report.printf("New SSID:");
    while (1)
    {
        if (Serial0.readBytes(&c, 1) == 1)
        {
            if (c == '\b' || c == 0x7F)
            {
                if (i > 0)
                {
                    i--;
                    Report.print("\b \b");
                }
                continue;
            }

            if (c == '\r' || c == '\n')
            {
                s[i] = 0;
                delay(10);
                while (Serial0.available())
                {
                    char next = Serial0.peek();
                    if (next == '\r' || next == '\n')
                        Serial0.read();
                    else
                        break;
                }
                break;
            }

            if (i < 31)
            {
                s[i] = c;
                i++;
                Report.printf("%c", c);
            }
            else
            {
                s[i] = 0;
                break;
            }
        }
    }
    Report.printf("\r\nNew Password:");
    while (1)
    {
        if (Serial0.readBytes(&c, 1) == 1)
        {
            if (c == '\b' || c == 0x7F)
            {
                if (j > 0)
                {
                    j--;
                    Report.print("\b \b");
                }
                continue;
            }

            if (c == '\r' || c == '\n')
            {
                p[j] = 0;
                delay(10);
                while (Serial0.available())
                {
                    char next = Serial0.peek();
                    if (next == '\r' || next == '\n')
                        Serial0.read();
                    else
                        break;
                }
                break;
            }

            if (j < 31)
            {
                p[j] = c;
                j++;
                Report.printf("%c", c);
            }
            else
            {
                p[j] = 0;
                break;
            }
        }
    }
}

#include <SD.h>
/**
 * @brief Handles main menu serial commands.
 *
 * Processes commands like navigating menus, getting status/info,
 * and performing system actions (restart, setup time, etc).
 *
 * @param command Single char command.
 * @param data Optional data string.
 */
void handleSerialCommand(char command, char *data, AsyncWebSocketClient *client = nullptr)
{
    time_t e;
    printf("Command:%c %s\n", command, data);
    switch (command)
    {
    case '1': //!< SSID menu
        SerialMenu.printMenu(SSID_MENU);
        break;
    case '2': //!< Specific menu (Garage/Gliderport/etc)
        SerialMenu.printMenu(SPEC_MENU);
        break;
    case 'a': //!< IP Address
        Report.printf("%s\n", WiFi.localIP().toString().c_str());
        break;
    case 'b': //!< List SPIFFS filesystem
        fileSystemInfo();
        break;
    case 'c': //!< Wifi Status
        reportWiFiStatus();
        sendEvent("WiFi Status", WiFi.status() == WL_CONNECTED ? "Connected" : "Not Connected");
        break;
    case 'd': //!< Calibrate touch screen
        touch_calibrate(true);
        break;
    case 'e': //!< QuickBeep
        quickBeep();
        break;
    case 'f': //!< freq - set beep frequency
        changeFreq(data);
        break;
    case 'g': //!< freq ms - play sound at freq for ms
        makeSound(data);
        break;
    case 'h': //!< Restart ESP
        ESP.restart();
        break;
    case 'i': //!< All GPIO input values
        gpioInputValues();
        break;
    case 'j': //!< Scan I2C Bus
        pendingI2C = true;
        break;
    case 'k': //!< Show current time
    {
        Report.printf("timeSinceEpoch %ld\n", getEpoch());
        time_t t = getEpoch();
        Report.printf("Next shot: %s", asctime(localtime(&t)));
        break;
    }
    case 'l': //!< Setup time from NTP
        setupTime();
        break;
    case 'm':
    {
        if (sdCardMounted)
        {
            // Ensure display is not using SPI
            digitalWrite(TFT_CS, HIGH);   // Explicitly deselect TFT
            digitalWrite(TOUCH_CS, HIGH); // Explicitly deselect Touch

            printf("Attempting to write to /log.txt...\n");
            File f = SD.open("/log.txt", FILE_WRITE);
            if (f)
            {
                f.println("data");
                f.close();
                printf("Data written to /log.txt\n");
            }
            else
            {
                printf("Failed to open /log.txt for writing\n");
            }
        }
        else
        {
            printf("SD Card not mounted\n");
        }
        break;
    }

    case 'n':
        if (sdCardMounted)
        {
            // Ensure display is not using SPI
            digitalWrite(TFT_CS, HIGH);   // Explicitly deselect TFT
            digitalWrite(TOUCH_CS, HIGH); // Explicitly deselect Touch

            if (SD.exists("/log.txt"))
            {
                SD.remove("/log.txt");
                printf("/log.txt removed\n");
            }
            else
            {
                printf("/log.txt does not exist\n");
            }
        }
        else
        {
            printf("SD Card not mounted\n");
        }
        break;
    case '?':
        SerialMenu.printMenu(MAIN_MENU);
        break;
    }
}

/**
 * @brief Handles SSID management menu commands.
 *
 * @param command Single char command.
 * @param data Optional data string.
 */
void handleSsidCommand(char command, char *data, AsyncWebSocketClient *client = nullptr)
{
    char c;

    switch (command)
    {
    case '0': //!< Main menu
        SerialMenu.printMenu(MAIN_MENU);
        break;
    case 'a': //!< List SSIDs
        wifiNetworks->printNetworks();
        break;
    case 'b': //!< Add SSIDs
        newNetwork();
        break;
    case 'c': //!< Delete SSID
        wifiNetworks->printSavedNetworks();
        //! read a number between 0 and i-1
        Report.print("Select network index to delete:");
        //! wait for a number
        while (Serial0.readBytes(&c, 1) != 1)
        {
            delay(100);
        }
        Report.printf("%c\n", c);
        wifiNetworks->removeNetwork((int)c - (int)'0');
        tabs->tab[NETWORK_TAB]->changed = true; //!< force network tab to redraw when it's active again
        break;
    case 'd': //!<

        break;
    case 'e': //!< Scan for networks
        wifiNetworks->scanNetworks();
        break;
    case 'f': //!< regenerate network file
        wifiNetworks->initiateNetworkFile();
        tabs->tab[NETWORK_TAB]->changed = true; //!< force network tab to redraw when it's active again
        break;
    case '?': //!< This help
        SerialMenu.printMenu(SSID_MENU);
        break;
    }
}

/**
 * @brief Routes a command to the appropriate menu handler based on the active menu.
 *
 * @param command Command character.
 * @param data Optional data string.
 * @param menuSelector The currently active menu (MAIN_MENU, SSID_MENU, or SPEC_MENU).
 */
void handleWebSerialCommands(uint8_t command, char *data, uint8_t menuSelector)
{
    if (menuSelector == MAIN_MENU)
        handleSerialCommand(command, data);
    else if (menuSelector == SSID_MENU)
        handleSsidCommand(command, data);
    else if (menuSelector == SPEC_MENU)
        handleCommand(command, data);
}

/**
 * @brief Checks for and processes incoming serial data.
 *
 * If a command is received, it calls handleWebSerialCommands to route it.
 */
void handleSerialCommands()
{
    if (pendingI2C)
    {
        pendingI2C = false;
        scanI2CDevices();
    }
    uint8_t command;
    char data[32];
    data[0] = 0;

    //! times out at 5s, stops at 1 char, returns # of char read
    Stream &serialIn = Serial.available() ? (Stream &)Serial : (Stream &)Serial0;
    if (serialIn.available() && (serialIn.readBytes(&command, 1) == 1))
    {
        //! find the command in the menu
        if (SerialMenu.getNumberParameters(command) > 0)
        {
            size_t len = serialIn.readBytesUntil('\n', data, sizeof(data) - 1);
            data[len] = 0; //!< Ensure null termination
            if (len > 0 && data[len - 1] == '\r')
                data[len - 1] = 0; //!< Strip carriage return
        }

        if (SerialMenu.menuSelector == MAIN_MENU)
            handleSerialCommand(command, data);
        else if (SerialMenu.menuSelector == SSID_MENU)
            handleSsidCommand(command, data);
        else if (SerialMenu.menuSelector == SPEC_MENU)
            handleCommand(command, data);
    }
}
