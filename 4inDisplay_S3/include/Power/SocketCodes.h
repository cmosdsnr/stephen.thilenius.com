/**
 * @file SocketCodes.h
 * @brief PowerMeter websocket command codes.
 */

#ifndef POWER_SOCKET_CODES_H
#define POWER_SOCKET_CODES_H

#ifdef POWERMETER

/**
 * @brief PowerMeter websocket extension codes.
 */
typedef enum
{
    READ = 100
} ExtendedSocketCode;

#endif
#endif