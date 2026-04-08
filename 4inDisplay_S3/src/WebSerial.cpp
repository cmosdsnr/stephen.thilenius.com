/**
 * @file WebSerial.cpp
 * @brief WebSerial and websocket data helpers.
 */

#include <AsyncWebSocket.h>
#include "Clock.h"
#include "Serial.h"
#include "HostName.h"
#include "WebSockets.h"
#include "FileSystem.h"
#include "Tabs.h"
#include "Display.h"
#include "Json.h"
#include "Report.h"

#include <vector>
#include <deque>

/**
 * @brief Queue of client IDs waiting to be initialized.
 * Allows the main loop to process new connections safely outside of the ISR.
 */
std::vector<uint32_t> pendingClients;

/**
 * @brief History of system events.
 * Keeps the last 50 events to send to new clients, ensuring they have context.
 */
std::deque<String> eventHistory;

/**
 * @brief Sends an event message to all connected WebSocket clients.
 * Also stores the event in the history buffer for future clients.
 *
 * @param subject Brief title or category of the event
 * @param message Detailed description of the event
 */
void sendEvent(const char *subject, const char *message)
{
    EventToJson(subject, message);
    eventHistory.push_back(String(str));

    // Maintain a rolling buffer of 50 events
    if (eventHistory.size() > 50)
        eventHistory.pop_front();

    // Broadcast to current clients
    if (ws.count() > 0)
        ws.textAll(str);
}

/**
 * @brief Sends a variable update.
 *
 * @param name The name of the variable to update
 * @param value The new value of the variable
 */
void writeVariable(const char *name, String value)
{
    if (ws.count() == 0)
        return; //!< if no clients, don't serialize json
    VariableToJson(name, value);
    ws.textAll(str);
}

/**
 * @brief Sends WiFi configuration and status information.
 *
 * @param client Optional specific client to send to. If NULL, broadcasts to all.
 */
void sendWifiInfo(AsyncWebSocketClient *client)
{
    if (ws.count() == 0)
        return; //!< if no clients, don't serialize json
    WiFiInfoToJson();
    if (client != NULL)
        client->text(str);
    else
        ws.textAll(str);
}

/**
 * @brief Sends the partition table layout.
 *
 * @param client Optional specific client to send to. If NULL, broadcasts to all.
 */
void sendPartitionTable(AsyncWebSocketClient *client)
{
    if (ws.count() == 0)
        return; //!< if no clients, don't serialize json
    PartitionTableToJson();
    if (client != NULL)
        client->text(str);
    else
        ws.textAll(str);
}

/**
 * @brief Sends the list of files in the filesystem.
 * This can be a large payload, so it is only sent on request or connection.
 *
 * @param client Optional specific client to send to. If NULL, broadcasts to all.
 */
void sendFileList(AsyncWebSocketClient *client)
{
    if (ws.count() == 0)
        return; //!< if no clients, don't serialize json
    FileListToJson();
    if (client != NULL)
        client->text(str);
    else
        ws.textAll(str);
}

/**
 * @brief Sends an initial dump of all tracked system variables.
 * Used when a new client connects to populate the UI.
 *
 * @param client Optional specific client to send to. If NULL, broadcasts to all.
 */
void sendAllVariables(AsyncWebSocketClient *client)
{
    if (ws.count() == 0)
        return; //!< if no clients, don't serialize json

    // Force full variable update if sending to a specific client (new connection)
    // Otherwise send only changes (broadcast)
    if (!AllVariablesToJson(client != NULL))
        return;
}

/**
 * @brief Sends SD card information to a WebSocket client.
 *
 * @param client Optional specific client to send to. If NULL, broadcasts to all.
 */
void sendSDInfo(AsyncWebSocketClient *client)
{
    if (ws.count() == 0)
        return; //!< if no clients, don't serialize json
    SDInfoToJson();
    if (client != NULL)
        client->text(str);
    else
        ws.textAll(str);
}

/**
 * @brief Sends ESP32 chip information (model, revision, cores, etc.).
 *
 * @param client Optional specific client to send to. If NULL, broadcasts to all.
 */
