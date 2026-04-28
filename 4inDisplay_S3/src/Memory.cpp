/**
 * @file Memory.cpp
 * @brief SD, LittleFS, and PSRAM initialization.
 */

#include <Arduino.h>
#include <SD.h>
#include <LittleFS.h>
#include "Memory.h"
#include "devkit_pins.h"
#include "Report.h"

SPIClass sdSPI(HSPI);

// Global SD Card variables
bool sdCardMounted = false;
uint8_t sdCardType = CARD_NONE;
uint64_t sdCardSizeMB = 0;
uint64_t sdUsedBytesMB = 0;

// Cached SD card stats
uint64_t sdCachedUsedMB = 0;
uint32_t sdCachedSectorSize = 0;
uint64_t sdCachedNumSectors = 0;

/**
 * @brief Initializes the SD card hardware.
 *
 * Prints card type and size.
 */
void setupSD()
{
    Report.printf("\n");
    sdSPI.begin(TFT_SCLK, TFT_MISO, TFT_MOSI, SD_CS);
    if (!SD.begin(SD_CS, sdSPI, 4000000))
    {
        Report.printf("Card Mount Failed\n");
        sdCardMounted = false;
        return;
    }

    sdCardType = SD.cardType();
    if (sdCardType == CARD_NONE)
    {
        Report.printf("No SD card attached\n");
        sdCardMounted = false;
        return;
    }

    // Success! Card is mounted — cache all stats now before display takes SPI
    sdCardMounted = true;
    sdCardSizeMB = SD.cardSize() >> 20;
    sdCachedUsedMB = SD.usedBytes() >> 20;
    sdCachedSectorSize = SD.sectorSize();
    sdCachedNumSectors = SD.numSectors();

    Report.printf("SD Card Type: ");
    if (sdCardType == CARD_MMC)
    {
        Report.printf("MMC\n");
    }
    else if (sdCardType == CARD_SD)
    {
        Report.printf("SDSC\n");
    }
    else if (sdCardType == CARD_SDHC)
    {
        Report.printf("SDHC\n");
    }
    else
    {
        Report.printf("UNKNOWN\n");
    }

    Report.printf("SD Card Size: %lluMB\n", sdCardSizeMB);
}

/**
 * @brief Formats bytes into a human-readable string (KB, MB, etc).
 *
 * @param bytes Number of bytes
 * @return String Formatted string
 */
String humanReadableSize(const size_t bytes)
{
    if (bytes < 1024)
        return String(bytes) + " B";
    else if (bytes < (1024 * 1024))
        return String(bytes / 1024.0) + " KB";
    else if (bytes < (1024 * 1024 * 1024))
        return String(bytes / 1024.0 / 1024.0) + " MB";
    else
        return String(bytes / 1024.0 / 1024.0 / 1024.0) + " GB";
}

/**
 * @brief Initializes the LittleFS file system.
 *
 * Prints flash size and LittleFS usage statistics.
 */
void setupLittleFS()
{
    //! Initialize LittleFS
    if (!LittleFS.begin(true))
    {
        Report.printf("\nFailed to mount LittleFS\n");
        return;
    }
    //! Check available flash memory
    Report.printf("\nFlash size: %s\n", humanReadableSize(ESP.getFlashChipSize()).c_str());

    //! Get total and used bytes
    size_t totalBytes = LittleFS.totalBytes();
    size_t usedBytes = LittleFS.usedBytes();

    //! Print total and free space
    Report.printf("LittleFS space: %s\n", humanReadableSize(totalBytes).c_str());
    Report.printf("LittleFS Used space: %s\n", humanReadableSize(usedBytes).c_str());
    Report.printf("LittleFS Free space: %s\n\n", humanReadableSize(totalBytes - usedBytes).c_str());
}

/**
 * @brief Initializes PSRAM if available.
 *
 * Performs a test allocation to verify PSRAM is usable.
 */
void setupPSRAM()
{
    //! Initialize PSRAM
    if (!psramInit())
    {
        Report.printf("PSRAM initialization failed.\n");
        return;
    }

    //! Check if PSRAM is found
    if (psramFound())
    {
        Report.printf("\nPSRAM size: %s\n", humanReadableSize(ESP.getPsramSize()).c_str());
        uint8_t *psramBuffer = (uint8_t *)ps_malloc(15 * 512 * 1024);
        if (psramBuffer != NULL)
        {
            free(psramBuffer);
        }
        else
        {
            Report.printf("Failed to allocate memory in PSRAM\n");
        }
    }
    else
    {
        Report.printf("PSRAM not found.\n");
    }
    Report.printf("\n");
}
