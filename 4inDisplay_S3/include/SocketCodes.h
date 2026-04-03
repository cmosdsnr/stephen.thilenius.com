/**
 * @file SocketCodes.h
 * @brief Shared WebSocket codes and project extensions.
 */

/**
 * @brief Includes project-specific socket code definitions.
 */
#include "Gliderport/SocketCodes.h"
#include "Sprinkler/SocketCodes.h"
#include "Desk/SocketCodes.h"
#include "Garage/SocketCodes.h"
#include "Coffee/SocketCodes.h"

// global variables for all projects
#define LOCALTIME 0
#define EPOCH 1

/**
 * @brief Core socket codes used in JSON messages.
 */
typedef enum
{
    SERIAL_CMD = 0,
    VARIABLES,
    EVENT,
    MENUS,
    WIFI,
    ESP_INFO,
    FS_FILES,
    SD_FILES,
    PARTITION,
    PIN_VALUES,
} SocketCode;