#include <Json.h>
#include <SD.h>
#include <map>
#include "SerialMenu.h"
#include "Tabs.h"
#include "FileSystem.h"
#include "Memory.h" // For sdCardMounted, sdCardType, etc.
#include "Clock.h"
#include "HostName.h"
#include "WebSockets.h"
#include "SocketCodes.h"

/**
 * @file Json.cpp
 * @brief JSON serialization for UI and telemetry.
 */

DynamicJsonDocument doc(16384);
char str[4096];

/** =========================================================================
   Serial Stream Group
   ========================================================================= */

/**
 * @brief Adds serial data to the JSON buffer for web output.
 *
 * @param buffer Pointer to data buffer
 * @param len Length of data
 */
void SerialToJson(const uint8_t *buffer, size_t len)
{
    doc.clear();
    doc["code"] = SocketCode::SERIAL_CMD;
    doc["text"] = String((const char *)buffer, len);
    serializeJson(doc, str);
}

/** =========================================================================
   Commands Group
   ========================================================================= */

/**
 * @brief Generates JSON for the menu commands.
 *
 * Creates a list of available commands with descriptions
 * for the web interface.
 *
 * @param menu Array of menu items
 * @param size size of menu array
 */
void MenusToJson()
{
    doc.clear();
    doc["code"] = SocketCode::MENUS;

    JsonArray menusArray = doc.createNestedArray("menus");

    //! Calculate total number of menus defined in SerialMenu.h
    size_t numMenus = sizeof(menus) / sizeof(menus[0]);

    for (size_t m = 0; m < numMenus; m++)
    {
        JsonObject menuObj = menusArray.createNestedObject();
        //! menuObj["id"] = m; // add an id to identify the menu

        JsonArray itemsArray = menuObj.createNestedArray("items");
        const MenuItem *currentMenu = menus[m];
        size_t currentMenuSize = menuSizes[m];

        for (size_t i = 0; i < currentMenuSize; i++)
        {
            JsonObject item = itemsArray.createNestedObject();
            item["cmd"] = String(currentMenu[i].cmd);
            item["description"] = currentMenu[i].description;

            JsonArray params = item.createNestedArray("param");
            if (currentMenu[i].params != nullptr)
            {
                for (int j = 0; j < currentMenu[i].numParams; j++)
                {
                    params.add(currentMenu[i].params[j]);
                }
            }
        }
    }
    serializeJson(doc, str);
}

/** =========================================================================
   Variables Group
   ========================================================================= */

std::map<String, String> _lastVar;

bool variablechanged(const char *name, String value)
{
    if (_lastVar.find(name) != _lastVar.end() && _lastVar[name] == value)
    {
        return false;
    }
    _lastVar[name] = value;
    return true;
}

/**
 * @brief Generates JSON for a single variable update.
 *
 * @param name Variable identifier
 * @param value value string
 */
void VariableToJson(const char *name, String value)
{
    if (variablechanged(name, value))
    {
        doc.clear();
        doc["code"] = SocketCode::VARIABLES;
        JsonObject v = doc.createNestedObject("variables");
        v[name] = value;
        serializeJson(doc, str);
    }
}

/**
 * @brief Serializes all tracked variables to JSON.
 */
bool AllVariablesToJson(bool force)
{
    bool changed = false;
    doc.clear();
    doc["code"] = SocketCode::VARIABLES;
    JsonObject variables = doc.createNestedObject("variables");

    addProjectVariables(variables);

    std::vector<String> keysToRemove;
    for (JsonPair kv : variables)
    {
        String key = kv.key().c_str();
        String value = kv.value().as<String>();

        // Check if changed, update map regardless
        bool varChanged = variablechanged(key.c_str(), value);

        if (varChanged || force)
        {
            changed = true;
        }
        else
        {
            keysToRemove.push_back(key);
        }
    }

    for (const String &key : keysToRemove)
    {
        variables.remove(key);
    }

    if (variablechanged("name", REPORT_NAME) || force)
    {
        changed = true;
        variables["name"] = REPORT_NAME;
    }
    if (variablechanged("IP", WiFi.localIP().toString()) || force)
    {
        changed = true;
        variables["IP"] = WiFi.localIP().toString();
    }
    if (variablechanged("Heap", String(ESP.getFreeHeap())) || force)
    {
        changed = true;
        variables["Heap"] = ESP.getFreeHeap();
    }
    if (variablechanged("Last Reboot", getRebootTime()) || force)
    {
        changed = true;
        variables["Last Reboot"] = getRebootTime();
    }
    if (variablechanged("Epoch", String(getEpoch())) || force)
    {
        changed = true;
        variables["Epoch"] = getEpoch();
    }

    if (!changed)
        return false;

    serializeJson(doc, str);
    return true;
}

