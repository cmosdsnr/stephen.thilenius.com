#include <LittleFS.h>
using fs::FS;
#include "Networks.h"
#include "WebSerial.h" //!< need sendEvent
#include "Report.h"    //!< Assuming you use Report for logging
#include "EpromData.h"
#include "HostName.h"
#include <HTTPClient.h>
#include <WiFiClientSecure.h>

/**
 * @file Networks.cpp
 * @brief WiFi network manager implementation.
 */

bool successfulCon = false; //!< record of if we connected properly to WiFi

/**
 * @brief Construct a new Networks object.
 */
Networks::Networks()
{
    count = 0;
    networks = nullptr;
}

/**
 * @brief Destroy the Networks object.
 */
Networks::~Networks()
{
    if (networks)
    {
        delete[] networks;
        networks = nullptr;
    }
}

/**
 * @brief Main network management loop.
 *
 * Processes scan results, retries failed scans, monitors connection state,
 * and auto-connects to available known networks.
 */
void Networks::loop()
{
    uint64_t lastMillis = millis();
    //! check for scans
    processScanResults();

    //! retry a failed scan after 5 seconds, but only when not actively connecting
    if (!connecting && scanFailTime > 0 && millis() - scanFailTime > 5000)
    {
        scanFailTime = 0;
        scanNetworks();
    }

    if (connecting)
    {
        if (WiFi.status() == WL_CONNECTED)
        {
            handleConnectionSuccess();
        }
        else if (millis() - connectStartTime > 15000)
        {
            if (waitForever)
            {
                if (millis() - connectStartTime > 20000)
                    ESP.restart();
            }
            else
            {
                handleConnectionFailure();
            }
        }
        return;
    }

    if (WiFi.status() != WL_CONNECTED && WiFi.getMode() == WIFI_STA)
    {
        //! see if there is a network to connect to
        for (int i = 0; i < count; i++)
            if (networks[i].visible && networks[i].password.length() > 0)
            {
                selectedIndex = i;
                selectedNetwork = &networks[i];
                networksChanged = true;
                wifiConnect();
                break;
            }
    }
}

/**
 * @brief Initializes the network manager.
 *
 * Loads saved networks from file and starts a scan.
 */
void Networks::initialize()
{
    EpromData data = loadWiFiConfig();
    if (data.magicByte == MAGIC_BYTE)
    {
        printf("Fast Connecting to saved network: %s\n", data.ssid);
        WiFi.disconnect(true);
        WiFi.mode(WIFI_STA);
        WiFi.setHostname(REPORT_NAME);
        WiFi.begin(data.ssid, data.password, data.channel, (uint8_t *)data.bssid);
        connecting = true;
        connectStartTime = millis();
    }
    else
    {
        printf("No valid WiFi config in EEPROM, starting normal initialization.\n");
    }

    readNetworkFile();
    scanNetworks();
}

/**
 * @brief Starts an asynchronous WiFi scan.
 */
void Networks::scanNetworks()
{
    scanFailTime = 0;         //!< cancel any pending retry
    WiFi.scanDelete();        //!< clear stale results so we don't get 0 from a cached scan
    scanning = true;
    WiFi.scanNetworks(true);
    Report.print("Starting WiFi Scan...\n");
}

/**
 * @brief Processes the results of the WiFi scan.
 *
 * @return bool True if scan is complete/processed, False if still scanning/busy.
 */
bool Networks::processScanResults()
{
    if (!scanning)
        return true;
    int16_t WiFiScanStatus = WiFi.scanComplete();
    if (WiFiScanStatus == WIFI_SCAN_RUNNING)
    { //!< still scanning
        return false;
    }
    if (WiFiScanStatus == WIFI_SCAN_FAILED)
    { //!< scan failed (e.g. WiFi busy connecting) — reset and retry after a delay
        scanning = false;
        scanFailTime = millis();
        return false;
    }
    else
    { //!< Found Zero or more Wireless Networks
        scanning = false;
        printf("Found %d networks\n", WiFiScanStatus);
        for (uint8_t i = 0; i < WiFiScanStatus; i++)
            addNetwork(WiFi.SSID(i), "", true, WiFi.RSSI(i));
        networksChanged = true; //!< flag for tabNetworks
        return true;
    }
}

