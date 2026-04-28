#ifndef Networks_h
#define Networks_h
#include <Arduino.h>
#include <WiFi.h>
#include <ESPmDNS.h>   // alows nDNS lookup
#include <DNSServer.h> // when access-point need DNS
#include "hostname.h"
#include "clock.h"

#define NETWORK_FILE "/networks.txt"
const byte DNS_PORT = 53; // Capture DNS requests on port 53

/**
 * @file Networks.h
 * @brief WiFi network scanning and persistence helpers.
 */

/**
 * @brief Structure holding SSID and Password.
 */
struct SsidPair
{
    String ssid;
    String password;
};

/**
 * @brief Extended network structure with selection state.
 */
struct networkStruct : SsidPair
{
    bool selected;
    bool visible;
    int rssi;
};

/**
 * @brief Structure for a visible WiFi network.
 */
struct VisibleNetwork
{
    String ssid;
    int rssi;
};

/**
 * @brief Structure for a saved/known network.
 */
struct SavedNetwork
{
    String ssid;
    String password;
    bool visible;
    int rssi;
};

/**
 * @brief Class for managing WiFi networks.
 *
 * Handles searching, saving, and selecting WiFi networks.
 */
class Networks
{
public:
    /**
     * @brief Constructor for Networks class.
     */
    Networks();

    /**
     * @brief Destructor for Networks class.
     */
    ~Networks();

    /** @brief Main loop for scanning/connection state. */
    void loop();

    /**
     * @brief Retrieves list of currently visible networks.
     *
     * @param countOut Reference to store the count of networks found
     * @return VisibleNetwork* Pointer to array of visible networks
     */
    VisibleNetwork *getVisibleNetworks(int &countOut);

    /**
     * @brief Retrieves list of saved networks from file.
     *
     * @param countOut Reference to store the count of saved networks
     * @return SavedNetwork* Pointer to array of saved networks
     */
    SavedNetwork *getSavedNetworks(int &countOut);

    /**
     * @brief Selects a network by index.
     *
     * @param i Index of the network to select
     * @return void
     */
    void selectNetwork(int i);

    /**
     * @brief Finds the index of a network.
     *
     * @param i Search parameter (usage depends on implementation)
     * @return int Index of the network
     */
    int findIndex(int i);
    /** @brief Returns true if the network is selected. */
    bool isSelected(int i);

    networkStruct *getNetwork(uint8_t index) const
    {
        if (networks && index < count)
        {
            return &networks[index];
        }
        else
        {
            return nullptr;
        }
    }

    networkStruct *getNetwork(String ssid) const
    {
        for (int i = 0; i < count; i++)
            if (networks[i].ssid == ssid)
                return &networks[i];
        return nullptr;
    }

    /** @brief Prints network list to Serial. */
    void printNetworks();
    /** @brief Prints saved networks to Serial. */
    void printSavedNetworks();
    /** @brief Removes a saved network by index. */
    bool removeNetwork(uint8_t index);
    /** @brief Adds or updates a network entry. */
    bool addNetwork(String ssid, String password, bool setVisible = true, int rssi = 0);
    /** @brief Adds or updates a password for an SSID. */
    bool addPassword(String ssid, String password);
    /** @brief Removes a stored password for an SSID. */
    bool removePassword(String ssid);
    uint8_t getCount() const { return count; }
    /** @brief Starts an async WiFi scan. */
    void scanNetworks();
    /** @brief Processes scan results into the network list. */
    bool processScanResults();
    bool wifiConnected = false;
    /** @brief Creates the networks file if missing. */
    void initiateNetworkFile();
    /** @brief Loads saved networks and starts scanning. */
    void initialize();
    /** @brief Writes the current network list to storage. */
    void writeNetworkFile();
    /** @brief Sends a periodic heartbeat to the backend with uptime and heap info. */
    void sendHeartbeat();

    /** @brief Updates state after successful connection. */
    void handleConnectionSuccess();
    /** @brief Updates state after connection failure. */
    void handleConnectionFailure();
    /** @brief Manually enter AP mode (disconnect and start captive portal). */
    void enterApMode();

    String getSelectedSSID() const
    {
        if (selectedIndex >= 0 && selectedIndex < count)
            return networks[selectedIndex].ssid;
        else
            return "Connecting...";
    }
    int getSelectedRSSI() const
    {
        if (selectedIndex >= 0 && selectedIndex < count)
            return networks[selectedIndex].rssi;
        else
            return 0;
    }
    int getNetworksWithPasswords() const
    {
        int n = 0;
        for (int i = 0; i < count; i++)
        {
            if (networks[i].password.length() > 0)
                n++;
        }
        return n;
    }

    bool didNetworksChange()
    {
        if (networksChanged)
        {
            networksChanged = false;
            return true;
        }
        else
            return false;
    }

    /** @brief True while a connection attempt is in progress. */
    bool isConnecting() const { return connecting; }
    /** @brief True when the device has fallen back to AP mode. */
    bool isApMode() const { return _apMode; }

private:
    bool networksChanged = false, scanning = false, connecting = false, _apMode = false;
    bool eepromConnectAttempt = false;
    unsigned long connectStartTime = 0;
    unsigned long scanFailTime = 0;
    unsigned long lastRescanTime = 0;
    unsigned long lastConnectAttemptTime = 0;
    uint8_t count = 0;
    int8_t selectedIndex = -1;
    networkStruct *selectedNetwork = nullptr;
    networkStruct *networks = nullptr;
    void readNetworkFile();
    void wifiConnect();
    DNSServer dnsServer;
    uint32_t apTimeout = 0; // timer counter for staying in Access Point mode
    bool Inet = false;      // do we have internet
};

#endif
