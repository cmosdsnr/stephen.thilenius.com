/**
 * @file WebSockets.cpp
 * @brief Power meter websocket handlers.
 */

#ifdef POWERMETER

#include <ArduinoJson.h>

#include "Clock.h"
#include "WebSockets.h"
#include "Power/SocketCodes.h"
#include "SocketCodes.h"
#include "Json.h"

/**********************************************************************************/

/**
 * @brief Build a response payload for an update request.
 *
 * Clears the shared JSON document and sets the response code.
 */
void updateRequest()
{
    doc.clear();
    doc["code"] = SocketCode::REQ_RES;
}

/**
 * @brief Add power-meter-specific variables to a JSON payload.
 *
 * @param variables JSON object to populate with project variables.
 */
void addProjectVariables(JsonObject variables)
{
}

/**
 * @brief Handle an incoming WebSocket message for the Power module.
 *
 * Dispatches on the message code to READ, UPDATE, or REQ_RES handlers.
 */
void handleMessage()
{
    int code = doc["code"];
    switch (code)
    {
    case ExtendedSocketCode::READ:
        break;
    case ExtendedSocketCode::UPDATE:
        updateRequest();
        break;
    case SocketCode::REQ_RES:
        break;
    default:
        break;
    }
}
#endif
