#ifdef DESK

#include <ArduinoJson.h>

#include "Clock.h"
#include "SocketCodes.h"
#include "Desk/WebSockets.h"
#include "Desk/SocketCodes.h"

#define NUM_EVENT_HEADERS 3
const char *eventHeaders[NUM_EVENT_HEADERS] = {"TimeStamp", "Event", "-"};

#define NUM_VARS 2
const char *vNames[NUM_VARS] = {"local Time", "epoch"};

/**
 * @file WebSockets.cpp
 * @brief Desk-specific WebSocket handlers and JSON responses.
 */

/**********************************************************************************/

void addProjectVariables(JsonObject variables)
{
}

/**********************************************************************************/
void handleMessage()
{
}

void webSerialWind()
{
}

#endif