/**
 * @brief Returns an array of currently visible networks.
 *
 * @param countOut Reference set to the number of visible networks found.
 * @return VisibleNetwork* Heap-allocated array of visible networks, or nullptr if none.
 */
VisibleNetwork *Networks::getVisibleNetworks(int &countOut)
{
    int visibleCount = 0;
    for (int i = 0; i < count; i++)
    {
        if (networks[i].visible)
            visibleCount++;
    }

    countOut = visibleCount;
    if (visibleCount == 0)
        return nullptr;

    VisibleNetwork *result = new VisibleNetwork[visibleCount];
    int j = 0;
    for (int i = 0; i < count; i++)
    {
        if (networks[i].visible)
        {
            result[j].ssid = networks[i].ssid;
            result[j].rssi = networks[i].rssi;
            j++;
        }
    }

    // Sort by RSSI descending (strongest signal first)
    for (int i = 1; i < visibleCount; i++)
    {
        VisibleNetwork key = result[i];
        int k = i - 1;
        while (k >= 0 && result[k].rssi < key.rssi)
        {
            result[k + 1] = result[k];
            k--;
        }
        result[k + 1] = key;
    }

    return result;
}

/**
 * @brief Returns an array of saved networks that have stored passwords.
 *
 * @param countOut Reference set to the number of saved networks found.
 * @return SavedNetwork* Heap-allocated array of saved networks, or nullptr if none.
 */
SavedNetwork *Networks::getSavedNetworks(int &countOut)
{
    int savedCount = 0;
    for (int i = 0; i < count; i++)
    {
        if (networks[i].password.length() > 0)
            savedCount++;
    }

    countOut = savedCount;
    if (savedCount == 0)
        return nullptr;

    SavedNetwork *result = new SavedNetwork[savedCount];
    int j = 0;
    for (int i = 0; i < count; i++)
    {
        if (networks[i].password.length() > 0)
        {
            result[j].ssid = networks[i].ssid;
            result[j].password = networks[i].password;
            result[j].visible = networks[i].visible;
            result[j].rssi = networks[i].rssi;
            j++;
        }
    }
    return result;
}

/**
 * @brief Checks if the saved network at the given index is the selected network.
 *
 * @param i Index into the saved networks list.
 * @return bool True if the network at index i is selected.
 */
bool Networks::isSelected(int i)
{
    int c = findIndex(i);
    if (c >= 0)
    {
        selectedIndex = c;
        return true;
    }
    return false;
}

/**
 * @brief Selects a saved network by index and initiates a connection.
 *
 * @param i Index into the saved networks list.
 */
void Networks::selectNetwork(int i)
{
    int c = findIndex(i);
    if (c >= 0 && networks[c].visible)
    {
        selectedIndex = c;
        selectedNetwork = &networks[c];
        networksChanged = true; //!< flag for tabNetworks
        wifiConnect();
    }
}

/**
 * @brief Finds the main network list index for the i-th saved network.
 *
 * @param i Index into the saved networks list.
 * @return int Index in the main networks array, or -1 if not found.
 */
int Networks::findIndex(int i)
{
    int countOut;
    SavedNetwork *savedNetworks = getSavedNetworks(countOut);
    if (i < 0 || i >= countOut)
        return -1;
    String ssid = savedNetworks[i].ssid;
    for (int j = 0; j < count; j++)
    {
        if (networks[j].ssid == ssid)
        {
            return j;
        }
    }
    return -1;
}

/**
 * @brief WiFi event callback handler.
 *
 * Reboots the device on disconnection if a previous connection was established.
 *
 * @param event The WiFi event type.
 */
void WiFiEvent(WiFiEvent_t event)
{
    switch (event)
    {
    case SYSTEM_EVENT_STA_DISCONNECTED:
        if (successfulCon)
        { //!< if we were connected before, then we lost connection
            Report.print("Attempting to reboot and reconnect");
            ESP.restart();
        }
        else
        {
        }
        break;
    default:
        break;
    }
}

/**
 * @brief Initiates a WiFi connection to the currently selected network.
 */
