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
// Project-specific includes come in through ProjectConfig.h (via Tabs.h)

#define NUM_LEDS 1
int i = 0;

Networks *wifiNetworks = new Networks();

// ── Boot diagnostics (survives software reset / crash, cleared on power cycle) ─
RTC_DATA_ATTR static uint32_t _bootCount = 0;
RTC_DATA_ATTR static uint32_t _crashCount = 0;
char bootDiag[80] = ""; //!< formatted boot summary, sent to backend on WiFi connect

static const char *_resetReasonStr(esp_reset_reason_t r)
{
    switch (r)
    {
    case ESP_RST_POWERON:
        return "PowerOn";
    case ESP_RST_EXT:
        return "ExtPin";
    case ESP_RST_SW:
        return "Software";
    case ESP_RST_PANIC:
        return "Panic";
    case ESP_RST_INT_WDT:
        return "IntWDT";
    case ESP_RST_TASK_WDT:
        return "TaskWDT";
    case ESP_RST_WDT:
        return "WDT";
    case ESP_RST_DEEPSLEEP:
        return "DeepSleep";
    case ESP_RST_BROWNOUT:
        return "Brownout";
    default:
        return "Unknown";
    }
}

/**
 * @brief Arduino setup entry point.
 *
 * Initializes peripherals, filesystem, display, WiFi, and module-specific hardware.
 */
void setup(void)
{
    //! Capture reset reason before anything else — RTC vars survive software resets
    esp_reset_reason_t _reason = esp_reset_reason();
    _bootCount++;
    if (_reason == ESP_RST_PANIC || _reason == ESP_RST_INT_WDT ||
        _reason == ESP_RST_TASK_WDT || _reason == ESP_RST_WDT)
        _crashCount++;
    snprintf(bootDiag, sizeof(bootDiag), "%s boots=%lu crashes=%lu heap=%lu",
             _resetReasonStr(_reason), _bootCount, _crashCount,
             (unsigned long)ESP.getFreeHeap());

    delay(100);
    spiMutex = xSemaphoreCreateMutex();
    httpsGuard = xSemaphoreCreateMutex();

    Serial0.begin(115200);
    Serial0.setTimeout(5000);
    Serial.begin(115200);
    Serial.setTimeout(5000);

    Report.printf("🔁 Boot: %s\n", bootDiag);

    //! ADC_0db ADC_2_5db ADC_6db ADC_11db(DEFAULT)
    analogSetAttenuation(ADC_11db); //!< 0 - 2.5V

    //! Initialize pins
    initializePins();
    setupLed();

    espChipInfo();
    printPartitionTable();
    Report.printf("CPU Frequency set to: %d MHz\r\n", getCpuFrequencyMhz());

    //! must be done before anything that uses I2C
    InitI2C();
    scanI2CDevices();
    startEEprom();
    PROJECT_EARLY_SETUP();

    setupSD();
    cacheSDFiles();
    setupLittleFS();
    loadEventLog();  //!< restore event history from flash before anything else logs
    loadSerialLog(); //!< restore serial terminal history from flash
    cacheFiles();
    wifiNetworks->initialize(); //!< read networks from file & scan surroundings

    setupDisplay(); //!< needs filesystem

    setupTabs();

    InitTimerMain();
    buzzerSetup();
    setupPSRAM();

    //! Start server
    Report.printf("Starting server\n");

    StartServer(false);

    trySocks();
    setupFtp();

    PROJECT_LATE_SETUP();
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

    PROJECT_LOOP();

    webSerialInfo();
    wifiNetworks->loop(); //!< keep background scan going, make sure I'm on an available network
}
