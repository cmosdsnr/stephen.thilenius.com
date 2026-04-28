/**
 * @file WebSerial.cpp
 * @brief WebSerial and websocket data helpers.
 */

#include <AsyncWebSocket.h>
#include <LittleFS.h>
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

#define EVENT_LOG_FILE "/eventlog.txt"
#define SERIAL_LOG_FILE "/seriallog.txt"

std::vector<uint32_t> pendingClients;
std::deque<String> eventHistory;
static int _logFileLines = 0;

std::deque<String> serialHistory;
static int _serialLogLines = 0;
static String _serialLineBuffer;

/**
 * @brief Loads the persisted event log from LittleFS into the in-memory history.
 *
 * Reads up to 50 lines from the event log file on boot. Call once after
 * LittleFS is mounted.
 */
void loadEventLog()
{
    if (!LittleFS.exists(EVENT_LOG_FILE))
        return;
    fs::File f = LittleFS.open(EVENT_LOG_FILE, "r");
    if (!f) return;
    while (f.available())
    {
        String line = f.readStringUntil('\n');
        line.trim();
        if (line.length() > 0)
            eventHistory.push_back(line);
    }
    f.close();
    // Keep only the last 50 in memory; _logFileLines tracks actual file size
    _logFileLines = eventHistory.size();
    while (eventHistory.size() > 50)
        eventHistory.pop_front();
    printf("📋 Loaded %d events from log\n", (int)eventHistory.size());
}

/**
 * @brief Rewrites the event log file from the current in-memory deque (50 entries).
 *
 * Called when the file has grown to 100 lines. Resets the line counter to 50.
 */
static void rewriteEventLog()
{
    fs::File f = LittleFS.open(EVENT_LOG_FILE, "w");
    if (!f) return;
    for (const String &evt : eventHistory)
        f.println(evt);
    f.close();
    _logFileLines = eventHistory.size();
}

/**
 * @brief Appends a single event line to the log file.
 *
 * Fast path used for every new event. When the file reaches 100 lines it is
 * trimmed back to 50 via a full rewrite, so rewrites happen every 50 events.
 */
static void appendEventLog(const String &evt)
{
    fs::File f = LittleFS.open(EVENT_LOG_FILE, "a");
    if (!f) return;
    f.println(evt);
    f.close();
    _logFileLines++;
    if (_logFileLines >= 100)
        rewriteEventLog(); //!< trim file back to 50 — rewrite every 50 appends
}

/**
 * @brief Loads the persisted serial log from LittleFS into the in-memory history.
 *
 * Reads up to 50 lines from the serial log file on boot. Call once after
 * LittleFS is mounted.
 */
void loadSerialLog()
{
    if (!LittleFS.exists(SERIAL_LOG_FILE))
        return;
    fs::File f = LittleFS.open(SERIAL_LOG_FILE, "r");
    if (!f) return;

    // Load previous session's persisted lines
    std::deque<String> loaded;
    while (f.available())
    {
        String line = f.readStringUntil('\n');
        line.trim();
        if (line.length() > 0)
            loaded.push_back(line);
    }
    f.close();
    int fileLines = (int)loaded.size();

    while (loaded.size() > 50)
        loaded.pop_front();

    // Append current boot's early lines (recorded before LittleFS mounted, so
    // they are in serialHistory already but not yet in the file)
    for (const String &line : serialHistory)
        loaded.push_back(line);

    while (loaded.size() > 50)
        loaded.pop_front();

    serialHistory = std::move(loaded);
    _serialLogLines = fileLines; //!< tracks file size for rewrite trigger
    printf("📋 Loaded %d serial lines from log\n", (int)serialHistory.size());
}

static void rewriteSerialLog()
{
    fs::File f = LittleFS.open(SERIAL_LOG_FILE, "w");
    if (!f) return;
    for (const String &line : serialHistory)
        f.println(line);
    f.close();
    _serialLogLines = serialHistory.size();
}

static void appendSerialLog(const String &line)
{
    fs::File f = LittleFS.open(SERIAL_LOG_FILE, "a");
    if (!f) return;
    f.println(line);
    f.close();
    _serialLogLines++;
    if (_serialLogLines >= 100)
        rewriteSerialLog(); //!< trim file back to 50 every 50 appends
}

