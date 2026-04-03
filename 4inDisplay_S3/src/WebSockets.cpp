/**
 * @file WebSockets.cpp
 * @brief WebSocket event handling and routing.
 */

#include <ArduinoJson.h>
#include <AsyncWebSocket.h>
#include "DebugServer.h"
#include "devkit_pins.h"
#include "WebSockets.h"
#include "SocketCodes.h"
#include "Clock.h"
#include "Json.h"
#include "Serial.h"
#include "WebSerial.h"

AsyncWebSocket ws("/ws");
AsyncWebSocketClient *currentClient = NULL;

/**
 * @brief Handles incoming WebSocket JSON messages.
 */
static String fragmentBuffer;

void handleWebSocketMessage(void *arg, uint8_t *data, size_t len, AsyncWebSocketClient *client)
{
    AwsFrameInfo *info = (AwsFrameInfo *)arg;
    if (info->opcode != WS_TEXT)
        return;

    if (info->index == 0)
        fragmentBuffer = "";

    fragmentBuffer.concat((char *)data, len);

    if (!info->final)
        return;

    currentClient = client;

    doc.clear();
    DeserializationError error = deserializeJson(doc, fragmentBuffer);
    if (error)
    {
        Serial0.println(fragmentBuffer);
        Serial0.println(F("deserializeJson() failed: "));
        Serial0.println(error.f_str());
        fragmentBuffer = "";
        return;
    }
    int code = doc["code"];
    switch (code)
    {
    case SocketCode::SERIAL_CMD:
    {
        MenuSelect selector = doc["selector"];
        uint8_t cmd = doc["cmd"];
        String data = doc["data"];
        handleWebSerialCommands(cmd, (char *)data.c_str(), selector);
        break;
    }
    case SocketCode::VARIABLES:
        sendAllVariables(client);
        break;
    case SocketCode::MENUS:
        sendMenus(client);
        break;
    case SocketCode::WIFI:
    {
        if (doc.containsKey("action") && doc.containsKey("ssid"))
        {
            //! if action == remove, remove saved network
            String action = doc["action"];
            if (action == "remove")
                wifiNetworks->removePassword(doc["ssid"].as<String>());
            if (action == "add" && doc.containsKey("password"))
                wifiNetworks->addPassword(doc["ssid"].as<String>(), doc["password"].as<String>());
        }
        sendWifiInfo(client);
        break;
    }
    case SocketCode::ESP_INFO:
        sendESPInfo(client);
        break;
    case SocketCode::FS_FILES:
        sendFileList(client);
        break;
    case SocketCode::SD_FILES:
        sendSDInfo(client);
        break;
    case SocketCode::PARTITION:
        sendPartitionTable(client);
        break;
    case SocketCode::PIN_VALUES:
        sendPinValues(client);
        break;
    default:
        handleMessage(); //!< compile specific function
        break;
    }
    fragmentBuffer = "";
}

void onEvent(AsyncWebSocket *server, AsyncWebSocketClient *client, AwsEventType type,
             void *arg, uint8_t *data, size_t len)
{
    switch (type)
    {
    case WS_EVT_CONNECT:
        printf("WebSocket client #%u connected from %s\n", client->id(), client->remoteIP().toString().c_str());
        writeAllData(client);
        break;
    case WS_EVT_DISCONNECT:
        printf("WebSocket client #%u disconnected\n", client->id());
        break;
    case WS_EVT_DATA:
        handleWebSocketMessage(arg, data, len, client);
        break;
    case WS_EVT_PONG:
    case WS_EVT_ERROR:
        break;
    }
}

bool ClientsAreConnected()
{
    if (ws.count() > 0)
        return true;
    else
        return false;
}

void initWebSocket(AsyncWebServer *server)
{
    ws.onEvent(onEvent);
    server->addHandler(&ws);
}
