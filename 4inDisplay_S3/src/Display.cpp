#include <TFT_eSPI.h>
#include <LittleFS.h>
using fs::FS;
#include "Display.h"
#include "Interrupts.h"
#include "DebugServer.h"
#include "Tabs.h"
#include "Report.h"
#include "Networks.h"
#include "esp_task_wdt.h"

/**
 * @file Display.cpp
 * @brief Display initialization and calibration routines.
 */

extern Networks *wifiNetworks; //!< in main.cpp
TFT_eSPI tft = TFT_eSPI();

/**
 * @brief Initializes the display hardware.
 *
 * Sets up SPI pins, initializes TFT driver, calibrates touch,
 * and displays generic splash screen.
 */
void setupDisplay()
{
    //! Set all chip selects high to avoid bus contention during initialisation of each peripheral
    digitalWrite(TOUCH_CS, HIGH); //!< Touch controller chip select (if used)
    digitalWrite(TFT_CS, HIGH);   //!< TFT screen chip select
    digitalWrite(SD_CS, HIGH);    //!< SD card chips select, must use GPIO 5 (ESP32 SS)

    tft.init();
    printf("tft started\n");
    delay(1000);
    tft.setRotation(1); //!< landscape

    touch_calibrate();

    tft.invertDisplay(false);
    tft.fillScreen(TFT_BLACK);
    tft.setTextColor(TFT_WHITE);
    tft.setTextDatum(TL_DATUM);

    tft.setFreeFont(&FreeSerif24pt7b);
    tft.setTextSize(2);
    tft.setCursor(0, 150); //!< Y needs to be lower with free fonts
    tft.println("Initializing...");

    tft.setFreeFont(&FreeSerif12pt7b);
    tft.setTextSize(1);
}

void setupTabs()
{
    tabs = new Tabs(&tft, wifiNetworks);
}

//! This is the file name used to store the touch coordinate
//! calibration data. Change the name to start a new calibration.
#define CALIBRATION_FILE "/TouchCalData4"

//! Set REPEAT_CAL to true instead of false to run calibration
//! again, otherwise it will only be done once.
//! Repeat calibration if you change the screen rotation.
#define REPEAT_CAL false

void touch_calibrate(bool force)
{
    uint16_t calData[7];
    boolean calFileFound = false;

    //! Fix LittleFS initialization
    if (!LittleFS.begin(true)) //!< Add 'true' to format on fail
    {
        Report.print("LittleFS Mount Failed - Formatting...");
        if (!LittleFS.begin(true))
        {
            Report.print("LittleFS Format Failed!");
            //! Use default calibration values
            calData[0] = 350;
            calData[1] = 3450;
            calData[2] = 250;
            calData[3] = 3450;
            calData[4] = 7;
            calData[5] = 0;
            calData[6] = 0;
            tft.setTouch(calData);
            return;
        }
    }

    //! check if calibration file exists and size is correct
    if (LittleFS.exists(CALIBRATION_FILE))
    {
        Report.println("Calibration file found");
        if (REPEAT_CAL || force)
        {
            //! Delete if we want to re-calibrate
            LittleFS.remove(CALIBRATION_FILE);
        }
        else
        {
            fs::File f = LittleFS.open(CALIBRATION_FILE, "r");
            if (f)
            {
                if (f.readBytes((char *)calData, 14) == 14)
                    calFileFound = true;
                f.close();
            }
        }
    }
    else
    {
        Report.println("Calibration file not found");
    }

    if (!force && calFileFound && !REPEAT_CAL)
    {
        //! calibration data valid
        tft.setTouch(calData);
        Report.println("cal File loaded");
    }
    else
    {
        Report.println("Calibration required");

        //! Add delay and watchdog reset before calibration
        delay(1000);
        esp_task_wdt_reset();

        tft.fillScreen(TFT_BLACK);
        tft.setCursor(20, 0);
        tft.setTextFont(2);
        tft.setTextSize(1);
        tft.setTextColor(TFT_WHITE, TFT_BLACK);

        Report.println("Calibration start!");
        tft.println("Touch corners as indicated");

        delay(2000); //!< Give time to read message

        //! Try-catch to handle calibration failure
        Report.println("Starting calibrateTouch...");
        try
        {
            tft.calibrateTouch(calData, TFT_BLUE, TFT_BLACK, 15);
            Report.print("Calibration successful!");
        }
        catch (...)
        {
            Report.print("Calibration failed - using defaults");
            calData[0] = 350;
            calData[1] = 3450;
            calData[2] = 250;
            calData[3] = 3450;
            calData[4] = 7;
            calData[5] = 0;
            calData[6] = 0;
            tft.setTouch(calData);
            return;
        }

        tft.setTextColor(TFT_GREEN, TFT_BLACK);
        tft.println("Calibration complete!");
        Report.println("Calibration complete!");

        //! Store calibration data with error handling
        fs::File f = LittleFS.open(CALIBRATION_FILE, "w");
        if (f)
        {
            if (f.write((const unsigned char *)calData, 14) == 14)
            {
                Report.print("Calibration data saved");
            }
            else
            {
                Report.print("Failed to write calibration data");
            }
            f.close();
        }
        else
        {
            Report.print("Failed to open calibration file for writing");
        }
    }

    if (force)
    {
        tft.fillScreen(TFT_BLACK);
        tft.setTextSize(2);
        tft.setTextColor(TFT_WHITE);
        tft.setCursor(10, 10);
        tft.setTextDatum(TL_DATUM);
        tabs = new Tabs(&tft, wifiNetworks);
    }
}