static void recordSerialLine(const String &line)
{
    serialHistory.push_back(line);
    if (serialHistory.size() > 50)
        serialHistory.pop_front();
    appendSerialLog(serialHistory.back());
}

/**
 * @brief Prints all events currently in the in-memory history to the serial console.
 */
void printEventLog()
{
    Report.printf("📋 Event log (%d entries):\n", (int)eventHistory.size());
    int i = 1;
    for (const String &evt : eventHistory)
        Report.printf("  %2d: %s\n", i++, evt.c_str());
}

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
    if (eventHistory.size() > 50)
        eventHistory.pop_front(); //!< keep in-memory deque at 50

    appendEventLog(eventHistory.back()); //!< file grows to 100 then rewrites to 50

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
 * It sends system variables, ESP info, WiFi status, menus, and then history
 * to bring the client up to speed with the current system state.
 *
 * Critical data (menus, variables) is sent first so it always arrives even
 * when history replay floods the WebSocket send queue.
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

            // 1. Send critical system state first — history replay below can fill
            //    the send queue, causing later messages to be silently dropped.
            sendAllVariables(client);
            client->text(str); //!< sendAllVariables only serialises; send here
            delay(10);

            sendESPInfo(client);
            delay(10);
            sendWifiInfo(client);
            delay(10);
            sendMenus(client);
            delay(10);

            // 2. Trigger tabs to refresh their specific variables if needed
            tabs->initializeVariables();
        }
    }
    pendingClients.clear();
}

/**
 * @brief Writes a raw data buffer to all connected WebSocket clients as serialized JSON.
 *
 * Also accumulates bytes into line-buffered serial history so new clients can
 * receive a replay. Records even when no clients are connected.
 *
 * @param buffer Pointer to the data buffer to send
 * @param len Number of bytes in the buffer
 * @return Number of bytes written.
 */
size_t writeWebSerial(const uint8_t *buffer, size_t len)
{
    //! Accumulate bytes into lines and persist to history
    for (size_t i = 0; i < len; i++)
    {
        char c = (char)buffer[i];
        if (c == '\n')
        {
            _serialLineBuffer.trim();
            if (_serialLineBuffer.length() > 0)
            {
                recordSerialLine(_serialLineBuffer);
                _serialLineBuffer = "";
            }
        }
        else if (c != '\r')
        {
            _serialLineBuffer += c;
        }
    }

    if (ws.count() == 0)
        return len; //!< still return len so Report doesn't think write failed
    SerialToJson(buffer, len);
    ws.textAll(str);
    return len;
}

/**
 * @brief Serializes the in-memory serial history (up to 50 lines) to a JSON string.
 *
 * Returns `{"lines":["...", ...]}`.
 *
 * @return JSON string
 */
String getSerialLogJson()
{
    DynamicJsonDocument resp(8192);
    resp["code"] = "serialLog";
    JsonArray lines = resp.createNestedArray("lines");
    for (const String &line : serialHistory)
        lines.add(line);
    String out;
    serializeJson(resp, out);
    return out;
}

/**
 * @brief Serializes the in-memory event history (up to 50 events) to a JSON string.
 *
 * Each stored entry is a complete JSON object; they are parsed and embedded in
 * `{"events":[...]}`.
 *
 * @return JSON string
 */
String getEventLogJson()
{
    DynamicJsonDocument resp(16384);
    resp["code"] = "eventLog";
    JsonArray events = resp.createNestedArray("events");
    for (const String &evt : eventHistory)
    {
        DynamicJsonDocument evtDoc(512);
        if (deserializeJson(evtDoc, evt) == DeserializationError::Ok)
        {
            evtDoc.remove("code"); //!< strip internal WS routing field
            events.add(evtDoc.as<JsonObject>());
        }
        else
            events.add(evt); //!< fallback: embed as raw string
    }
    String out;
    serializeJson(resp, out);
    return out;
}

/**
 * @brief Checks and broadcasts system updates (time, IP, Heap) to WebSerial clients.
 * This is the heartbeat of the WebSerial interface, run periodically from main loop.
 */
void webSerialInfo()
{
    //! Free memory held by stale disconnected WebSocket client objects.
    //! Without this call, each connect/disconnect cycle leaks the TCP PCB + buffers
    //! (~6-7 KB per cycle), causing OOM crashes on repeated reconnects.
    ws.cleanupClients();

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
