#include <WiFi.h>
#include <ESPmDNS.h>   //!< alows nDNS lookup
#include <DNSServer.h> //!< when access-point need DNS
#include <AsyncTCP.h>
#include <ESPAsyncWebServer.h>
#include <ElegantOTA.h>
#include <Report.h>
#include <LittleFS.h>
#include <SD.h>
#include "Memory.h"
#include "SPIMutex.h"

#include "HostName.h"
#include "Serial.h"
#include "Functions.h"
#include "Report.h"
#include "Clock.h"
#include "WebSerial.h"
#include "WebSockets.h"
#include "FileSystem.h"
#include "Json.h"

/**
 * @file DebugServer.cpp
 * @brief HTTP server handlers and routes.
 */

#ifdef GLIDERPORT
#include "Gliderport/Gliderport.h"
#endif

#ifdef SPRINKLER
#include "Sprinkler/WebSockets.h"
#endif

#include "Display.h"
#include "Tabs.h"

/**
 * @brief Handles WiFi connectivity events.
 *
 * @param event The WiFi event that occurred
 */
void WiFiEvent(WiFiEvent_t event);
//! user name and password to load served page from here
const char *wwwUsername = "cmosdsnr";
const char *wwwPassword = "qwe123";

String ssid, password;     //!< network credentials are in EEPROM
AsyncWebServer server(80); //!< Set web server port number to 80

IPAddress ip; //!< keep track of IP address string

bool espReset = false,
     ssidReset = false,
     newSSID = false,
     newSSIDB = false,
     resetToNeed4Speed = false,
     resetToAccess = false;

/**
 * @brief Handles requests for undefined routes, returning a 404 response.
 *
 * @param request Pointer to the incoming HTTP request.
 */
void handleNotFound(AsyncWebServerRequest *request)
{
    if (!request->authenticate(wwwUsername, wwwPassword))
        return request->requestAuthentication();
    request->send(404, "text/plain", "Not found");
}

/**
 * @brief Serves the root index.html page from LittleFS.
 *
 * @param request Pointer to the incoming HTTP request.
 */
void handleRoot(AsyncWebServerRequest *request)
{
    if (!request->authenticate(wwwUsername, wwwPassword))
        return request->requestAuthentication();
    request->send(LittleFS, "/index.html", "text/html", false);

    //! handle tasks from other pages that were redirected here
    if (espReset)
    {
        ESP.restart();
    }
}
/**
 * @brief Serves the favicon.ico file from LittleFS.
 *
 * @param request Pointer to the incoming HTTP request.
 */
void favicon(AsyncWebServerRequest *request)
{
    request->send(LittleFS, "/favicon.ico", "image/x-icon", false);
}

/**
 * @brief Handles SSID/password change requests and redirects to root.
 *
 * @param request Pointer to the incoming HTTP request containing ssid and password params.
 */
void change(AsyncWebServerRequest *request)
{
    if (!request->authenticate(wwwUsername, wwwPassword))
        return request->requestAuthentication();

    AsyncWebServerResponse *response = request->beginResponse(200, "text/html", "<meta http-equiv='Refresh' content='0; url=/' />");
    response->addHeader("Connection", "close");
    request->send(response);

    if (request->hasParam("ssid"))
    {
        const AsyncWebParameter *p = request->getParam("ssid");
        ssid = p->value();
        newSSID = true;
    }
    else
    {
        resetToNeed4Speed = true;
    }
    if (request->hasParam("password"))
    {
        const AsyncWebParameter *p = request->getParam("password");
        password = p->value();
    }
    else
    {
        password = "qwe123";
    }
}

/**
 * @brief Resets the device to access-point mode after redirecting to root.
 *
 * @param request Pointer to the incoming HTTP request.
 */
void resetToAccessPoint(AsyncWebServerRequest *request)
{
    if (!request->authenticate(wwwUsername, wwwPassword))
        return request->requestAuthentication();

    AsyncWebServerResponse *response = request->beginResponse(200, "text/html", "<meta http-equiv='Refresh' content='0; url=/' />");
    response->addHeader("Connection", "close");
    request->send(response);
    //! write & reset after reload of main page
    resetToAccess = true;
}

/**
 * @brief Resets the device to the Need4Speed network after redirecting to root.
 *
 * @param request Pointer to the incoming HTTP request.
 */