/**
 * @brief Serializes an event payload to JSON.
 *
 */
void EventToJson(const char *subject, const char *message)
{
    doc.clear();
    doc["code"] = SocketCode::EVENT;
    doc["time"] = getFullDateTime();
    doc["timestamp"] = getEpoch();
    doc["subject"] = subject;
    doc["description"] = message;
    serializeJson(doc, str);
}

/** =========================================================================
   System Information Group
   ========================================================================= */

/**
 * @brief Generates JSON for WiFi status information.
 *
 * Includes current connection details and scan results
 * if available via WiFiNetworks instance.
 */
void WiFiInfoToJson()
{
    doc.clear();
    doc["code"] = SocketCode::WIFI;

    JsonObject wifi = doc.createNestedObject("wifi");
    wifi["SSID"] = WiFi.SSID();
    wifi["status"] = WiFi.status();
    wifi["RSSI"] = WiFi.RSSI();
    wifi["macAddress"] = WiFi.macAddress();
    wifi["localIP"] = WiFi.localIP();
    wifi["subnetMask"] = WiFi.subnetMask();
    wifi["gatewayIP"] = WiFi.gatewayIP();
    wifi["dnsIP0"] = WiFi.dnsIP(0);
    wifi["dnsIP1"] = WiFi.dnsIP(1);
    wifi["dnsIP2"] = WiFi.dnsIP(2);

    TabNetwork *tab = (TabNetwork *)tabs->tab[0];

    JsonObject scan = doc.createNestedObject("scan");

    int v, s;
    VisibleNetwork *networks = wifiNetworks->getVisibleNetworks(v);

    for (uint8_t i = 0; i < v; i++)
    {
        JsonObject nested = scan.createNestedObject(networks[i].ssid);
        nested["rssi"] = networks[i].rssi;
    }

    SavedNetwork *savedNetworks = wifiNetworks->getSavedNetworks(s);
    JsonObject n = doc.createNestedObject("networks");
    for (uint8_t i = 0; i < s; i++)
    {
        JsonObject nested = n.createNestedObject(savedNetworks[i].ssid);
        nested["password"] = savedNetworks[i].password;
        nested["rssi"] = savedNetworks[i].rssi;
        nested["visible"] = savedNetworks[i].visible;
    }
    serializeJson(doc, str);
}

/**
 * @brief Generates JSON for partition table information.
 */
void PartitionTableToJson()
{
    esp_partition_iterator_t pi = esp_partition_find(ESP_PARTITION_TYPE_ANY, ESP_PARTITION_SUBTYPE_ANY, NULL);

    doc.clear();
    doc["code"] = SocketCode::PARTITION;
    JsonArray array = doc.createNestedArray("partitionTable");
    uint32_t s = 0;
    if (pi != NULL)
    {
        do
        {
            const esp_partition_t *p = esp_partition_get(pi);
            JsonObject nested = array.createNestedObject();
            nested["type"] = p->type;
            nested["subtype"] = p->subtype;
            nested["address"] = p->address;
            nested["size"] = p->size;
            nested["label"] = p->label;
            s = p->address + p->size;
        } while (pi = (esp_partition_next(pi)));

        JsonObject nested = array.createNestedObject();
        nested["type"] = 0;
        nested["subtype"] = 0;
        nested["address"] = s;
        nested["size"] = spi_flash_get_chip_size() - s;
        nested["label"] = "Unallocated";
    }
    serializeJson(doc, str);
}

/**
 * @brief Generates JSON for the file list.
 */
