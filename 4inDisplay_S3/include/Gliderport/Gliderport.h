/**
 * @file Gliderport.h
 * @brief Gliderport module API.
 */

#ifndef GLIDERPORT_H
#define GLIDERPORT_H

#include <AsyncWebSocket.h>

/**
 * @brief Initialize Gliderport subsystems.
 */
void gpSetup();
/**
 * @brief Run Gliderport loop.
 */
void gpLoop();
/**
 * @brief HTTP handler to ping the device.
 * @param request HTTP request
 */
void pingMe(AsyncWebServerRequest *request);
/**
 * @brief HTTP handler to add data points.
 * @param request HTTP request
 */
void addData(AsyncWebServerRequest *request);
/**
 * @brief Timestamp of the last wind reading.
 */
extern u_int64_t lastWindReading;
#endif