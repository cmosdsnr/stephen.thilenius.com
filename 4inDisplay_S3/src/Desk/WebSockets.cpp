#ifdef DESK

/**
 * @file WebSockets.cpp
 * @brief Desk-specific WebSocket handlers and JSON responses.
 */

#include <ArduinoJson.h>

#include "Clock.h"
#include "SocketCodes.h"
#include "Desk/WebSockets.h"
#include "Desk/SocketCodes.h"

#define NUM_EVENT_HEADERS 3
const char *eventHeaders[NUM_EVENT_HEADERS] = {"TimeStamp", "Event", "-"};

#define NUM_VARS 2
const char *vNames[NUM_VARS] = {"local Time", "epoch"};

/**********************************************************************************/

/**
 * @brief Adds Desk-specific variables to the shared JSON status object.
 *
 * @param variables JSON object to populate with project variables.
 */
void addProjectVariables(JsonObject variables)
{
}

/**********************************************************************************/

/**
 * @brief Handles incoming WebSocket messages for the Desk module.
 */
void handleMessage()
{
}

/**
 * @brief Emits Desk-specific wind data via WebSerial.
 */
void webSerialWind()
{
}

#endif