void FileListToJson()
{
    doc.clear();
    doc["code"] = SocketCode::FS_FILES;
    FileInfo *files = getFiles();
    JsonArray array = doc.createNestedArray("fileList");
    if (files != NULL)
    {
        uint16_t i = 0;
        while (files[i].name.length() > 0)
        {
            JsonArray nested = array.createNestedArray();
            nested.add(files[i].name);
            nested.add(files[i].size);
            i++;
        }
    }
    serializeJson(doc, str);
}

/**
 * @brief Generates JSON for SD card information.
 * Uses cached values from setupSD() to avoid SPI bus contention with the display.
 */
void SDInfoToJson()
{
    doc.clear();
    doc["code"] = SocketCode::SD_FILES;
    JsonObject sd = doc.createNestedObject("sd");

    // Use cached card type. If not mounted, this will be CARD_NONE or 0.
    uint8_t currentType = sdCardMounted ? sdCardType : CARD_NONE;

    sd["cardType"] = currentType == CARD_NONE   ? "None"
                     : currentType == CARD_MMC  ? "MMC"
                     : currentType == CARD_SD   ? "SDSC"
                     : currentType == CARD_SDHC ? "SDHC"
                                                : "UNKNOWN";

    if (sdCardMounted && currentType != CARD_NONE)
    {
        // Use cached size
        sd["cardSize"] = sdCardSizeMB;

        if (sdCardMounted)
        {
            sd["usedBytes"] = sdCachedUsedMB;
            sd["sectorSize"] = sdCachedSectorSize;
            sd["numSectors"] = sdCachedNumSectors;
        }

        FileInfo *sdfiles = getSDFiles();
        JsonArray sdFileList = sd.createNestedArray("fileList");
        if (sdfiles != NULL)
        {
            uint16_t i = 0;
            while (sdfiles[i].name.length() > 0)
            {
                JsonArray nested = sdFileList.createNestedArray();
                nested.add(sdfiles[i].name);
                nested.add(sdfiles[i].size);
                i++;
            }
        }
    }
    serializeJson(doc, str);
}

void espChipInfoToJson()
{

    doc.clear();
    doc["code"] = SocketCode::ESP_INFO;
    esp_chip_info_t chip_info;
    esp_chip_info(&chip_info);
    JsonObject esp = doc.createNestedObject("esp");
    esp["frequency"] = getCpuFrequencyMhz();
    //! Model
    switch (chip_info.model)
    {
    case CHIP_ESP32:
        esp["model"] = String("ESP32");
        break;
    case CHIP_ESP32S2:
        esp["model"] = String("ESP32-S2");
        break;
    case CHIP_ESP32S3:
        esp["model"] = String("ESP32-S3");
        break;
    case CHIP_ESP32C3:
        esp["model"] = String("ESP32-C3");
        break;
    case CHIP_ESP32H2:
        esp["model"] = String("ESP32-H2");
        break;
    default:
        esp["model"] = String("unknown");
        break;
    }

    //! Number of CPU cores
    esp["cores"] = chip_info.cores;

    //! Features

    JsonArray features = esp.createNestedArray("features");
    if (chip_info.features & CHIP_FEATURE_EMB_FLASH)
    {
        features.add(String("  - Embedded Flash"));
    }
    if (chip_info.features & CHIP_FEATURE_WIFI_BGN)
    {
        features.add(String("  - WiFi (802.11b/g/n)"));
    }
    if (chip_info.features & CHIP_FEATURE_BLE)
    {
        features.add(String("  - Bluetooth Low Energy (BLE)"));
    }
    if (chip_info.features & CHIP_FEATURE_BT)
    {
        features.add(String("  - Bluetooth Classic"));
    }

    //! Revision number
    esp["revision"] = chip_info.revision;
    //! Flash size (in MB)
    esp["flashSize"] = spi_flash_get_chip_size() / (1024 * 1024);
    serializeJson(doc, str);
}

void PinValuesToJson()
{
    // Use a local document to avoid racing with Sprinkler's Core 1 writes to the shared doc/str globals
    StaticJsonDocument<512> pinDoc;
    pinDoc["code"] = SocketCode::PIN_VALUES;
    JsonArray pins = pinDoc.createNestedArray("pins");
    for (int i = 0; i < 48; i++)
    {
        if (GPIO_IS_VALID_GPIO((gpio_num_t)i))
            pins.add(digitalRead(i));
        else
            pins.add("X");
    }
    serializeJson(pinDoc, str);
}