void resetToN4S(AsyncWebServerRequest *request)
{
    if (!request->authenticate(wwwUsername, wwwPassword))
        return request->requestAuthentication();

    AsyncWebServerResponse *response = request->beginResponse(200, "text/html", "<meta http-equiv='Refresh' content='0; url=/' />");
    response->addHeader("Connection", "close");
    request->send(response);
    //! write & reset after reload of main page
    resetToNeed4Speed = true;
}

/**
 * @brief Triggers an ESP restart after redirecting the client to root.
 *
 * @param request Pointer to the incoming HTTP request.
 */
void reboot(AsyncWebServerRequest *request)
{
    if (!request->authenticate(wwwUsername, wwwPassword))
        return request->requestAuthentication();
    AsyncWebServerResponse *response = request->beginResponse(200, "text/html", "<meta http-equiv='Refresh' content='0; url=/' />");
    response->addHeader("Connection", "close");
    request->send(response);
    //! gets reset after reload of main page
    espReset = true;
}

/**
 * @brief Returns filesystem information to the client.
 *
 * @param request Pointer to the incoming HTTP request.
 */
void fsInfo(AsyncWebServerRequest *request)
{
    String finfo;
    if (!request->authenticate(wwwUsername, wwwPassword))
        return request->requestAuthentication();
    AsyncWebServerResponse *response = request->beginResponse(200, "text/html", finfo.c_str());
    response->addHeader("Connection", "close");
    request->send(response);
}

/**
 * @brief Callback for handling HTTP request body data.
 *
 * @param request Pointer to the incoming HTTP request.
 * @param data Pointer to the body data chunk.
 * @param len Length of the current data chunk.
 * @param index Byte offset of this chunk in the total body.
 * @param total Total expected body size.
 */
void onBody(AsyncWebServerRequest *request, uint8_t *data, size_t len, size_t index, size_t total)
{
    //! Handle body
}

/**
 * @brief Callback for handling LittleFS file uploads.
 *
 * @param request Pointer to the incoming HTTP request.
 * @param filename Name of the file being uploaded.
 * @param index Byte offset of this chunk in the total upload.
 * @param data Pointer to the upload data chunk.
 * @param len Length of the current data chunk.
 * @param final true if this is the last chunk of the upload.
 */
void onUpload(AsyncWebServerRequest *request, String filename, size_t index, uint8_t *data, size_t len, bool final)
{
    //! Handle upload
}

/**
 * @brief Callback for handling file uploads to the SD card.
 *
 * Opens, writes, and closes the file on SD using SPI mutex protection.
 *
 * @param request Pointer to the incoming HTTP request.
 * @param filename Name of the file being uploaded.
 * @param index Byte offset of this chunk in the total upload.
 * @param data Pointer to the upload data chunk.
 * @param len Length of the current data chunk.
 * @param final true if this is the last chunk of the upload.
 */
void onSDUpload(AsyncWebServerRequest *request, String filename, size_t index, uint8_t *data, size_t len, bool final)
{
    static File sdUploadFile;
    if (index == 0)
    {
        if (!xSemaphoreTake(spiMutex, pdMS_TO_TICKS(2000)))
        {
            printf("[SD upload] mutex timeout\n");
            return;
        }
        SD.end();
        sdSPI.begin(TFT_SCLK, TFT_MISO, TFT_MOSI, SD_CS);
        SD.begin(SD_CS, sdSPI, 4000000);
        String path = "/" + filename;
        sdUploadFile = SD.open(path, FILE_WRITE);
        xSemaphoreGive(spiMutex);
        if (!sdUploadFile)
        {
            printf("[SD upload] failed to open %s\n", path.c_str());
            return;
        }
        printf("[SD upload] started: %s\n", path.c_str());
    }
    if (sdUploadFile)
    {
        if (!xSemaphoreTake(spiMutex, pdMS_TO_TICKS(2000))) return;
        sdUploadFile.write(data, len);
        xSemaphoreGive(spiMutex);
    }
    if (final && sdUploadFile)
    {
        if (!xSemaphoreTake(spiMutex, pdMS_TO_TICKS(2000))) return;
        sdUploadFile.close();
        cacheSDFiles();
        xSemaphoreGive(spiMutex);
        printf("[SD upload] complete: %s (%u bytes)\n", filename.c_str(), index + len);
        request->send(200, "text/plain", "OK");
    }
}

