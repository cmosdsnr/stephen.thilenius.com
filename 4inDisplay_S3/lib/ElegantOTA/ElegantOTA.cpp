#include "ElegantOTA.h"
#include <LittleFS.h>

ElegantOTAClass::ElegantOTAClass() {}

void ElegantOTAClass::begin(ELEGANTOTA_WEBSERVER *server, const char *username, const char *password)
{
    _server = server;
    filesChanged = false;
    setAuth(username, password);
    // Handle OPTIONS requests for CORS preflight
    _server->on("/ota/fileupload", HTTP_OPTIONS, std::bind(&ElegantOTAClass::handleOTAOptions, this, std::placeholders::_1));

    // Register the /ota/fileupload handlers
    _server->on("/ota/fileupload", HTTP_POST,
                std::bind(&ElegantOTAClass::handleFileUpload, this, std::placeholders::_1), // Request handler
                NULL,                                                                       // No upload handler (since we're not using multipart/form-data)
                std::bind(&ElegantOTAClass::handleFileBody, this,                           // Body handler
                          std::placeholders::_1,                                            // AsyncWebServerRequest *request
                          std::placeholders::_2,                                            // uint8_t *data
                          std::placeholders::_3,                                            // size_t len
                          std::placeholders::_4,                                            // size_t index
                          std::placeholders::_5                                             // size_t total
                          ));

    // Register the /ota/start handler
    _server->on("/ota/start", HTTP_GET, std::bind(&ElegantOTAClass::handleOTAStart, this, std::placeholders::_1));

    // Register the /ota/delete handler
    _server->on("/ota/delete", HTTP_GET, std::bind(&ElegantOTAClass::handleDeleteFile, this, std::placeholders::_1));

    // Handle OPTIONS requests for CORS preflight
    _server->on("/ota/upload", HTTP_OPTIONS, std::bind(&ElegantOTAClass::handleOTAOptions, this, std::placeholders::_1));

    // Register the /ota/upload handlers
    _server->on("/ota/upload", HTTP_POST,
                std::bind(&ElegantOTAClass::handleOTAUpload, this, std::placeholders::_1), // Request handler
                NULL,                                                                      // No upload handler (since we're not using multipart/form-data)
                std::bind(&ElegantOTAClass::handleOTABody, this,                           // Body handler
                          std::placeholders::_1,                                           // AsyncWebServerRequest *request
                          std::placeholders::_2,                                           // uint8_t *data
                          std::placeholders::_3,                                           // size_t len
                          std::placeholders::_4,                                           // size_t index
                          std::placeholders::_5                                            // size_t total
                          ));
}
// Path where the uploaded file will be saved in LittleFS

void ElegantOTAClass::handleFileUpload(AsyncWebServerRequest *request)
{
    // Post-OTA update callback
    if (postUpdateCallback != NULL)
        postUpdateCallback(!_update_failed);

    // AsyncWebServerResponse *response = request->beginResponse(
    //     _update_failed ? 400 : 200,
    //     "text/plain",
    //     _update_failed ? _update_error_str.c_str() : "OK");
    // response->addHeader("Connection", "close");
    // response->addHeader("Access-Control-Allow-Origin", "*");
    // request->send(response);

    Serial.println("File Received");
}

// Function to handle the OTA file upload process
void ElegantOTAClass::handleFileBody(AsyncWebServerRequest *request,
                                     uint8_t *data, size_t len, size_t index, size_t total)
{
    static File fsUploadFile;

    if (index == 0)
    {
        // This part is executed when upload starts
        Serial.printf("Upload Start: %s\n", _filePath.c_str());

        // Open the file for writing in LittleFS, overwrite if it exists
        fsUploadFile = LittleFS.open(_filePath, "w");
        if (!fsUploadFile)
        {
            Serial.println("File open failed");
            request->send(500, "text/plain", "File open failed");
            return;
        }
    }

    // Write the received data to the file
    if (fsUploadFile)
    {
        fsUploadFile.write(data, len);
    }

    // If this is the final chunk of the upload
    if (index + len == total)
    {
        if (fsUploadFile)
        {
            fsUploadFile.close();
            Serial.printf("Upload Complete: %s (%u bytes)\n", _filePath.c_str(), index + len);
            request->send(200, "text/plain", "File uploaded successfully");
            filesChanged = true;
        }
        else
        {
            request->send(500, "text/plain", "File upload failed");
        }
    }
}

void ElegantOTAClass::handleOTAOptions(AsyncWebServerRequest *request)
{
    AsyncWebServerResponse *response = request->beginResponse(200);
    response->addHeader("Access-Control-Allow-Origin", "*");
    response->addHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    response->addHeader("Access-Control-Allow-Headers", "Content-Type, Content-Length");
    request->send(response);
}

