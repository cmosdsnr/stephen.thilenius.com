#pragma once
#include <freertos/FreeRTOS.h>
#include <freertos/semphr.h>

/**
 * @file SPIMutex.h
 * @brief Shared SPI bus mutex for coordinating display and SD card access
 *        across Core 0 (AsyncWebServer) and Core 1 (loop).
 */
extern SemaphoreHandle_t spiMutex;
