/**
 * @file TabStatus.h
 * @brief Gliderport status tab declaration.
 */

#ifndef TAB_STATUS_H
#define TAB_STATUS_H

#include <Arduino.h>
#include <TFT_eSPI.h>
#include "Tab.h"
#include "Networks.h"

/**
 * @brief Gliderport status UI tab.
 */
class TabStatus : public Tab
{
public:
    /**
     * @brief Create a status tab.
     * @param tft Display driver
     * @param wifiNetworks Network manager
     */
    TabStatus(TFT_eSPI *tft, Networks *wifiNetworks);
    /**
     * @brief Initialize tab state.
     */
    void initialize();
    /**
     * @brief Draw the status screen.
     */
    void draw() override;
    /**
     * @brief Handle touch input.
     * @param x Touch x
     * @param y Touch y
     * @param lastClick Milliseconds since last click
     */
    void handle(uint16_t x, uint16_t y, uint32_t lastClick) override;
    /**
     * @brief Per-loop updates for the tab.
     */
    void loop() override;

private:
    TFT_eSPI *_tft;
    Networks *_wifiNetworks;
    uint32_t update;
    IPAddress ip;
    IPAddress camera1Ip;
    IPAddress camera2Ip;
    String ssid = "Connecting...";
    int8_t rssi = 0;
    uint8_t *myMac;
    uint8_t *camera1Mac;
    uint8_t *camera2Mac;
    bool camera1ValidIP = false, camera1MacAgrees = false;
    bool camera2ValidIP = false, camera2MacAgrees = false;
};

#endif