/**
 * @brief Returns an HTML table row of variable names for the debug dashboard.
 *
 * @param request Pointer to the incoming HTTP request.
 */
void variableNames(AsyncWebServerRequest *request)
{
    if (!request->authenticate(wwwUsername, wwwPassword))
        return request->requestAuthentication();
    String names =
        "<td>DC offset</td>\
     <td>active Hour</td>\
     <td>seconds</td>\
     <td>minutes</td>\
     <td>Time error</td>\
     <td>Transmission</td>";
    AsyncWebServerResponse *response = request->beginResponse(200, "text/html", names.c_str());
    response->addHeader("Connection", "close");
    request->send(response);
}
/**
 * @brief Returns an HTML table row of current variable values for the debug dashboard.
 *
 * @param request Pointer to the incoming HTTP request.
 */
void variableValues(AsyncWebServerRequest *request)
{
    if (!request->authenticate(wwwUsername, wwwPassword))
        return request->requestAuthentication();
    String t = "<td>";
    t += 0; //!< localShortTime;
    t += "</td><td>";
    t += 0; //!< activeHour;
    t += "</td><td>";
    t += 0; //!< measurementCount;
    t += "</td><td>";
    t += 0; //!< minuteCount;
    t += "</td><td>";
    t += 0; //!< error;
    t += "</td><td>";
    t += 0; //!< success ? "Success" : "Fail";
    t += "</td>";
    AsyncWebServerResponse *response = request->beginResponse(200, "text/html", t.c_str());
    response->addHeader("Connection", "close");
    request->send(response);
}

/**
 * @brief Returns an HTML table header row for the event log.
 *
 * @param request Pointer to the incoming HTTP request.
 */
void eventHeader(AsyncWebServerRequest *request)
{

    if (!request->authenticate(wwwUsername, wwwPassword))
        return request->requestAuthentication();

    AsyncWebServerResponse *response = request->beginResponse(200, "text/html", "<th>TimeStamp</th><th>Event</th><th>ts</th><th>error</th><th>seconds</th><th>minutes</th>");
    response->addHeader("Connection", "close");
    request->send(response);
}

/**
 * @brief Registers all HTTP routes, static file serving, OTA, and WebSocket handlers.
 */
