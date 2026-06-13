/**
 * @file SocketCodes.h
 * @brief Shared WebSocket codes and project extensions.
 */

#pragma once

/**
 * @brief Includes project-specific socket code definitions.
 */
#include "ProjectConfig.h"

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

/**
 * @brief Common project extension codes (>= 100).
 *
 * Shared by all projects; a project's handleMessage() decides how to
 * respond. Projects with richer protocols (e.g. Sprinkler) define their
 * own code families in <Project>/SocketCodes.h alongside these.
 */
typedef enum
{
    READ = 100,
    UPDATE,
    REQ_RES
} ExtendedSocketCode;