/**
 * @file WebSockets.cpp
 * @brief Sprinkler websocket handlers.
 */

#ifdef SPRINKLER_NEW
#include <ArduinoJson.h>
#include <AsyncWebSocket.h>
#include <vector>

#include "DebugServer.h"
#include "devkit_pins.h"
#include "WebSockets.h"
#include "SprinklerNew/SocketCodes.h"
#include "Json.h"
#include "WebSerial.h"

#include "SprinklerNew/Clock.h"
#include "SprinklerNew/Sprinkler.h"
#include "SprinklerNew/Schedule.h"
#include "SprinklerNew/HostName.h"
#include "SprinklerNew/Structs.h"
#include "SprinklerNew/DataFile.h"

void allDataRequest(uint32_t id);
void updateRequest();
void updateRules();
void updateSuspend();

std::vector<SuspendItem> suspendList;

/**
 * @brief Checks whether a specific scheduled event is suspended.
 *
 * @param ch Channel index.
 * @param day Days since boundary (0-13).
 * @param startTime Start time in minutes into the day.
 * @return true if the event is suspended, false otherwise.
 */
bool isSuspended(uint8_t ch, uint8_t day, uint16_t startTime)
{
    for (const SuspendItem &s : suspendList)
    {
        if (s.date >= NUM_DAYS)
            continue; // next cycle — not active yet
        if (s.ch == ch && s.date == day && s.startTime == startTime)
            return true;
    }
    return false;
}

/**
 * @brief Shifts suspension dates forward when the 14-day boundary advances.
 *
 * Entries from the past cycle are removed.
 */
void advanceSuspendBoundary()
{
    for (SuspendItem &s : suspendList)
        s.date = (s.date >= NUM_DAYS) ? s.date - NUM_DAYS : 0xFF;
    suspendList.erase(
        std::remove_if(suspendList.begin(), suspendList.end(),
                       [](const SuspendItem &s)
                       { return s.date == 0xFF; }),
        suspendList.end());
}

const char *vNames[NUM_VARS] = {"local Time", "epoch", "boundary", "getDaysSinceBoundary()", "dayStart"};
const char *eventHeaders[NUM_EVENT_HEADERS] = {"TimeStamp", "millis", "Event"};

/// @brief Duration for manual channel operation (in minutes).
uint16_t manualDuration = 0;
/// @brief Currently active manual channel index (-1 if none).
int8_t manualChannel = -1;
int16_t manualStart = 0;

/**
 * @brief Add project-specific variables to the JSON document.
 * @param variables The JsonObject to add variables to.
 */
void addProjectVariables(JsonObject variables)
{
    // variables["manualDuration"] = manualDuration;
    // variables["manualChannel"] = manualChannel;
}

/**********************************************************************************/
/**
 * @brief Handle module-specific WebSocket messages.
 * @details Processes commands from the client to control sprinkler functions.
 *          Supported commands include:
 *          - UPDATE_CHANNEL: Modify a single channel property.
 *          - REQUEST_ALL_DATA: Send full state data to the client.
 *          - SEQUENCE_CHANNEL: Automatically sequentialize channel run times.
 *          - GLOBAL_UPDATE: Apply settings to all channels for a specific day.
 *          - TURN_ON_CHANNEL: Manually activate a channel.
 *          - TURN_OFF_CHANNEL: Manually deactivate a channel.
 */
void handleMessage()
{
    int code = doc["code"];
    switch (code)
    {
    case ReceiveSocketCodes::UPDATE_ITEMS:
        updateRequest();
        break;

    case ReceiveSocketCodes::REQUEST_ALL_DATA:
        allDataRequest(currentClient->id());
        break;

    case ReceiveSocketCodes::UPDATE_RULES:
        updateRules();
        break;

    case ReceiveSocketCodes::UPDATE_SUSPEND:
        updateSuspend();
        break;

    default:
        sendEvent("handleMessage", ("got unknown code: " + doc.as<String>()).c_str());
        break;
    }
    sendEvent("handleMessage", ("got message: " + doc.as<String>()).c_str());
}

/**
 * @brief Clears all entries from the schedule vector.
 */
void clearSchedule()
{
    schedule.clear();
}

/**
 * @brief Processes a rules update message, rebuilds the schedule, and saves to storage.
 */
void updateRules()
{
    printf("Updating rules...\n");
    clearSchedule();
    JsonArray rules = doc["rules"].as<JsonArray>();
    for (JsonObject rule : rules)
    {
        uint16_t startTime = rule["startTime"].as<uint16_t>();
        uint16_t dayMask = rule["days"].as<uint16_t>();
        JsonArray durations = rule["durations"].as<JsonArray>();
        for (uint8_t j = 0; j < NUM_DAYS; j++)
        {
            if (!(dayMask & (1 << j)))
                continue;
            uint16_t chStart = startTime;
            for (uint8_t ch = 0; ch < NUM_CHANNELS; ch++)
            {
                uint8_t dur = durations[ch].as<uint8_t>();
                if (dur == 0)
                    continue;
                schedule.push_back({j, ch, dur, chStart});
                chStart += dur;
            }
        }
    }

    saveDataFile();

    doc.clear();
    doc["code"] = SendSocketCodes::ACKNOWLEDGE_RULES;
    ws.textAll(doc.as<String>());
}

/**
 * @brief Processes a suspend/unsuspend request from the WebSocket client.
 */