void Networks::wifiConnect()
{

    if (selectedNetwork == nullptr)
    {
        Report.println("Error: No network selected to connect to.");
        return;
    }
    WiFi.disconnect(true);
    WiFi.mode(WIFI_STA);

    WiFi.onEvent(WiFiEvent);
    WiFi.setHostname(REPORT_NAME);
    IPAddress local_ip(192, 168, 0, 94);
    IPAddress gateway(192, 168, 0, 1);
    IPAddress subnet(255, 255, 255, 0);
    IPAddress dns1(8, 8, 8, 8);
    IPAddress dns2(8, 8, 4, 4);

    String ssid = selectedNetwork->ssid;
    String password = selectedNetwork->password;
    if (ssid.length() > 0)
    {
        printf("Connecting to SSID: %s with password: %s\n", ssid.c_str(), password.c_str());
        WiFi.begin(ssid.c_str(), password.c_str()); //!< start connecting to WiFi

        connecting = true;
        connectStartTime = millis();
    }
}

/**
 * @brief Handles a failed WiFi connection attempt.
 *
 * Falls back to Access Point mode with a captive portal and mDNS.
 */
void Networks::handleConnectionFailure()
{
    connecting = false;
    _apMode = true;
    selectedIndex = -1;
    selectedNetwork = nullptr;
    networksChanged = true; //!< force display redraw
    if (scanFailTime > 0) scanNetworks(); //!< retry scan that was deferred during connecting
    printf("❌ Wi-Fi failed to connected.\n");
    WiFi.disconnect();
    //! Connect to Wi-Fi network with SSID and password
    //! Remove the password parameter, if you want the AP (Access Point) to be open
    WiFi.mode(WIFI_AP);
    WiFi.softAP("TFT Setup"); //!< no password, second parameter

    //! if DNSServer is started with "*" for domain name, it will reply with
    //! provided IP to all DNS request
    dnsServer.start(DNS_PORT, "*", WiFi.softAPIP());
    apTimeout = 10 * 4; //!< 10 minutes (15s chunks), device reboots after this time unless connected to
    /**use mdns for host name resolution*/
    if (!MDNS.begin(HOST_NAME))
    {
        while (1)
        {
            delay(1000);
        }
    }
    //! Add service to MDNS-SD
    MDNS.addService("http", "tcp", 80);
    Inet = false; //!< we can't reach the database
}

/**
 * @brief Handles a successful WiFi connection.
 *
 * Sets up time, saves connection config to EEPROM, prints network info,
 * and registers the ESP with the remote server.
 */
void Networks::handleConnectionSuccess()
{
    connecting = false;
    _apMode = false;
    Inet = true;
    setupTime();
    //! If fast-connect (EEPROM path) left selectedIndex unset, find the connected SSID in our list
    if (selectedIndex < 0)
    {
        String connectedSsid = WiFi.SSID();
        for (int i = 0; i < count; i++)
        {
            if (networks[i].ssid == connectedSsid)
            {
                selectedIndex = i;
                selectedNetwork = &networks[i];
                break;
            }
        }
    }
    if (scanFailTime > 0) scanNetworks(); //!< retry scan that was deferred during connecting

    printf("\n\nNetwork Configuration:\n");
    printf("----------------------\n");
    printf("         SSID: %s\n", WiFi.SSID().c_str());
    printf("  Wifi Status: %d\n", WiFi.status());
    printf("Wifi Strength: %d dBm\n", WiFi.RSSI());
    printf("          MAC: %s\n", WiFi.macAddress().c_str());
    printf("           IP: %s\n", WiFi.localIP().toString().c_str());
    printf("       Subnet: %s\n", WiFi.subnetMask().toString().c_str());
    printf("      Gateway: %s\n", WiFi.gatewayIP().toString().c_str());
    printf("        DNS 1: %s\n", WiFi.dnsIP(0).toString().c_str());
    printf("        DNS 2: %s\n", WiFi.dnsIP(1).toString().c_str());
    printf("        DNS 3: %s\n", WiFi.dnsIP(2).toString().c_str());

    saveWiFiConfig();

    WiFiClientSecure client;
    client.setInsecure();
    HTTPClient http;
    String url = "https://stephen.stephen-c19.workers.dev/api/esp/register";
    http.begin(client, url);
    int code = http.GET();
    printf("ESP register: %s -> %d\n", url.c_str(), code);
    http.end();
}

