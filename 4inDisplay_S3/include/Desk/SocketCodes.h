#ifndef DESK_SOCKET_CODES_H
#define DESK_SOCKET_CODES_H

/**
 * @file SocketCodes.h
 * @brief Desk-specific WebSocket codes.
 */

#ifdef DESK

/**
 * @brief Additional socket codes for Desk.
 */
typedef enum
{
    READ = 100
} ExtendedSocketCode;

#endif
#endif