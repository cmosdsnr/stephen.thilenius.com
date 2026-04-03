/**
 * @file TabStatus.cpp
 * @brief Gliderport status tab implementation.
 */

#ifdef GLIDERPORT
#include <Arduino.h>
#include <WiFi.h>
#include "devkit_pins.h"
#include "Gliderport/TabStatus.h"
#include "Tabs.h"
#include "Report.h"
#include "Buzzer.h"
#include "Networks.h"
#include "EpromData.h"

#include "lwip/etharp.h"
#include "lwip/netif.h"

#define LINE_HEIGHT 30
#define RADIUS 90
#define CENTER_X 40 + RADIUS
#define CENTER_Y 320 - 30 - RADIUS

uint8_t *getMacFromIp(IPAddress targetIp)
{
    //! 1. Safety check: Network Interface
    if (netif_default == NULL)
    {
        Report.println("Error: Network interface is NULL");
        return NULL;
    }

    //! 2. Safety check: Subnet Match
    IPAddress localIp = WiFi.localIP();
    IPAddress subnet = WiFi.subnetMask();

    if ((localIp[0] & subnet[0]) != (targetIp[0] & subnet[0]) ||
        (localIp[1] & subnet[1]) != (targetIp[1] & subnet[1]) ||
        (localIp[2] & subnet[2]) != (targetIp[2] & subnet[2]))
    {
        Report.printf("Error: Target IP %s is not on local subnet %s\n",
                      targetIp.toString().c_str(), localIp.toString().c_str());
        return NULL;
    }

    //! 3. Check if it's our own IP
    if (targetIp == localIp)
    {
        static uint8_t localMac[6];
        WiFi.macAddress(localMac);
        return localMac;
    }

    ip4_addr_t ip_addr;
    IP4_ADDR(&ip_addr, targetIp[0], targetIp[1], targetIp[2], targetIp[3]);

    struct eth_addr *ret_eth_addr = NULL;
    const ip4_addr_t *ret_ip_addr = NULL;

    //! 4. Check Cache First
    if (etharp_find_addr(netif_default, &ip_addr, &ret_eth_addr, &ret_ip_addr) != -1)
    {
        return (uint8_t *)ret_eth_addr->addr;
    }

    //! 5. FORCE TRAFFIC
    Report.println("Forcing ARP via TCP attempt...");
    WiFiClient client;
    client.connect(targetIp, 80);
    client.stop();

    //! 6. Wait and Poll
    for (int i = 0; i < 40; i++)
    {
        delay(50);
        if (etharp_find_addr(netif_default, &ip_addr, &ret_eth_addr, &ret_ip_addr) != -1)
        {
            return (uint8_t *)ret_eth_addr->addr;
        }
    }
    return NULL;
}

//! Quick check if host responds on port 80 (just TCP connect, no HTTP exchange)
static bool isHostResponsive(const IPAddress &targetIp)
{
    WiFiClient client;
    bool connected = client.connect(targetIp, 80);
    if (connected)
        client.stop();
    return connected;
    //! return false;
}

TabStatus::TabStatus(TFT_eSPI *tft, Networks *wifiNetworks) : Tab()
{

    name = "Status";
    bgColor = 0xd7ff;
    _tft = tft;
    nameWidth = _tft->textWidth(name.c_str());
    changed = true;
    update = millis();
    _wifiNetworks = wifiNetworks;
    ip.fromString("192.168.1.87"); //!< The other esp32 DESK
    myMac = new uint8_t[6]{0};
    camera1Mac = new uint8_t[6]{0};
    camera2Mac = new uint8_t[6]{0};
    camera1Ip = loadCameraIP(1);
    camera2Ip = loadCameraIP(2);
    camera1ValidIP = isHostResponsive(camera1Ip);
    camera2ValidIP = isHostResponsive(camera2Ip);
    loadCameraMac(1, camera1Mac);
    loadCameraMac(2, camera2Mac);
    changed = true;
}

