/**
 * @file Database.cpp
 * @brief Sprinkler PocketBase integration.
 */

#ifdef SPRINKLER
#include <HTTPClient.h>
#include "DebugServer.h"
#include "WebSockets.h"
#include "Sprinkler/WebSockets.h"
#include "ArduinoJson.h"
#include "HostName.h"
#include "Clock.h"
#include "Json.h"

//!**************************************
//! pocketbase is used to track other ESPs
//!**************************************

/**
 * @brief URL-encodes a string for use in HTTP query parameters.
 *
 * @param str The input string to encode.
 * @return String The percent-encoded string.
 */
String urlencode(String str)
{
    String encodedString = "";
    char c;
    char code0;
    char code1;
    char code2;
    for (int i = 0; i < str.length(); i++)
    {
        c = str.charAt(i);
        if (c == ' ')
        {
            encodedString += '+';
        }
        else if (isalnum(c))
        {
            encodedString += c;
        }
        else
        {
            code1 = (c & 0xf) + '0';
            if ((c & 0xf) > 9)
            {
                code1 = (c & 0xf) - 10 + 'A';
            }
            c = (c >> 4) & 0xf;
            code0 = c + '0';
            if (c > 9)
            {
                code0 = c - 10 + 'A';
            }
            code2 = '\0';
            encodedString += '%';
            encodedString += code0;
            encodedString += code1;
        }
        yield();
    }
    return encodedString;
}

//! on linux machine:
//! openssl s_client -connect pocketbase.thilenius.com:443 -showcerts
//! copy the second cert listed from the first -----BEGIN CERTIFICATE----- to the last -----END CERTIFICATE-----
const char *test_root_ca =
    "-----BEGIN CERTIFICATE-----\n"
    "MIIFazCCA1OgAwIBAgIRAIIQz7DSQONZRGPgu2OCiwAwDQYJKoZIhvcNAQELBQAw\n"
    "TzELMAkGA1UEBhMCVVMxKTAnBgNVBAoTIEludGVybmV0IFNlY3VyaXR5IFJlc2Vh\n"
    "cmNoIEdyb3VwMRUwEwYDVQQDEwxJU1JHIFJvb3QgWDEwHhcNMTUwNjA0MTEwNDM4\n"
    "WhcNMzUwNjA0MTEwNDM4WjBPMQswCQYDVQQGEwJVUzEpMCcGA1UEChMgSW50ZXJu\n"
    "ZXQgU2VjdXJpdHkgUmVzZWFyY2ggR3JvdXAxFTATBgNVBAMTDElTUkcgUm9vdCBY\n"
    "MTCCAiIwDQYJKoZIhvcNAQEBBQADggIPADCCAgoCggIBAK3oJHP0FDfzm54rVygc\n"
    "h77ct984kIxuPOZXoHj3dcKi/vVqbvYATyjb3miGbESTtrFj/RQSa78f0uoxmyF+\n"
    "0TM8ukj13Xnfs7j/EvEhmkvBioZxaUpmZmyPfjxwv60pIgbz5MDmgK7iS4+3mX6U\n"
    "A5/TR5d8mUgjU+g4rk8Kb4Mu0UlXjIB0ttov0DiNewNwIRt18jA8+o+u3dpjq+sW\n"
    "T8KOEUt+zwvo/7V3LvSye0rgTBIlDHCNAymg4VMk7BPZ7hm/ELNKjD+Jo2FR3qyH\n"
    "B5T0Y3HsLuJvW5iB4YlcNHlsdu87kGJ55tukmi8mxdAQ4Q7e2RCOFvu396j3x+UC\n"
    "B5iPNgiV5+I3lg02dZ77DnKxHZu8A/lJBdiB3QW0KtZB6awBdpUKD9jf1b0SHzUv\n"
    "KBds0pjBqAlkd25HN7rOrFleaJ1/ctaJxQZBKT5ZPt0m9STJEadao0xAH0ahmbWn\n"
    "OlFuhjuefXKnEgV4We0+UXgVCwOPjdAvBbI+e0ocS3MFEvzG6uBQE3xDk3SzynTn\n"
    "jh8BCNAw1FtxNrQHusEwMFxIt4I7mKZ9YIqioymCzLq9gwQbooMDQaHWBfEbwrbw\n"
    "qHyGO0aoSCqI3Haadr8faqU9GY/rOPNk3sgrDQoo//fb4hVC1CLQJ13hef4Y53CI\n"
    "rU7m2Ys6xt0nUW7/vGT1M0NPAgMBAAGjQjBAMA4GA1UdDwEB/wQEAwIBBjAPBgNV\n"
    "HRMBAf8EBTADAQH/MB0GA1UdDgQWBBR5tFnme7bl5AFzgAiIyBpY9umbbjANBgkq\n"
    "hkiG9w0BAQsFAAOCAgEAVR9YqbyyqFDQDLHYGmkgJykIrGF1XIpu+ILlaS/V9lZL\n"
    "ubhzEFnTIZd+50xx+7LSYK05qAvqFyFWhfFQDlnrzuBZ6brJFe+GnY+EgPbk6ZGQ\n"
    "3BebYhtF8GaV0nxvwuo77x/Py9auJ/GpsMiu/X1+mvoiBOv/2X/qkSsisRcOj/KK\n"
    "NFtY2PwByVS5uCbMiogziUwthDyC3+6WVwW6LLv3xLfHTjuCvjHIInNzktHCgKQ5\n"
    "ORAzI4JMPJ+GslWYHb4phowim57iaztXOoJwTdwJx4nLCgdNbOhdjsnvzqvHu7Ur\n"
    "TkXWStAmzOVyyghqpZXjFaH3pO3JLF+l+/+sKAIuvtd7u+Nxe5AW0wdeRlN8NwdC\n"
    "jNPElpzVmbUq4JUagEiuTDkHzsxHpFKVK7q4+63SM1N95R1NbdWhscdCb+ZAJzVc\n"
    "oyi3B43njTOQ5yOf+1CceWxG1bQVs5ZufpsMljq4Ui0/1lvh+wjChP4kqKOJ2qxq\n"
    "4RgqsahDYVvTH9w7jXbyLeiNdd8XM2w9U/t7y0Ff/9yi0GE44Za4rF2LN9d11TPA\n"
    "mRGunUHBcnWEvgJBQl9nJEiU0Zsnvgc/ubhPgXRR4Xq37Z0j4r7g1SgEEzwxA57d\n"
    "emyPxgcYxn/eR44/KJ4EBs+lVDR3veyJm+kXQ99b21/+jh5Xos1AnX5iItreGCc=\n"
    "-----END CERTIFICATE-----\n";