void sendESPInfo(AsyncWebSocketClient *client)
{
    if (ws.count() == 0)
        return; //!< if no clients, don't serialize json
    espChipInfoToJson();
    if (client != NULL)
        client->text(str);
    else
        ws.textAll(str);
}

/**
 * @brief Sends the current state of GPIO pins.
 *
 * @param client Optional specific client to send to. If NULL, broadcasts to all.
 */
void sendPinValues(AsyncWebSocketClient *client)
{
    if (ws.count() == 0)
        return; //!< if no clients, don't serialize json
    PinValuesToJson();
    if (client != NULL)
        client->text(str);
}

/**
 * @brief Sends the menu structure for the UI.
 *
 * @param client Optional specific client to send to. If NULL, broadcasts to all.
 */
void sendMenus(AsyncWebSocketClient *client)
{
    if (ws.count() == 0)
        return; //!< if no clients, don't serialize json
    MenusToJson();
    if (client != NULL)
        client->text(str);
    else
        ws.textAll(str);
}

/**
 * @brief Queues a client for full data initialization.
 * Instead of sending all data inside the ISR/event callback, we flag it here.
 * The main loop will pick this up in `processPendingClients`.
 *
 * @param client The client that just connected.
 */
void writeAllData(AsyncWebSocketClient *client)
{
    pendingClients.push_back(client->id()); // to be processed in main loop for safe data transmission
}

/**
 * @brief Processes newly connected WebSocket clients.
 * This function should be called from the main loop to safely send initial data.
 * It sends event history, system variables, ESP info, WiFi status, and menus
 * to bring the client up to speed with the current system state.
 */
void processPendingClients()
{
    if (pendingClients.empty())
        return;

    for (uint32_t id : pendingClients)
    {
        if (ws.hasClient(id))
        {
            AsyncWebSocketClient *client = ws.client(id);

            // 1. Send recent event history first so the log is populated
            for (const String &evt : eventHistory)
            {
                client->text(evt);
                delay(5);
            }

            // 2. Send current system state variables
            sendAllVariables(client);
            client->text(str); //!< ensure flush
            delay(10);         // Yield to prevent WDT issues during heavy transmission

            // 3. Send detailed system information
            sendESPInfo(client);
            delay(10);
            sendWifiInfo(client);
            delay(10);
            sendMenus(client);

            // 4. Trigger tabs to refresh their specific variables if needed
            tabs->initializeVariables();
        }
    }
    pendingClients.clear();
}

/**
 * @brief Writes a raw data buffer to all connected WebSocket clients as serialized JSON.
 *
 * @param buffer Pointer to the data buffer to send
 * @param len Number of bytes in the buffer
 * @return Number of bytes written, or 0 if no clients are connected.
 */
size_t writeWebSerial(const uint8_t *buffer, size_t len)
{
    if (ws.count() == 0)
        return 0; //!< if no clients, don't serialize json
    SerialToJson(buffer, len);
    ws.textAll(str);
    return (len);
}

/**
 * @brief Checks and broadcasts system updates (time, IP, Heap) to WebSerial clients.
 * This is the heartbeat of the WebSerial interface, run periodically from main loop.
 */
void webSerialInfo()
{
    //! Process any pending new connections
    processPendingClients();

    if (ws.count() == 0)
        return; //!< if no clients, don't serialize json
    static uint64_t lastTimeUpdate = 0;

    // Check every 2 seconds for system changes
    if (lastTimeUpdate + 2000 < millis())
    {
        lastTimeUpdate = millis();

        // Broadcast IP address if it changes
        static IPAddress lastIp;
        if (lastIp != WiFi.localIP())
        {
            lastIp = WiFi.localIP();
            writeVariable("IP", WiFi.localIP().toString());
        }

        // Broadcast free heap memory if it changes
        static uint32_t lastHeap = 0;
        if (lastHeap != ESP.getFreeHeap())
        {
            lastHeap = ESP.getFreeHeap();
            writeVariable("Heap", String(ESP.getFreeHeap()));
        }
    }

    // Check every 10 seconds for epoch update
    static uint64_t lastEpoch = 0;
    if (lastEpoch + 10000 < millis())
    {
        lastEpoch = millis();
        writeVariable("Epoch", String(getEpoch()));
    }
}