/**
 * @brief Adds a network to the list or updates an existing entry.
 *
 * If the SSID already exists, updates its password, visibility, and RSSI.
 * Otherwise, allocates space and appends the new network.
 *
 * @param ssid Network SSID.
 * @param password Network password (empty string if unknown).
 * @param setVisible Whether the network is currently visible in scans.
 * @param rssi Signal strength in dBm.
 * @return bool True on success, false on memory allocation failure.
 */
bool Networks::addNetwork(String ssid, String password, bool setVisible, int rssi)
{
    //! see if the network already exists
    for (int i = 0; i < count; i++)
    {
        if (networks[i].ssid == ssid)
        {
            //! Update existing network
            if (password.length() > 0)
                networks[i].password = password;
            networks[i].visible = setVisible;
            networks[i].rssi = rssi;
            if (WiFi.status() != WL_CONNECTED && !connecting && setVisible && networks[i].password.length() > 0)
            {
                selectedIndex = i;
                selectedNetwork = &networks[i];
                networksChanged = true;
                wifiConnect();
            }
            return true; //!< Updated existing
        }
    }
    //! 1. Allocate a new array with size + 1
    networkStruct *temp = new networkStruct[count + 1];

    if (!temp)
        return false; //!< Memory allocation failed

    //! 2. Copy existing data to new array
    for (int i = 0; i < count; i++)
    {
        temp[i] = networks[i];
        if (i == selectedIndex)
            selectedNetwork = &temp[i];
    }

    //! 3. Add the new item at the end
    temp[count].ssid = ssid;
    if (password.length() > 0)
        temp[count].password = password;

    temp[count].visible = setVisible;
    temp[count].rssi = rssi;

    //! 4. Delete old array and update pointer
    if (networks)
        delete[] networks;
    networks = temp;
    count++;
    return true;
}

/**
 * @brief Adds or updates the password for an SSID and persists the change.
 *
 * @param ssid Network SSID.
 * @param password Network password.
 * @return bool True if the network was added/updated successfully.
 */
bool Networks::addPassword(String ssid, String password)
{
    if (addNetwork(ssid, password, true))
    {
        writeNetworkFile();
        return true;
    }
    return false;
}

/**
 * @brief Removes the stored password for a given SSID.
 *
 * @param ssid Network SSID whose password should be cleared.
 * @return bool True if the password was removed, false if not found or already empty.
 */
bool Networks::removePassword(String ssid)
{
    networkStruct *n = getNetwork(ssid);
    if (n == nullptr)
        return false;
    if (n->password.length() == 0)
        return false;

    n->password = "";
    writeNetworkFile();
    return true;
}

/**
 * @brief Removes the i-th saved network from the list and persists the change.
 *
 * @param i Index into the saved networks list.
 * @return bool True if the network was removed, false if index is invalid or not found.
 */
bool Networks::removeNetwork(uint8_t i)
{
    int countOut;
    SavedNetwork *savedNetworks = getSavedNetworks(countOut);
    if (i < 0 || i >= countOut)
        return false;
    String ssid = savedNetworks[i].ssid;

    //! find the network in the main list
    int indexToRemove = -1;
    for (int j = 0; j < count; j++)
    {
        if (networks[j].ssid == ssid)
        {
            indexToRemove = j;
            break;
        }
    }
    if (indexToRemove == -1)
        return false; //!< not found

    //! Create a new array with size - 1
    networkStruct *temp = new networkStruct[count - 1];
    if (!temp)
        return false; //!< Memory allocation failed

    //! Copy data except the one to remove
    int k = 0;
    for (int j = 0; j < count; j++)
    {
        if (j != indexToRemove)
        {
            temp[k] = networks[j];
            k++;
        }
    }

    //! Delete old array and update pointer
    if (networks)
        delete[] networks;
    networks = temp;
    count--;
    writeNetworkFile();
    Report.printf("Removed network: %s\n", ssid.c_str());
    return true;
}