String d;

/**
 * @brief Retries uploading schedule data to PocketBase via HTTPS POST.
 *
 * @param localShortTime Time string for the record.
 * @return true on successful upload, false on connection or WiFi failure.
 */
bool retryUpdatePocketBase(char *localShortTime)
{
    if (WiFi.status() == WL_CONNECTED)
    {
        WiFiClientSecure client;
        HTTPClient http;

        client.setCACert(test_root_ca);
        const char *serverName = "pocketbase.thilenius.com";

        if (!client.connect(serverName, 443))
        {
            printf("Connection failed!\n");
            sendEvent("Pocketbase", (char *)F("Connection failed!"));
            return false;
        }
        else
        {
            client.println("POST /api/collections/currents/records HTTP/1.1");
            client.println("Host: pocketbase.thilenius.com");
            client.println("Content-Type: application/json");
            client.print("Content-Length: ");
            client.println(d.length());
            client.println();
            client.println(d.c_str());
            client.println();

            while (client.connected())
            {
                String line = client.readStringUntil('\n');
                if (line == "\r")
                    break;
            }
            //! if there are incoming bytes available
            //! from the server, read them and print them:
            while (client.available())
            {
                char c = client.read();
                Serial.write(c);
            }

            client.stop();
        }
        return true;
    }
    else
    {
        printf("WiFi not connected!\n");
        sendEvent("Pocketbase", (char *)"Updated PocketBase: WiFi not connected!");
        return false;
    }
}

/**
 * @brief Builds and uploads hourly schedule data to PocketBase.
 *
 * @param localShortTime Time string for the record.
 * @param activeHour Active hour index used as the record ID base.
 * @param hour 6x60 matrix of channel durations per minute.
 * @return true on successful upload, false otherwise.
 */
bool updatePocketBase(char *localShortTime, int32_t activeHour, double hour[6][60])
{
    d = "{\"id\":\"";
    d += activeHour;
    d += "000000000\",\"hour\":";
    d += activeHour;
    d += ",\"minutes\":[";

    for (uint8_t i = 0; i < 6; i++)
    {
        printf("%d\n", i);
        d += "[[0,";
        d += hour[i][0];
        d += "]";
        double_t h = hour[i][0];
        for (uint8_t j = 1; j < 60; j++)
        {
            if (h != hour[i][j])
            {
                d += ",[";
                d += j;
                d += ",";
                d += hour[i][j];
                d += "]";
                h = hour[i][j];
            }
        }
        d += "]";
        if (i < 5)
            d += ",";
    }
    d += "]}";
    return retryUpdatePocketBase(localShortTime);
}

String recordId = ""; //!< keeps track of this esp's pocketbase record id
String token = "";

/**
 * @brief Checks if WiFi is connected and logs an event if not.
 *
 * @return true if WiFi is connected, false otherwise.
 */
