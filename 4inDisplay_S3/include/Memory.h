#ifndef MEMORY_H
#define MEMORY_H

#include <SPI.h>

/**
 * @file Memory.h
 * @brief SD, LittleFS, and PSRAM initialization.
 */

extern SPIClass sdSPI;

// Global SD Card variables
extern bool sdCardMounted;
extern uint8_t sdCardType;
extern uint64_t sdCardSizeMB;
extern uint64_t sdUsedBytesMB;

// Cached SD card stats (populated at startup, no SPI access needed after)
extern uint64_t sdCachedUsedMB;
extern uint32_t sdCachedSectorSize;
extern uint64_t sdCachedNumSectors;

/**
 * @brief Initializes the SD card interface.
 * @return void
 */
void setupSD();

/**
 * @brief Initializes the LittleFS file system.
 * @return void
 */
void setupLittleFS();

/**
 * @brief Initializes PSRAM if available.
 * @return void
 */
void setupPSRAM();

#endif