void updateSuspend()
{
    int8_t add = doc["add"].as<int8_t>();
    SuspendItem s = {};

    if (add == -1)
    {
        suspendList.clear();
    }
    else
    {
        JsonObject item = doc["item"];
        s.date = (uint8_t)((item["date"].as<uint32_t>() - (uint32_t)getBoundary()) / 86400);
        s.startTime = item["startTime"].as<uint16_t>();
        s.ch = item["ch"].as<uint8_t>();

        if (add == 1)
        {
            suspendList.push_back(s);
        }
        else
        {
            suspendList.erase(
                std::remove_if(suspendList.begin(), suspendList.end(),
                               [&s](const SuspendItem &x)
                               { return x.ch == s.ch && x.date == s.date && x.startTime == s.startTime; }),
                suspendList.end());
        }
    }

    doc.clear();
    doc["code"] = SendSocketCodes::ACKNOWLEDGE_SUSPEND;
    doc["add"] = add;
    if (add != -1)
    {
        JsonObject o = doc.createNestedObject("item");
        o["date"] = (uint32_t)getBoundary() + (uint32_t)s.date * 86400;
        o["startTime"] = s.startTime;
        o["ch"] = s.ch;
    }
    ws.textAll(doc.as<String>());
}

/**
 * @brief Handles an update-items request to manually activate a channel.
 */
void updateRequest()
{
    JsonObject changes = doc["changes"];
    uint8_t cVal = changes["channel"].as<uint8_t>();
    uint8_t item = changes["item"].as<uint8_t>();
    uint16_t value = changes["value"].as<uint16_t>();

    if (item == ACTIVE)
    {
        if (manualStart != 0)
            stopManual();
        manualChannel = (int8_t)cVal;
        manualDuration = value;

        doc.clear();
        doc["code"] = SendSocketCodes::SEND_ITEMS;
        JsonObject ch = doc.createNestedObject("changes");
        ch["channel"] = cVal;
        ch["item"] = ACTIVE;
        ch["value"] = value;
        ws.textAll(doc.as<String>());
    }
}

/**
 * @brief Adds system time and boundary variables to the JSON document.
 */
void addVariables()
{
    JsonObject variables = doc.createNestedObject("variables");
    char localTimeBuf[12];
    getLocalTime(localTimeBuf, sizeof(localTimeBuf));
    variables["localTime"] = localTimeBuf;
    variables["epoch"] = getEpoch();
    variables["boundary"] = getBoundary();
    variables["daysSinceBoundary"] = getDaysSinceBoundary();
    variables["dayStart"] = getDayStart();
    addProjectVariables(variables);
}

/**
 * @brief Serialize all sprinkler system data to a JSON string.
 * @details Populates the global JSON document with:
 *          - System variables (Time, Epoch, Boundary)
 *          - Channel settings (Duration, Enabled, Active, Start Time)
 *          - Suspension status
 *          - Next watering times
 *          - Global settings per day
 *          Then populates the global JSON document for transmission.
 */
void fillAllData()
{
    //! code, name, variableNames, eventHeader, variables, today, suspend, nextWatering, schedule
    doc.clear();
    doc["code"] = SendSocketCodes::ALL_DATA;
    doc["name"] = REPORT_NAME;

    // for (int i = 0; i < NUM_VARS; i++)
    //     doc["variableNames"][i] = vNames[i];

    for (int i = 0; i < NUM_EVENT_HEADERS; i++)
        doc["eventHeaders"][i] = eventHeaders[i];

    addVariables();
    doc["today"] = getDaysSinceBoundary();
    doc["runningChannel"] = runningChannel;

    for (uint8_t i = 0; i < NUM_CHANNELS; i++)
        for (uint8_t j = 0; j < NUM_SUSPENDS; j++)
            doc["nextWatering"][i][j] = stringifyDate(nextWatering[i][j]);

    JsonArray cdArr = doc.createNestedArray("schedule");
    for (const ScheduleItem &e : schedule)
    {
        JsonObject o = cdArr.createNestedObject();
        o["day"] = e.day;
        o["ch"] = e.channel;
        o["duration"] = e.duration;
        o["start"] = e.start;
    }
}

/**
 * @brief Respond to an HTTP request with the full data set.
 * @details This function allocates a large buffer on the heap to serialize the
 *          entire sprinkler state (schedule, status, variables) and sends it as
 *          an HTML response.
 * @param request The HTTP request object.
 */
void loadData(AsyncWebServerRequest *request)
{
    fillAllData();
    AsyncWebServerResponse *response = request->beginResponse(200, "text/html", doc.as<String>().c_str());
    response->addHeader("Connection", "close");
    request->send(response);
}

/**
 * @brief Send the full data set to a specific WebSocket client.
 * @details Similar to loadData, but sends the serialized JSON string directly
 *          over an existing WebSocket connection.
 * @param id The WebSocket client ID to target.
 */
void allDataRequest(uint32_t id)
{
    fillAllData();
    ws.text(id, doc.as<String>());
}

/**
 * @brief Broadcasts current system variables to all connected WebSocket clients.
 */
void sendVariables()
{
    doc.clear();
    doc["code"] = SendSocketCodes::UPDATE_VARIABLES;
    addVariables();
    ws.textAll(doc.as<String>());
}

int runningChannel = -1;

/**
 * @brief Broadcasts a channel on/off state change to all WebSocket clients.
 *
 * @param channel Channel index that changed.
 * @param on true if the channel was activated, false if deactivated.
 */
void sendOnOff(uint8_t channel, bool on)
{
    printf("sendOnOff: channel %d, on: %s\n", channel, on ? "on" : "off");
    if (on)
        runningChannel = channel;
    else
    {
        if (runningChannel != channel)
            printf("Warning: got on/off for channel %d but running channel is %d\n", channel, runningChannel);
        runningChannel = -1;
    }
    doc.clear();
    doc["code"] = SendSocketCodes::ON_OFF;
    doc["channel"] = channel;
    doc["on"] = on ? 1 : 0;
    ws.textAll(doc.as<String>());
}

#endif