void TabStatus::initialize()
{
    ip = IPAddress(192, 168, 88, 123);
    uint8_t n[6] = {0xDE, 0xAD, 0xBE, 0xEF, 0xFE, 0x01};
    saveCameraMac(1, n);
    saveCameraIP(1, ip);
    ip = IPAddress(192, 168, 88, 124);
    saveCameraMac(2, n);
    saveCameraIP(2, ip);
    camera1Ip = loadCameraIP(1);
    camera2Ip = loadCameraIP(2);
}

void TabStatus::loop()
{
    static uint64_t lastWiFi = millis();
    static uint64_t lastCamera = millis();
    static uint16_t i = 0;
    if (millis() - lastWiFi > 3000)
    {
        lastWiFi = millis();
        if (ip != WiFi.localIP())
        {
            ip = WiFi.localIP();
            String macStr = WiFi.macAddress();
            sscanf(macStr.c_str(), "%02X:%02X:%02X:%02X:%02X:%02X",
                   &myMac[0], &myMac[1], &myMac[2], &myMac[3], &myMac[4], &myMac[5]);
            changed = true;
            ssid = _wifiNetworks->getSelectedSSID();
            rssi = _wifiNetworks->getSelectedRSSI();
            draw();
        }
    }
    if (millis() - lastCamera > 60000)
    {
        lastCamera = millis();
        uint8_t *mac = new uint8_t[6];

        if (!isHostResponsive(camera1Ip))
        {
            //! Report.printf("Camera1 not responding on HTTP  %s:80", camera1Ip.toString().c_str());
            camera1ValidIP = false;
            camera1MacAgrees = false;
        }
        else
        {
            camera1ValidIP = true;
            mac = getMacFromIp(camera1Ip);
            camera1MacAgrees = (mac[0] != camera1Mac[0] || mac[1] != camera1Mac[1] || mac[2] != camera1Mac[2] ||
                                mac[3] != camera1Mac[3] || mac[4] != camera1Mac[4] || mac[5] != camera1Mac[5]);
        }

        if (!isHostResponsive(camera2Ip))
        {
            //! Report.printf("Camera2 not responding on HTTP  %s:80", camera2Ip.toString().c_str());
            camera2ValidIP = false;
            camera2MacAgrees = false;
        }
        else
        {
            camera2ValidIP = true;
            mac = getMacFromIp(camera2Ip);
            camera2MacAgrees = (mac[0] != camera2Mac[0] || mac[1] != camera2Mac[1] || mac[2] != camera2Mac[2] ||
                                mac[3] != camera2Mac[3] || mac[4] != camera2Mac[4] || mac[5] != camera2Mac[5]);
        }
        draw();
    }
}