bool isConnected()
{
    if (WiFi.status() == WL_CONNECTED)
    {
        return true;
    }
    else
    {
        printf("WiFi not connected!\n");
        sendEvent("Pocketbase", (char *)"Updated PocketBase: WiFi not connected!");
        return false;
    }
}

/**
 * @brief Queries PocketBase to check if a record with this device's name exists.
 *
 * @return true if the name record exists, false otherwise.
 */
bool doesNameExist()
{
    if (isConnected())
    {
        HTTPClient http;
        String serverPath = String("https://pocketbase.thilenius.com/api/collections/online_ESP/records/?filter=(name=%27");
        serverPath += urlencode(String(REPORT_NAME));
        serverPath += "%27)";
        http.begin(serverPath.c_str());
        int httpResponseCode = http.GET();

        if (httpResponseCode > 0)
        {
            printf("HTTP Response code: %d\n", httpResponseCode);
            String payload = http.getString();
            http.end();
            doc.clear();
            DeserializationError error = deserializeJson(doc, payload.c_str());
            if (error)
            {
                printf("doesNameExist: deserializeJson() failed: %s\n", error.f_str());
                return false;
            }
            else
            {
                bool t = doc["totalItems"].as<int>() == 0 ? false : true;
                if (t)
                    recordId = doc["items"][0]["id"].as<String>();

                return t;
            }
        }
        else
        {
            printf("Error code: %d\n", httpResponseCode);
            http.end();
            return false;
        }
    }
    else
    {
        printf("Pi3 Connection failed!\n");
        sendEvent("Pocketbase", (char *)F("Pocketbase Connection failed!"));
        return false;
    }
}

/**
 * @brief Creates a new name record in PocketBase for this device.
 *
 * @return true if the record was created successfully, false otherwise.
 */
bool createNameRecord()
{
    if (isConnected())
    {
        HTTPClient http;
        String d = String("{\"name\":\"") + String(REPORT_NAME) + "\"}";
        String serverPath = String("https://pocketbase.thilenius.com/api/collections/online_ESP/records");
        http.begin(serverPath.c_str(), test_root_ca);
        http.addHeader("Content-Type", "application/json");
        http.addHeader("Authorization", token);
        int httpResponseCode = http.POST(d.c_str());

        if (httpResponseCode > 0)
        {
            printf("HTTP Response code: %d\n", httpResponseCode);
            String payload = http.getString();
            http.end();
            doc.clear();
            DeserializationError error = deserializeJson(doc, payload.c_str());
            if (error)
            {
                printf("doesNameExist: deserializeJson() failed: %s\n", error.f_str());
                return false;
            }
            else
            {
                bool t = doc["totalItems"].as<int>() == 0 ? false : true;
                if (t)
                    recordId = doc["items"][0]["id"].as<String>();

                return t;
            }
        }
        else
        {
            printf("Error code: %d\n", httpResponseCode);
            http.end();
            return false;
        }
    }
    else
    {
        printf("Pi3 Connection failed!\n");
        sendEvent("Pocketbase", (char *)F("Pocketbase Connection failed!"));
        return false;
    }
}

/**
 * @brief Updates the existing name record in PocketBase for this device.
 *
 * @return true if the record was updated successfully, false otherwise.
 */
bool updateNameRecord()
{
    if (isConnected())
    {
        HTTPClient http;
        String d = String("{\"name\":\"") + REPORT_NAME + "\"}";
        String serverPath = String("https://pocketbase.thilenius.com/api/collections/online_ESP/records");
        http.begin(serverPath.c_str(), test_root_ca);
        http.addHeader("Content-Type", "application/json");
        http.addHeader("Authorization", token);
        int httpResponseCode = http.PATCH(d.c_str());

        if (httpResponseCode > 0)
        {
            printf("HTTP Response code: %d\n", httpResponseCode);
            String payload = http.getString();
            http.end();
            doc.clear();
            DeserializationError error = deserializeJson(doc, payload.c_str());
            if (error)
            {
                printf("doesNameExist: deserializeJson() failed: %s\n", error.f_str());
                return false;
            }
            else
            {
                bool t = doc["totalItems"].as<int>() == 0 ? false : true;
                if (t)
                    recordId = doc["items"][0]["id"].as<String>();

                return t;
            }
        }
        else
        {
            printf("Error code: %d\n", httpResponseCode);
            http.end();
            return false;
        }
    }
    else
    {
        printf("Pi3 Connection failed!\n");
        sendEvent("Pocketbase", (char *)F("Pocketbase Connection failed!"));
        return false;
    }
}

/**
 * @brief Ensures this device has a record in PocketBase, creating one if needed.
 */
void getRecordId()
{
    if (isConnected())
        if (!doesNameExist())
        {
            printf("Name does not exist!\n");
            createNameRecord();
        }
        else
            updateNameRecord();
}
#endif