void ElegantOTAClass::handleOTAStart(AsyncWebServerRequest *request)
{
    // Get OTA mode from request parameters
    _error_cnt = 0;
    OTA_Mode mode = OTA_MODE_FIRMWARE;
    if (request->hasParam("mode"))
    {
        String argValue = request->getParam("mode")->value();
        if (argValue == "fs")
        {
            ELEGANTOTA_DEBUG_MSG("OTA Mode: Filesystem\n");
            mode = OTA_MODE_FILESYSTEM;
        }
        else if (argValue == "fr")
        {
            ELEGANTOTA_DEBUG_MSG("OTA Mode: Firmware\n");
            mode = OTA_MODE_FIRMWARE;
        }
        else
        {
            ELEGANTOTA_DEBUG_MSG("OTA Mode: LittleFS files\n");
            // Check if LittleFS is mounted
            if (!LittleFS.begin(true))
            {
                ELEGANTOTA_DEBUG_MSG("LittleFS Mount Failed\n");
                request->send(400, "text/plain", "LittleFS Mount Failed");
            }
            if (request->hasParam("fileName"))
            {
                _filePath = "/" + request->getParam("fileName")->value();
                request->send(200, "text/plain", "Uploading file to LittleFS: " + _filePath);
            }
            request->send(400, "text/plain", "No fileName");
        }
    }

    // Get MD5 hash from request parameters
    if (request->hasParam("hash"))
    {
        String hash = request->getParam("hash")->value();
        ELEGANTOTA_DEBUG_MSG(String("MD5: " + hash + "\n").c_str());
        if (!Update.setMD5(hash.c_str()))
        {
            ELEGANTOTA_DEBUG_MSG("ERROR: MD5 hash not valid\n");
            return request->send(400, "text/plain", "MD5 parameter invalid");
        }
        else
        {
            ELEGANTOTA_DEBUG_MSG("MD5 hash set successfully\n");
        }
    }

    // Pre-OTA update callback
    if (preUpdateCallback != NULL)
        preUpdateCallback();

    // Start update process
    if (!Update.begin(UPDATE_SIZE_UNKNOWN, mode == OTA_MODE_FILESYSTEM ? U_SPIFFS : U_FLASH))
    {
        ELEGANTOTA_DEBUG_MSG("Failed to start update process\n");
        // Save error to string
        StreamString str;
        Update.printError(str);
        _update_error_str = str.c_str();
        _update_error_str.concat("\n");
        ELEGANTOTA_DEBUG_MSG(_update_error_str.c_str());
    }
    // Serial.println("[ElegantOTA] OTA Update Start");
    request->send((Update.hasError()) ? 400 : 200, "text/plain", (Update.hasError()) ? _update_error_str.c_str() : (mode == OTA_MODE_FILESYSTEM ? "OK: LittleFS" : "OK: Firmware"));
}

void ElegantOTAClass::handleDeleteFile(AsyncWebServerRequest *request)
{
    if (request->hasParam("fileName"))
    {
        String fileName = request->getParam("fileName")->value();
        ELEGANTOTA_DEBUG_MSG(String("Deleting file: " + fileName + "\n").c_str());
        if (!LittleFS.remove("/" + fileName))
        {
            Serial.println("Failed to delete file /" + fileName);
            ELEGANTOTA_DEBUG_MSG("Failed to delete file/" + fileName + "\n");
            return request->send(400, "text/plain", "Failed to delete file");
        }
        else
        {
            Serial.println("File deleted successfully: /" + fileName + "\n");
            ELEGANTOTA_DEBUG_MSG("File deleted successfully\n");
            filesChanged = true;
            return request->send(200, "text/plain", "File deleted successfully");
        }
    }
    else
    {
        ELEGANTOTA_DEBUG_MSG("No fileName\n");
        return request->send(400, "text/plain", "No fileName");
    }
}

void ElegantOTAClass::handleOTAUpload(AsyncWebServerRequest *request)
{
    // Post-OTA update callback
    if (postUpdateCallback != NULL)
        postUpdateCallback(!_update_failed);

    AsyncWebServerResponse *response = request->beginResponse(
        _update_failed ? 400 : 200,
        "text/plain",
        _update_failed ? _update_error_str.c_str() : "OK");
    response->addHeader("Connection", "close");
    response->addHeader("Access-Control-Allow-Origin", "*");
    request->send(response);

    // Set reboot flag only if update was successful
    if (!_update_failed && !Update.hasError())
    {
        if (_auto_reboot)
        {
            _reboot_request_millis = millis();
            _reboot = true;
        }
    }
    else
    {
        Serial.println("[ElegantOTA] Update failed, not rebooting.");
    }

    // Reset error flag for next update
    _update_failed = false;
    _update_error_str = "";
}

void ElegantOTAClass::handleOTABody(AsyncWebServerRequest *request, uint8_t *data, size_t len, size_t index, size_t total)
{

    // Write binary data to flash
    if (len)
    {
        size_t written = Update.write(data, len);
        if (written != len)
        {
            Update.printError(Serial);
            _update_failed = true;
            _update_error_str = "Failed to write data to flash";
            return;
        }
        else
        {
            _current_progress_size += len;
            // Serial.printf("[ElegantOTA] Written %u/%u bytes\n", _current_progress_size, total);
            if (progressUpdateCallback != NULL)
                progressUpdateCallback(_current_progress_size, total);
        }
    }

    if (index + len == total)
    {
        // Finalize Update
        if (Update.end(true))
        {
            Serial.println("[ElegantOTA] Update Success");
        }
        else
        {
            Update.printError(Serial);
            _update_failed = true;
            _update_error_str = "Failed to finalize update";
        }
    }
}

void ElegantOTAClass::setAuth(const char *username, const char *password)
{
    _username = username;
    _password = password;
    _authenticate = _username.length() && _password.length();
}

void ElegantOTAClass::clearAuth()
{
    _authenticate = false;
}

void ElegantOTAClass::setAutoReboot(bool enable)
{
    _auto_reboot = enable;
}

void ElegantOTAClass::loop()
{
    // Check if 2 seconds have passed since _reboot_request_millis was set
    if (_reboot && millis() - _reboot_request_millis > 2000)
    {
        ELEGANTOTA_DEBUG_MSG("Rebooting...\n");
        ESP.restart();
        _reboot = false;
    }
}

void ElegantOTAClass::onStart(std::function<void()> callable)
{
    preUpdateCallback = callable;
}

void ElegantOTAClass::onProgress(std::function<void(size_t current, size_t final)> callable)
{
    progressUpdateCallback = callable;
}

void ElegantOTAClass::onEnd(std::function<void(bool success)> callable)
{
    postUpdateCallback = callable;
}

ElegantOTAClass ElegantOTA;
