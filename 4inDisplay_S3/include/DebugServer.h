#ifndef SERVER_H
#define SERVER_H

#include <ESPmDNS.h>   // alows nDNS lookup
#include <DNSServer.h> // when access-point need DNS
#include <AsyncTCP.h>
#include <ESPAsyncWebServer.h>

extern IPAddress ip;

extern bool Inet; // do we have internet
extern DNSServer dnsServer;
extern AsyncWebServer server;
extern uint32_t apTimeout;
extern String ssid, password;

/**
 * @file DebugServer.h
 * @brief Declarations for the HTTP server and WiFi lifecycle.
 */

/**
 * @brief Starts the web server and WiFi connection.
 *
 * @param WAIT_FOREVER If true, blocks indefinitely until connection is established
 * @return void
 */
void StartServer(bool WAIT_FOREVER = false);

/**
 * @brief Switches to the default fallback network configuration.
 * @return void
 */
void changeDefaultNetwork();

/**
 * @brief Handles WiFi connection maintenance in the main loop.
 *
 * Checks connection status and handles reconnection/AP mode.
 * @return void
 */
void WifiLoop();

#endif