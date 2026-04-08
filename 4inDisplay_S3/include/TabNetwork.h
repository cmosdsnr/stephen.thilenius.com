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
 * Displays connection status, signal info, and network details.
 * Supports scanning, saved-network management, manual SSID entry,
 * lowercase keyboard, password reveal, and tap-to-forget (delete mode).
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
    bool _showScanList  = false;
    bool _showSavedList = false;
    String ssid = "Connecting...";
    IPAddress ip = IPAddress(0, 0, 0, 0);
    int8_t rssi = 0;
    bool _connecting = false;  ///< cached connecting state for loop change detection
    bool _apMode     = false;  ///< cached AP mode state for loop change detection

    void drawScanList();
    void drawSavedList();
    void drawKeyboard();
    void redrawPwField();
    void handleKeyboard(uint16_t x, uint16_t y);
    void attemptConnect();

    bool   _showKeyboard  = false;
    bool   _kbNumbers     = false;
    bool   _kbCaps        = true;   ///< produce uppercase letters when true
    bool   _showPw        = false;  ///< reveal password as plain text
    bool   _deleteMode    = false;  ///< saved list: tap-to-forget mode
    bool   _enteringSSID  = false;  ///< manual entry: typing SSID instead of password
    String _kbSSID;
    String _kbPassword;
};

#endif // TAB_NETWORK_H