void SetUpServer()
{

    server.on("/", HTTP_GET, handleRoot);
    server.on("/name", HTTP_GET, [](AsyncWebServerRequest *request)
              { request->send(200, "text/plain", REPORT_NAME); });
    server.on("/change", HTTP_POST, change);
    server.on("/reset", HTTP_GET, resetToAccessPoint);
    server.on("/resetns", HTTP_GET, resetToN4S);
    server.on("/espreset", HTTP_GET, reboot);
    server.on("/fsInfo", HTTP_GET, fsInfo);
    server.on("/variableNames", HTTP_GET, variableNames);
    server.on("/variableValues", HTTP_GET, variableValues);
    server.on("/eventHeader", HTTP_GET, eventHeader);
#ifdef GLIDERPORT
    server.on("/pingMe", HTTP_GET, pingMe);
    server.on("/addData", HTTP_GET, addData);
#endif
#ifdef SPRINKLER
    server.on("/loadData", HTTP_GET, loadData);
#endif
    server.on("/manifest.json", HTTP_GET, [](AsyncWebServerRequest *request)
              { request->send(LittleFS, "/manifest.json", "application/manifest+json", false); });

    //! SD card file download — chunked with mutex-protected SPI reads
    server.on("/sd/download", HTTP_GET, [](AsyncWebServerRequest *request)
              {
        if (!request->authenticate(wwwUsername, wwwPassword))
            return request->requestAuthentication();
        if (!sdCardMounted)
            return request->send(503, "text/plain", "SD card not mounted");
        if (!request->hasParam("fileName"))
            return request->send(400, "text/plain", "Missing fileName");

        String fileName = request->getParam("fileName")->value();
        String path = "/" + fileName;
        printf("[SD download] path='%s' sdCardMounted=%d spiMutex=%p\n", path.c_str(), sdCardMounted, spiMutex);

        // Open the file under the mutex to get its size
        size_t fileSize = 0;
        {
            if (!xSemaphoreTake(spiMutex, pdMS_TO_TICKS(2000)))
            {
                printf("[SD download] mutex timeout\n");
                return request->send(503, "text/plain", "SPI bus busy");
            }
            SD.end();
            sdSPI.begin(TFT_SCLK, TFT_MISO, TFT_MOSI, SD_CS);
            SD.begin(SD_CS, sdSPI, 4000000);
            File f = SD.open(path, FILE_READ);
            printf("[SD download] SD.open result: %s, size: %u\n", f ? "OK" : "FAILED", f ? f.size() : 0);
            if (f) { fileSize = f.size(); f.close(); }
            xSemaphoreGive(spiMutex);
        }
        if (fileSize == 0)
            return request->send(404, "text/plain", "File not found or empty");

        // Stream in 4KB chunks, taking the mutex for each read
        AsyncWebServerResponse *response = request->beginChunkedResponse(
            "application/octet-stream",
            [path](uint8_t *buffer, size_t maxLen, size_t index) -> size_t
            {
                static File sdFile;
                if (index == 0)
                {
                    if (xSemaphoreTake(spiMutex, pdMS_TO_TICKS(2000)))
                    {
                        SD.end();
                        SD.begin(SD_CS);
                        sdFile = SD.open(path, FILE_READ);
                        xSemaphoreGive(spiMutex);
                    }
                }
                if (!sdFile) return 0;

                size_t toRead = min(maxLen, (size_t)4096);
                if (!xSemaphoreTake(spiMutex, pdMS_TO_TICKS(2000)))
                    return 0;
                size_t bytesRead = sdFile.read(buffer, toRead);
                xSemaphoreGive(spiMutex);

                if (bytesRead == 0)
                    sdFile.close();
                return bytesRead;
            });

        response->addHeader("Content-Disposition", "attachment; filename=\"" + fileName + "\"");
        response->addHeader("Content-Length", String(fileSize));
        request->send(response); });

    //! SD card file delete
    server.on("/sd/delete", HTTP_GET, [](AsyncWebServerRequest *request)
              {
        if (!request->authenticate(wwwUsername, wwwPassword))
            return request->requestAuthentication();
        if (!sdCardMounted)
            return request->send(503, "text/plain", "SD card not mounted");
        if (!request->hasParam("fileName"))
            return request->send(400, "text/plain", "Missing fileName");
        String path = "/" + request->getParam("fileName")->value();
        if (!xSemaphoreTake(spiMutex, pdMS_TO_TICKS(2000)))
            return request->send(503, "text/plain", "SPI bus busy");
        bool removed = SD.remove(path);
        if (removed) cacheSDFiles();
        xSemaphoreGive(spiMutex);
        if (removed)
            request->send(200, "text/plain", "OK");
        else
            request->send(500, "text/plain", "Delete failed"); });

    //! SD card file upload
    server.on("/sd/upload", HTTP_POST,
        [](AsyncWebServerRequest *request) { request->send(200, "text/plain", "OK"); },
        onSDUpload);

    //! attach filesystem root at URL /fs
    server.serveStatic("/fs", LittleFS, "/");

    //! replace your current "/" handler + the /fs static mount with this:
    server.serveStatic("/", LittleFS, "/")
        .setDefaultFile("index.html")
        .setCacheControl("public, max-age=31536000, immutable")
        .setAuthentication(wwwUsername, wwwPassword); //!< protects all static files

    //! Catch-All Handlers
    //! Any request that can not find a Handler that canHandle it
    //! ends in the callbacks below.
    server.onFileUpload(onUpload);
    server.onRequestBody(onBody);
    server.onNotFound(handleNotFound);
    ElegantOTA.begin(&server);
    ElegantOTA.onProgress([](size_t current, size_t total)
                          { printf("Progress: %u%%\r", (current / total) * 100); });
    initWebSocket(&server);
}

/**
 * @brief Main loop handler for WiFi-related tasks.
 *
 * Checks for OTA file changes and refreshes the file list when needed.
 */
void WifiLoop()
{
    if (ElegantOTA.filesChanged)
    {
        printf("Files changed\n");
        ElegantOTA.filesChanged = false;
        cacheFiles();
        sendFileList(); //!< webSerial sends file list again
    }
    ElegantOTA.loop();
}
/**
 * @brief Configures routes and starts the HTTP server.
 *
 * @param WAIT_FOREVER If true, blocks until WiFi connection is established.
 */
void StartServer(bool WAIT_FOREVER)
{
    SetUpServer();
    server.begin();
}
