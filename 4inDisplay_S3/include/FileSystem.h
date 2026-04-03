#ifndef FILESYSTEM_H
#define FILESYSTEM_H
#include <Arduino.h>

/**
 * @file FileSystem.h
 * @brief File listing and partition helpers.
 */

/**
 * @brief File name and size tuple.
 */
struct FileInfo
{
    String name;
    size_t size;
};

/**
 * @brief Prints generic filesystem information.
 *
 * Shows total and used bytes.
 * @return void
 */
void fileSystemInfo();

/**
 * @brief Caches the LittleFS root file list. Call once at startup and after
 *        any file upload/delete.
 */
void cacheFiles();

/**
 * @brief Returns the cached LittleFS file list (no filesystem access).
 *
 * @return FileInfo* Pointer to array of file info structures
 */
FileInfo *getFiles();

/**
 * @brief Caches the SD card root file list. Call once at startup before the
 *        display takes over the SPI bus.
 */
void cacheSDFiles();

/**
 * @brief Returns the cached SD card file list (no SPI access).
 *
 * @return FileInfo* Pointer to array of file info structures
 */
FileInfo *getSDFiles();

/**
 * @brief Prints the partition table to Serial.
 *
 * Displays partition types, subtypes, addresses, and sizes.
 * @return void
 */
void printPartitionTable();

#endif