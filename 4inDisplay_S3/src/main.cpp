/**
 * @file main.cpp
 * @brief Application entry point and main loop.
 */

#include <SD.h>
#include <esp_system.h>
#include "DebugServer.h"
#include "Serial.h"
#include "WebSerial.h"
#include "Interrupts.h"
#include "Functions.h"
#include "Display.h"
#include "Buzzer.h"
#include "Tabs.h"
#include "Report.h"
#include "Memory.h"
#include "Clock.h"
#include "FileSystem.h"
#include "devkit_pins.h"
#include "SerialMenu.h"
#include "Ftp.h"
#include "espChipInfo.h"
#include "EpromData.h"
#include "led.h"
#include "I2C.h"
#include "SPIMutex.h"

SemaphoreHandle_t spiMutex = NULL;
SemaphoreHandle_t httpsGuard = NULL;

/**
 * @brief Attempts to connect to the SOCKS proxy.
 *
 * Logic depends on the specific module (Gliderport, etc.).
 */
void trySocks();
#ifdef GLIDERPORT
#include "Gliderport/Gliderport.h"
#include "Gliderport/GliderportTimer.h"
#include "Gliderport/Sensors.h"
#endif

#ifdef GARAGE
#include "Garage/Relays.h"
#include "Garage/Distance.h"
#endif

#ifdef DESK
#include "Desk/Ultimeter.h"
#include "Desk/Shot.h"
#endif

#ifdef SPRINKLER
#include "Sprinkler/Sprinkler.h"
#endif
#ifdef POWERMETER
#include "Power/PowerMeter.h"
#endif

#define NUM_LEDS 1
int i = 0;

Networks *wifiNetworks = new Networks();

/**
 * @brief Arduino setup entry point.
 *
 * Initializes peripherals, filesystem, display, WiFi, and module-specific hardware.
 */
void setup(void)
{
    delay(100);
    //! initializing Serial0 will print with printf and printf
    //! initializing Serial will print with printf only
    //! initializing Serial AND Serial0 will print with printf and printf (same as Serial0 alone)
    //! no initialization will print with printf only

    spiMutex = xSemaphoreCreateMutex();
    httpsGuard = xSemaphoreCreateMutex();

    Serial0.begin(115200);
    Serial0.setTimeout(5000);
    Serial.begin(115200);
    Serial.setTimeout(5000);

    //! ADC_0db ADC_2_5db ADC_6db ADC_11db(DEFAULT)
    analogSetAttenuation(ADC_11db); //!< 0 - 2.5V

    //! Initialize pins
    initializePins();
    setupLed();

    espChipInfo();
    printPartitionTable();
    printf("CPU Frequency set to: %d MHz\r\n", getCpuFrequencyMhz());

    //! must be done before anything that uses I2C
    InitI2C();
    scanI2CDevices();
    startEEprom();
#ifdef DESK
    ultimeter = new Ultimeter();
    shot = new Shot();
#endif
#ifdef GARAGE
    setupDistance();
#endif

    setupSD();
    cacheSDFiles();
    setupLittleFS();
    cacheFiles();
    wifiNetworks->initialize(); //!< read networks from file & scan surroundings

    setupDisplay(); //!< needs filesystem

    setupTabs();

    InitTimerMain();
    buzzerSetup();
    setupPSRAM();

    //! Start server
    printf("Starting server\n");

    StartServer(false);

    trySocks();
    setupFtp();

#ifdef GLIDERPORT
    InitGliderportTimer();
    sensors.initBMP();
    sensors.reset();
    sensors.sampleDht11();
    sensors.sampleBmp();
#endif

#ifdef SPRINKLER
    sprinklerSetup();
#endif
#ifdef POWERMETER
    powerMeterSetup();
#endif
}

/**
 * @brief Arduino main loop.
 *
 * Runs clock, WiFi, serial, tab display, and module-specific loop tasks each cycle.
 */
void loop(void)
{
    static bool block = false;
    clockLoop(); //!< check for time updates
    buzzerLoop();
    loopFtp();
    loopLed();
    WifiLoop(); //!< elegant and serial
    handleSerialCommands();
    if (xSemaphoreTake(spiMutex, portMAX_DELAY))
    {
        tabs->loop(block);
        xSemaphoreGive(spiMutex);
    }

#ifdef GARAGE
    distanceLoop(); //!< update distance every 2sec
    relays->Check();
#endif

#ifdef GLIDERPORT
    gpLoop();
#endif

#ifdef DESK
    ultimeter->loop();
    shot->loop();
#endif

#ifdef SPRINKLER
    sprinklerLoop();
#endif
#ifdef POWERMETER
    block = powerMeterLoop();
#endif

    webSerialInfo();
    wifiNetworks->loop(); //!< keep background scan going, make sure I'm on an available network
}
