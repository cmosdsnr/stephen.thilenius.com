/**
 * @file WebSockets.cpp
 * @brief Coffee module websocket handlers.
 */

#ifdef COFFEE

#include <ArduinoJson.h>

#include "Clock.h"
#include "Coffee/WebSockets.h"
#include "Coffee/SocketCodes.h"
#include "Json.h"

#define NUM_EVENT_HEADERS 3
const char *eventHeaders[NUM_EVENT_HEADERS] = {"TimeStamp", "Event", "-"};

#define NUM_VARS 2
const char *vNames[NUM_VARS] = {"local Time", "epoch"};

/**********************************************************************************/

/**
 * @brief Add project-specific variables to a JSON payload.
 *
 * @param variables JSON object to populate with Coffee module variables.
 */
void addProjectVariables(JsonObject variables)
{
}

// void handlerResponse(DynamicJsonDocument doc)
// {

//     doc.clear();
//     doc["code"] = SocketCode::REQ_RES;

//     for (int i = 0; i < NUM_VARS; i++)
//         doc["variableNames"][i] = vNames[i];

//     for (int i = 0; i < NUM_EVENT_HEADERS; i++)
//         doc["eventHeaders"][i] = eventHeaders[i];

//     doc["variables"][LOCALTIME] = getLocalTime();
//     doc["variables"][EPOCH] = getEpoch();
// }

/**
 * @brief Handle an incoming WebSocket message for the Coffee module.
 *
 * Populates the shared JSON document with a READ response code.
 */
void handleMessage()
{
    doc["code"] = ExtendedSocketCode::READ;
}
#endif
