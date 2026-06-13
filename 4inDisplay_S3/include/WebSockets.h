#include <arduino.h>
#include <ArduinoJson.h>
#include <AsyncWebSocket.h>

#include "ProjectConfig.h"

extern AsyncWebSocket ws;
extern DynamicJsonDocument doc;
extern AsyncWebSocketClient *currentClient;

void sendEvent(const char *name, const char *content);

/**
 * @file WebSockets.h
 * @brief Shared WebSocket helpers across modules.
 */

/**
 * @brief Sends a variable update over WebSocket.
 *
 * @param variableNumber Index of variable
 * @param value value string
 * @return void
 */
void updateVariables(uint8_t variableNumber, String value);

/**
 * @brief Sends an event string over WebSocket.
 *
 * @param event Event description
 * @return void
 */
void updateEvent(String event);

/**
 * @brief Checks if any WebSocket clients are connected.
 * @return bool True if at least one client connected
 */
bool ClientsAreConnected();

/**
 * @brief Initializes the WebSocket server.
 * @return void
 */
void initWebSocket(AsyncWebServer *server);

/** @brief Handles variable updates from the socket. */
String handleVariables(uint8_t variableNumber, String value);
/** @brief Handles event updates from the socket. */
String handleEvent(String event);
/** @brief Handles a response payload. */
void handleResponse(DynamicJsonDocument doc);
/** @brief Handles module-specific messages. Weak no-op default in WebSockets.cpp. */
void handleMessage();
/** @brief Adds project-specific variables to a JSON payload. Weak no-op default in WebSockets.cpp. */
void addProjectVariables(JsonObject variables);
