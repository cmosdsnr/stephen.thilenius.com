/**
 * @file WebSockets.h
 * @brief Sprinkler websocket helpers.
 */

#ifdef SPRINKLER
#include <arduino.h>
#include <ArduinoJson.h>
#include <AsyncWebSocket.h>
#include "Sprinkler/Structs.h"

extern uint16_t manualDuration;
extern int8_t manualChannel;
extern int16_t manualStart;
extern int runningChannel;

/**
 * @brief Update a channel property.
 * @param item Pointer to UpdateData item
 */
void update(UpdateData *item);
/**
 * @brief Update the next watering text.
 * @param channel Channel index
 * @param index Schedule index
 * @param str Text to store
 */
void updateNextWatering(uint8_t channel, uint8_t index, const char *str);
/**
 * @brief Serialize sprinkler data to a string buffer.
 * @param str Output buffer
 */
void dataToString(char *str);
/**
 * @brief Load data and respond to a request.
 * @param request HTTP request
 */
void loadData(AsyncWebServerRequest *request);
/**
 * @brief Add project-specific variables to a JSON payload.
 * @param variables JSON object to populate
 */
void addProjectVariables(JsonObject variables);

/**
 * @brief Broadcasts current system variables to all connected WebSocket clients.
 */
void sendVariables();
/**
 * @brief Check whether a specific scheduled event is suspended.
 * @param ch Channel index
 * @param day Days since boundary (0-13)
 * @param startTime Start time in minutes into the day
 * @return true if suspended
 */
bool isSuspended(uint8_t ch, uint8_t day, uint16_t startTime);
/**
 * @brief Shift suspension dates forward when the 14-day boundary advances.
 * @details Subtracts NUM_DAYS from each entry's date; entries that were in the
 *          current cycle (date < NUM_DAYS) are dropped as they are now in the past.
 *          Call this once each time setBoundaryTime() detects a new cycle.
 */
void advanceSuspendBoundary();

/**
 * @brief Broadcasts a channel on/off state change to all WebSocket clients.
 *
 * @param channel Channel index that changed.
 * @param on true if activated, false if deactivated.
 */
void sendOnOff(uint8_t channel, bool on);
#endif
