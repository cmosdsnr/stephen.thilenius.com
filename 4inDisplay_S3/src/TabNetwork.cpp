/**
 * @file TabNetwork.cpp
 * @brief Network status and selection tab.
 */

//! #include "EpromSsid.h"
#include "TabNetwork.h"
#include "HostName.h"
#include "Tabs.h"
#include "Report.h"
#include "Buzzer.h"
#include "Networks.h"

#define TOP_MARGIN 10

/**
 * @brief Construct a new Tab Network object.
 *
 * @param tft Display driver
 * @param wifiNetworks Network manager instance
 */
TabNetwork::TabNetwork(TFT_eSPI *tft, Networks *wifiNetworks) : Tab()
{
    name = "Network";
    bgColor = 0xd7ff;
    _tft = tft;
    _wifiNetworks = wifiNetworks;
    nameWidth = _tft->textWidth(name.c_str());
    changed = true;
    scanning = true;
}

/**
 * @brief Draws the network tab UI.
 *
 * Shows IP, SSID, RSSI, and lists available networks.
 */
void TabNetwork::draw()
{
    changed = false;
    _tft->fillRect(0, TAB_H - CORNER_RADIUS, _tft->width(), _tft->height() - TAB_H + CORNER_RADIUS, bgColor);
    _tft->setTextColor(TFT_BLACK);
    //! _tft->setTextSize(2);
    _tft->setCursor(10, TAB_H + TOP_MARGIN);
    _tft->print("IP:");
    _tft->setCursor(10, TAB_H + 25 + TOP_MARGIN);
    _tft->print("SSID:");
    _tft->setCursor(10, TAB_H + 50 + TOP_MARGIN);
    _tft->print("RSSI:");
    _tft->setTextColor(TFT_BLUE);
    _tft->setCursor(75, TAB_H + TOP_MARGIN);
    _tft->print(ip.toString());
    _tft->setCursor(75, TAB_H + 25 + TOP_MARGIN);
    _tft->print(ssid);
    _tft->setCursor(75, TAB_H + 50 + TOP_MARGIN);
    _tft->print(String(rssi) + " dBm");

    const uint16_t top = 180;
    //! _tft->setTextSize(1);
    //! _tft->setFreeFont(&FreeSans9pt7b);
    _tft->setTextFont(1);
    _tft->setCursor(15, top - 10);
    _tft->print("Avl. Networks (tap to Rescan)");
    _tft->fillRoundRect(5, top, 210, 100, 7, TFT_BLACK);
    _tft->setTextColor(TFT_WHITE);

    int i;
    const VisibleNetwork *networks = _wifiNetworks->getVisibleNetworks(i);
    for (int j = 0; j < i; j++)
    {
        _tft->setCursor(15, 10 + top + 12 * j);
        _tft->printf("%s %d dBm", networks[j].ssid.c_str(), networks[j].rssi);
    }

    const SavedNetwork *saved = _wifiNetworks->getSavedNetworks(i);
    _tft->setFreeFont(&FreeSans12pt7b);
    _tft->setTextColor(TFT_BLACK);
    _tft->setCursor(255 + 10, TAB_H + TOP_MARGIN);
    _tft->print("Saved networks:");
    for (int j = 0; j < i; j++)
    {

        _tft->drawRoundRect(255, TAB_H + 20 + 50 * j, 225, 45, 7, TFT_BLACK);

        if (saved[j].visible)
        {
            if (_wifiNetworks->isSelected(j))
            {
                _tft->fillRoundRect(255 + 1, TAB_H + 21 + 50 * j, 223, 43, 7, TFT_CYAN);
                _tft->setTextColor(TFT_BLUE);
            }
            else
            {
                _tft->fillRoundRect(255 + 1, TAB_H + 21 + 50 * j, 223, 43, 7, TFT_GREEN);
                _tft->setTextColor(TFT_BLACK);
            }
        }
        else
        {
            _tft->fillRoundRect(255 + 1, TAB_H + 21 + 50 * j, 223, 43, 7, TFT_LIGHTGREY);
            _tft->setTextColor(TFT_DARKGREY);
        }
        _tft->setCursor(255 + 10, TAB_H + 50 + 50 * j);
        _tft->printf("%s", saved[j].ssid.c_str());
        if (saved[j].visible)
        {
            _tft->setTextFont(1);
            _tft->setCursor(255 + 145, TAB_H + 53 + 50 * j);
            _tft->printf("%d dBm", saved[j].rssi);
            _tft->setFreeFont(&FreeSans12pt7b);
        }
    }
    String str = REPORT_NAME;
    _tft->setCursor(_tft->width() - 10 - _tft->textWidth(str.c_str()), _tft->height() - 10);
    _tft->printf("%s", str.c_str());
}

void TabNetwork::loop()
{
    if (ip != WiFi.localIP() || ssid != _wifiNetworks->getSelectedSSID() || rssi != _wifiNetworks->getSelectedRSSI())
    {
        ip = WiFi.localIP();
        ssid = _wifiNetworks->getSelectedSSID();
        rssi = _wifiNetworks->getSelectedRSSI();
        draw();
    }

    static long lastMillis = millis();
    if (millis() - lastMillis > 5000)
        if (_wifiNetworks->didNetworksChange())
        {
            draw();
            lastMillis = millis();
        }
}

void TabNetwork::handle(uint16_t x, uint16_t y, uint32_t lastClick)
{
    //! screen has been tapped at (x,y)

    //! Rescan networks
    if (x < 220 && y > 200 && lastClick > 2000)
    {
        quickBeep();
        Report.print("Rescan");
        _tft->fillRoundRect(5, 200, 210, 100, 7, TFT_BLACK);
        _tft->setTextColor(TFT_WHITE);
        _tft->setCursor(15, 210);
        _tft->print("Scanning...");

        scanning = true;
        _wifiNetworks->scanNetworks();
        draw();
    }
    //! Select network from saved networks
    if (x > 255 && y > TAB_H && y < TAB_H + 20 + 50 * (_wifiNetworks->getNetworksWithPasswords() + 1))
    {
        int8_t i = (y - TAB_H - 20) / 50;
        //! Report.printf("selected %d\r\n", i);
        //! Report.printf("%s %d %d\r\n", networks[1].ssid.c_str(), networks[1].visible ? 1 : 0, selectedIndex == 1 ? 1 : 0);
        //! Report.printf("%s %d %d\r\n", networks[2].ssid.c_str(), networks[2].visible ? 1 : 0, selectedIndex);
        //! if (&networks[i] != selectedNetwork && i <= networkCount && networks[i].visible)
        //! {
        quickBeep();
        _wifiNetworks->selectNetwork(i);
        draw();
        Report.printf("selected %d %d\r\n", y, i);
        //! }
    }
}
