/**
 * @file WebSockets.cpp
 * @brief Garage websocket handlers.
 */

#ifdef GARAGE

#include <ArduinoJson.h>

#include "Clock.h"
#include "Garage/WebSockets.h"
#include "Garage/SocketCodes.h"

#define NUM_EVENT_HEADERS 3
const char *eventHeaders[NUM_EVENT_HEADERS] = {"TimeStamp", "Event", "-"};

#define NUM_VARS 2
const char *vNames[NUM_VARS] = {"local Time", "epoch"};

/**********************************************************************************/

/**
 * @brief Add garage-specific variables to a JSON payload.
 *
 * @param variables JSON object to populate with project variables.
 */
void addProjectVariables(JsonObject variables)
{
}

// void handlerResponse(DynamicJsonDocument doc)
// {
//     doc["code"] = SocketCode::REQ_RES;

//     for (int i = 0; i < NUM_VARS; i++)
//         doc["variableNames"][i] = vNames[i];

//     for (int i = 0; i < NUM_EVENT_HEADERS; i++)
//         doc["eventHeaders"][i] = eventHeaders[i];

//     doc["variables"][LOCALTIME] = getLocalTime();
//     doc["variables"][EPOCH] = getEpoch();
// }

/**********************************************************************************/

/**
 * @brief Handle an incoming WebSocket message for the Garage module.
 *
 * Responds with a CODE_READ payload.
 */
void handleMessage()
{
    doc["code"] = CODE_READ;
}
#endif
