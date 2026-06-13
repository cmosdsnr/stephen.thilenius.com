/**
 * @file SocketCodes.h
 * @brief Gliderport websocket command codes.
 */

#ifndef GLIDERPORT_SOCKET_CODES_H
#define GLIDERPORT_SOCKET_CODES_H

#ifdef GLIDERPORT

#define ROOF_TEMP_COUNT 2
#define ROOF_TEMP_READ 3
#define ROOF_TEMP_REF 4
#define WIND_COUNT 5
#define WIND_PERIOD 6
#define WIND_RISE_DELAY 7
#define WIND_FALL_DELAY 8
#define SENSOR_COUNT 9
#define SENSOR_HUMIDITY 10
#define SENSOR_DHT_TEMP 11
#define SENSOR_BMP_TEMP 12
#define SENSOR_PRESSURE 13

// READ / UPDATE extension codes come from the shared ExtendedSocketCode
// enum in include/SocketCodes.h.

#endif
#endif