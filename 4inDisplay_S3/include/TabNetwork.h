#ifndef TAB_NETWORK_H
#define TAB_NETWORK_H

#include <Arduino.h>
#include <WiFi.h>
#include <TFT_eSPI.h>
#include "Tab.h"
#include "Networks.h"

/**
 * @file TabNetwork.h
 * @brief WiFi network management tab.
 */

/**
 * @brief Tab page for WiFi network management.
 *
 * allowing the user to scan and connect to WiFi networks.
 */
class TabNetwork : public Tab
{
public:
    /**
     * @brief Constructor.
     *
     * @param tft Display driver
     * @param wifiNetworks Network manager instance
     */
    TabNetwork(TFT_eSPI *tft, Networks *wifiNetworks);

    /** @brief Draw the network tab contents. */
    void draw() override;
    /** @brief Handle touch input. */
    void handle(uint16_t x, uint16_t y, uint32_t lastClick) override;
    /** @brief Update the network tab state. */
    void loop() override;

    /**
     * @brief Checks if IP address is assigned (connected).
     * @return bool True if connected
     */
    bool isConnected() const { return ip != IPAddress(0, 0, 0, 0); }

private:
    TFT_eSPI *_tft;
    Networks *_wifiNetworks;
    bool scanning;
    String ssid = "Connecting...";
    IPAddress ip = IPAddress(0, 0, 0, 0);
    int8_t rssi = 0;
};

#endif // TAB_NETWORK_H