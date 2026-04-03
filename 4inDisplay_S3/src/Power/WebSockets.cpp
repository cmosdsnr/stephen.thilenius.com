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
void updateRequest()
{
    doc.clear();
    doc["code"] = SocketCode::REQ_RES;
}

void addProjectVariables(JsonObject variables)
{
}

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