/**
 * @brief Prints all networks in the list with their SSID, RSSI, and status.
 */
void Networks::printNetworks()
{
    Report.printf("--- Network List (%d) ---\n", count);
    Report.println("IDX   SSID                             RSSI   Saved  Visible Selected");
    for (int i = 0; i < count; i++)
    {
        Report.printf("[%2d]  %-32.32s %-4d   %-5c  %-5c  %c\n",
                      i,
                      networks[i].ssid.c_str(),
                      networks[i].rssi,
                      networks[i].password.length() > 0 ? 'Y' : 'N',
                      networks[i].visible ? 'Y' : 'N',
                      (&networks[i] == selectedNetwork) ? '*' : ' ');
    }
}

/**
 * @brief Prints only saved networks (those with passwords) and their status.
 */
void Networks::printSavedNetworks()
{
    Report.printf("--- Network List (%d) ---\n", count);
    Report.println("IDX   SSID                             RSSI   Saved  Visible Selected");
    for (int i = 0; i < count; i++)
    {
        if (networks[i].password.length() == 0)
            continue;
        Report.printf("[%2d]  %-32.32s %-4d   %-5c  %-5c  %c\n",
                      i,
                      networks[i].ssid.c_str(),
                      networks[i].rssi,
                      networks[i].password.length() > 0 ? 'Y' : 'N',
                      networks[i].visible ? 'Y' : 'N',
                      (&networks[i] == selectedNetwork) ? '*' : ' ');
    }
}

/**
 * @brief Reads saved network credentials from the LittleFS network file.
 *
 * Supports both legacy and current file formats.
 */
void Networks::readNetworkFile()
{
    //! Check existence FIRST to avoid the error log
    if (LittleFS.exists(NETWORK_FILE))
    {
        fs::File f = LittleFS.open(NETWORK_FILE, "r");
        if (f && f.available())
        {

            String line = f.readStringUntil('\n');
            line.trim();

            //! Check if the first line is a legacy index number (all digits)
            bool isNumeric = line.length() > 0;
            for (unsigned int i = 0; i < line.length(); i++)
            {
                if (line.charAt(i) < '0' || line.charAt(i) > '9')
                {
                    isNumeric = false;
                    break;
                }
            }

            //! If it is NOT a number, then it is the first SSID
            if (!isNumeric && line.length() > 0)
            {
                if (f.available())
                {
                    String password = f.readStringUntil('\n');
                    password.trim();
                    addNetwork(line, password, false);
                }
            }

            while (f.available())
            {
                String name = f.readStringUntil('\n');

                //! Safety check: make sure there is a password line following the name
                if (f.available())
                {
                    String password = f.readStringUntil('\n');

                    //! Clean up whitespace (optional but recommended)
                    name.trim();
                    password.trim();

                    addNetwork(name, password, false);
                }
            }
            f.close();
            networksChanged = true; //!< flag for tabNetworks
        }
        else
        {
            Report.println("Failed to open network file for reading");
        }
    }
    else
    {
        Report.println("Network file does not exist, creating default");
        initiateNetworkFile();
    }
}

/**
 * @brief Writes all networks with passwords to the LittleFS network file.
 */
void Networks::writeNetworkFile()
{
    fs::File f = LittleFS.open(NETWORK_FILE, "w");
    if (f)
    {
        for (int i = 0; i < count; i++)
        {
            if (networks[i].password.length() > 0)
            {
                f.println(networks[i].ssid);
                f.println(networks[i].password);
            }
        }
        f.close();
        Report.println("Finished writing network file");
    }
    else
    {
        Report.println("Failed to open network file for writing");
    }
}

/**
 * @brief Creates the network file with default SSID/password entries.
 */
void Networks::initiateNetworkFile()
{
    fs::File f = LittleFS.open(NETWORK_FILE, "w");
    if (f)
    {
        Report.println("Creating default network file");
        f.println("Beelink Secure");
        f.println("1223122312");
        f.println("Thilenius");
        f.println("qwe123qwe");
        f.println("Need4Speed");
        f.println("1223122312");
        f.println("Flytorrey");
        f.println("Shelby2012");
        f.close();
    }
}
