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

static String fragmentBuffer; ///< Buffer for assembling fragmented WebSocket frames.
static constexpr size_t WS_MAX_MSG_LEN = 4096; ///< Maximum allowed incoming message size.

/**
 * @brief Handles incoming WebSocket JSON messages.
 *
 * Reassembles fragmented frames, deserializes the JSON payload,
 * and routes the message to the appropriate handler based on the socket code.
 *
 * @param arg Frame metadata (cast to AwsFrameInfo)
 * @param data Raw message data
 * @param len Length of the data in bytes
 * @param client The WebSocket client that sent the message
 */
void handleWebSocketMessage(void *arg, uint8_t *data, size_t len, AsyncWebSocketClient *client)
{
    AwsFrameInfo *info = (AwsFrameInfo *)arg;
    if (info->opcode != WS_TEXT)
        return;

    if (info->index == 0)
        fragmentBuffer = "";

    if (fragmentBuffer.length() + len > WS_MAX_MSG_LEN)
    {
        Serial0.printf("WS message too large (%u bytes), dropping\n",
                       (unsigned)(fragmentBuffer.length() + len));
        fragmentBuffer = "";
        return;
    }

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

/**
 * @brief WebSocket event callback.
 *
 * Dispatches connect, disconnect, and data events from the WebSocket server.
 *
 * @param server The WebSocket server instance
 * @param client The client that triggered the event
 * @param type The event type (connect, disconnect, data, pong, error)
 * @param arg Event-specific argument (frame info for data events)
 * @param data Payload data (for data events)
 * @param len Length of the payload data
 */
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

/**
 * @brief Checks if any WebSocket clients are currently connected.
 *
 * @return true if at least one client is connected, false otherwise.
 */
bool ClientsAreConnected()
{
    if (ws.count() > 0)
        return true;
    else
        return false;
}

/**
 * @brief Initializes the WebSocket server and registers the event handler.
 *
 * @param server The async web server to attach the WebSocket handler to
 */
void initWebSocket(AsyncWebServer *server)
{
    ws.onEvent(onEvent);
    server->addHandler(&ws);
}
