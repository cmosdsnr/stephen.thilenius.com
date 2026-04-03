/**
 * @file WebSockets.cpp
 * @brief Gliderport websocket handlers.
 */

#ifdef GLIDERPORT

#include <ArduinoJson.h>

#include "Clock.h"
#include "WebSockets.h"
#include "Gliderport/SocketCodes.h"
#include "Gliderport/Sensors.h"
#include "SocketCodes.h"
#include "Json.h"

#define NUM_EVENT_HEADERS 3
const char *eventHeaders[NUM_EVENT_HEADERS] = {"TimeStamp", "Event", "-"};

#define NUM_VARS 14
const char *vNames[NUM_VARS] = {"local Time", "epoch", "roof temp count", "roof temp read", "roof temp ref", "Wind count", "period", "delay Rising", "delay Falling", "sensor count", "humidity", "dht Temp", "bmp Temp", "pressure"};

/**********************************************************************************/
void updateRequest()
{
    doc.clear();
    doc["code"] = SocketCode::REQ_RES;

    for (int i = 0; i < NUM_VARS; i++)
        doc["variableNames"][i] = vNames[i];

    for (int i = 0; i < NUM_EVENT_HEADERS; i++)
        doc["eventHeaders"][i] = eventHeaders[i];

    doc["variables"]["local Time"] = getLocalTime();
    doc["variables"]["epoch"] = getEpoch();
    doc["variables"][ROOF_TEMP_COUNT] = 0;
    doc["variables"][ROOF_TEMP_READ] = 0;
    doc["variables"][ROOF_TEMP_REF] = 0;
    doc["variables"][WIND_COUNT] = 0;
    doc["variables"][WIND_PERIOD] = 0;
    doc["variables"][WIND_RISE_DELAY] = 0;
    doc["variables"][WIND_FALL_DELAY] = 0;
    doc["variables"][SENSOR_COUNT] = 0;
    doc["variables"][SENSOR_HUMIDITY] = 0;
    doc["variables"][SENSOR_DHT_TEMP] = 0;
    doc["variables"][SENSOR_BMP_TEMP] = 0;
    doc["variables"][SENSOR_PRESSURE] = 0;
}

void addProjectVariables(JsonObject variables)
{
    sensors.addAllData(variables);
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