void TabStatus::draw()
{
    changed = false;
    _tft->fillRect(0, TAB_H - CORNER_RADIUS, _tft->width(), _tft->height() - TAB_H + CORNER_RADIUS, bgColor);

    _tft->setTextColor(TFT_BLACK);
    _tft->drawLine(10, TAB_H - 13, _tft->width() - 10, TAB_H - 13, TFT_BLACK);
    _tft->drawString("IP:", 120 - _tft->textWidth("IP:"), TAB_H);
    _tft->drawString("SSID:", 120 - _tft->textWidth("SSID:"), TAB_H + LINE_HEIGHT);
    _tft->drawString("RSSI:", 120 - _tft->textWidth("RSSI:"), TAB_H + LINE_HEIGHT * 2);
    _tft->drawString("MAC:", 120 - _tft->textWidth("MAC:"), TAB_H + LINE_HEIGHT * 3);

    _tft->setTextColor(TFT_BLUE);
    _tft->drawString(ip.toString(), 150, TAB_H);
    _tft->drawString(ssid, 150, TAB_H + LINE_HEIGHT);
    _tft->drawString(String(rssi) + " dBm", 150, TAB_H + LINE_HEIGHT * 2);
    if (myMac)
    {
        char macStr[18];
        sprintf(macStr, "%02X:%02X:%02X:%02X:%02X:%02X",
                myMac[0], myMac[1], myMac[2], myMac[3], myMac[4], myMac[5]);
        _tft->drawString(String(macStr), 150, TAB_H + LINE_HEIGHT * 3);
    }
    else
    {
        _tft->drawString("N/A", 150, TAB_H + LINE_HEIGHT * 3);
    }

    _tft->setTextColor(TFT_BLACK);
    _tft->drawLine(10, TAB_H + LINE_HEIGHT * 3 + 17, _tft->width() - 10, TAB_H + LINE_HEIGHT * 3 + 17, TFT_BLACK);
    _tft->drawString("Camera1   IP:", 180 - _tft->textWidth("Camera1   IP:"), TAB_H + LINE_HEIGHT * 4);
    _tft->drawString("MAC:", 180 - _tft->textWidth("MAC:"), TAB_H + LINE_HEIGHT * 5);

    _tft->drawLine(10, TAB_H + LINE_HEIGHT * 5 + 17, _tft->width() - 10, TAB_H + LINE_HEIGHT * 5 + 17, TFT_BLACK);
    _tft->drawString("Camera2   IP:", 180 - _tft->textWidth("Camera2   IP:"), TAB_H + LINE_HEIGHT * 6);
    _tft->drawString("MAC:", 180 - _tft->textWidth("MAC:"), TAB_H + LINE_HEIGHT * 7);
    _tft->drawLine(10, TAB_H + LINE_HEIGHT * 7 + 17, _tft->width() - 10, TAB_H + LINE_HEIGHT * 7 + 17, TFT_BLACK);

    _tft->setTextColor(TFT_BLUE);

    if (!camera1ValidIP)
        _tft->fillRect(185, TAB_H + LINE_HEIGHT * 4 - 9, _tft->textWidth(camera1Ip.toString()) + 10, 26, TFT_PINK);
    else
        _tft->fillRect(185, TAB_H + LINE_HEIGHT * 4 - 9, _tft->textWidth(camera1Ip.toString()) + 10, 26, bgColor);
    _tft->drawString(camera1Ip.toString(), 190, TAB_H + LINE_HEIGHT * 4);

    char macStr[20];
    sprintf(macStr, "%02X:%02X:%02X:%02X:%02X:%02X",
            camera1Mac[0], camera1Mac[1], camera1Mac[2],
            camera1Mac[3], camera1Mac[4], camera1Mac[5]);

    if (!camera1MacAgrees)
        _tft->fillRect(185, TAB_H + LINE_HEIGHT * 5 - 9, _tft->textWidth(macStr) + 10, 26, TFT_PINK);
    else
        _tft->fillRect(185, TAB_H + LINE_HEIGHT * 5 - 9, _tft->textWidth(macStr) + 10, 26, bgColor);
    _tft->drawString(String(macStr), 190, TAB_H + LINE_HEIGHT * 5);

    if (!camera2ValidIP)
        _tft->fillRect(185, TAB_H + LINE_HEIGHT * 6 - 9, _tft->textWidth(camera2Ip.toString()) + 10, 26, TFT_PINK);
    else
        _tft->fillRect(185, TAB_H + LINE_HEIGHT * 6 - 9, _tft->textWidth(camera2Ip.toString()) + 10, 26, bgColor);
    _tft->drawString(camera2Ip.toString(), 190, TAB_H + LINE_HEIGHT * 6);

    sprintf(macStr, "%02X:%02X:%02X:%02X:%02X:%02X",
            camera2Mac[0], camera2Mac[1], camera2Mac[2],
            camera2Mac[3], camera2Mac[4], camera2Mac[5]);

    if (!camera2MacAgrees)
        _tft->fillRect(185, TAB_H + LINE_HEIGHT * 7 - 9, _tft->textWidth(macStr) + 10, 26, TFT_PINK);
    else
        _tft->fillRect(185, TAB_H + LINE_HEIGHT * 7 - 9, _tft->textWidth(macStr) + 10, 26, bgColor);
    _tft->drawString(String(macStr), 190, TAB_H + LINE_HEIGHT * 7);
}

void TabStatus::handle(uint16_t x, uint16_t y, uint32_t lastClick)
{
    quickBeep();
    //! screen has been tapped at (x,y)
    draw();
}

#endif
