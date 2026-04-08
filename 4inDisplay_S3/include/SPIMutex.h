#pragma once
#include <freertos/FreeRTOS.h>
#include <freertos/semphr.h>

/**
 * @file SPIMutex.h
 * @brief Shared SPI bus mutex for coordinating display and SD card access
 *        across Core 0 (AsyncWebServer) and Core 1 (loop).
 */
extern SemaphoreHandle_t spiMutex;

/**
 * @brief Global mutex that serializes all outgoing HTTPS connections.
 *
 * Prevents simultaneous SSL handshakes from exhausting the ~40 KB mbedTLS
 * buffers that each connection needs from internal RAM.  All fetch/send tasks
 * must take this mutex before calling http.begin() and give it back after
 * http.end().
 */
extern SemaphoreHandle_t httpsGuard;
