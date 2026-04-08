#ifdef DESK

/**
 * @file TabDevices.cpp
 * @brief Devices tab UI that fetches and displays the ESP device registry.
 */

#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>
#include <freertos/FreeRTOS.h>
#include <freertos/task.h>
#include <esp_heap_caps.h>
#include <time.h>

struct PsramAllocatorDev {
    void *allocate(size_t size)                  { return heap_caps_malloc(size, MALLOC_CAP_SPIRAM | MALLOC_CAP_8BIT); }
    void  deallocate(void *ptr)                  { free(ptr); }
    void *reallocate(void *ptr, size_t new_size) { return heap_caps_realloc(ptr, new_size, MALLOC_CAP_SPIRAM | MALLOC_CAP_8BIT); }
};
using PsramJsonDocDev = BasicJsonDocument<PsramAllocatorDev>;

#include "Desk/TabDevices.h"
#include "Tabs.h"
#include "Report.h"
#include "Clock.h"
#include "SPIMutex.h"

#define DEVICES_URL "https://stephen.stephen-c19.workers.dev/api/espList"
#define ROW_H     18
#define TOP       (TAB_H + 8)
#define COL_NAME    5
#define COL_IP    245   //!< name col = 240px (>25 chars of FreeSans9pt7b)
#define COL_H_R   411   //!< hours right-edge (IP col = 145px, max 12h so no days col)
#define COL_M_R   441   //!< mins  right-edge (h col = 30px)
#define COL_S_R   470   //!< secs  right-edge (m col = 30px; s col = 29px)

/**
 * @brief Parse an ISO8601 UTC timestamp string to a time_t epoch.
 *
 * Expected format: "2026-04-01T17:40:12.208Z".
 *
 * @param s Null-terminated ISO8601 timestamp string.
 * @return time_t Epoch seconds, or 0 on parse failure.
 */
static time_t parseISO8601(const char *s)
{
    int year, mon, mday, hour, min, sec;
    if (sscanf(s, "%d-%d-%dT%d:%d:%d", &year, &mon, &mday, &hour, &min, &sec) != 6)
        return 0;
    // Days per month (non-leap)
    static const int dpm[12] = {31,28,31,30,31,30,31,31,30,31,30,31};
    // Days since epoch for complete years
    int y = year - 1970;
    long days = y * 365 + (y + 1) / 4; // leap years since 1970
    // Days for complete months in current year
    bool leap = (year % 4 == 0 && (year % 100 != 0 || year % 400 == 0));
    for (int m = 0; m < mon - 1; m++)
        days += (m == 1 && leap) ? 29 : dpm[m];
    days += mday - 1;
    return (time_t)(days * 86400L + hour * 3600 + min * 60 + sec);
}


/**
 * @brief Construct the Devices tab.
 *
 * @param tft Pointer to the TFT display driver.
 */
TabDevices::TabDevices(TFT_eSPI *tft) : Tab()
{
    name = "Devices";
    _tft = tft;
    nameWidth = _tft->textWidth(name.c_str());
    changed = true;
}

/**
 * @brief Draw the device list on screen.
 */
void TabDevices::draw()
{
    changed = false;
    _tft->fillRect(0, TAB_H - CORNER_RADIUS, _tft->width(), _tft->height() - TAB_H + CORNER_RADIUS, bgColor);

    _tft->setFreeFont(&FreeSans9pt7b);
    _tft->setTextColor(TFT_BLACK);

    // Header row — name/IP left-aligned, elapsed sub-cols right-aligned
    _tft->setTextDatum(TL_DATUM);
    _tft->drawString("Name", COL_NAME, TOP);
    _tft->drawString("IP",   COL_IP,   TOP);
    _tft->setTextDatum(TR_DATUM);
    _tft->drawString("h", COL_H_R, TOP);
    _tft->drawString("m", COL_M_R, TOP);
    _tft->drawString("s", COL_S_R, TOP);
    _tft->drawFastHLine(0, TOP + ROW_H - 2, _tft->width(), TFT_DARKGREY);

    if (fetching && deviceCount == 0)
    {
        _tft->setTextDatum(TL_DATUM);
        _tft->setTextColor(TFT_DARKGREY);
        _tft->drawString("Fetching...", COL_NAME, TOP + ROW_H + 4);
        return;
    }

    char buf[8];
    for (int i = 0; i < deviceCount && i < MAX_DEVICES; i++)
    {
        int y = TOP + ROW_H + 4 + i * ROW_H;
        _tft->setTextColor(TFT_BLACK);

        _tft->setTextDatum(TL_DATUM);
        _tft->drawString(devices[i].name.substring(0, 25).c_str(), COL_NAME, y);
        _tft->drawString(devices[i].ip.substring(0, 15).c_str(),   COL_IP,   y);

        _tft->setTextDatum(TR_DATUM);
        if (devices[i].elapsedSecs >= 0)
        {
            long sec = devices[i].elapsedSecs;
            snprintf(buf, sizeof(buf), "%02d", (int)((sec / 3600) % 24)); _tft->drawString(buf, COL_H_R, y);
            snprintf(buf, sizeof(buf), "%02d", (int)((sec / 60) % 60));   _tft->drawString(buf, COL_M_R, y);
            snprintf(buf, sizeof(buf), "%02d", (int)(sec % 60));           _tft->drawString(buf, COL_S_R, y);
        }
        else
        {
            _tft->drawString("?", COL_S_R, y);
        }
    }

    _tft->setTextDatum(TL_DATUM);
}

/**
 * @brief Periodic update loop; triggers a fetch every 60 seconds.
 */
void TabDevices::loop()
{
    // Trigger fetch on first entry and every 60s thereafter
    if (_lastFetch == 0 || millis() - _lastFetch > 60000)
        startFetch();

    // Redraw when fresh data arrives
    if (dataReady)
    {
        dataReady = false;
        draw();
    }
}

/**
 * @brief Handle touch input; tap anywhere to force a data refresh.
 *
 * @param x Touch X coordinate.
 * @param y Touch Y coordinate.
 * @param lastClick Milliseconds since the previous touch event.
 */
void TabDevices::handle(uint16_t x, uint16_t y, uint32_t lastClick)
{
    // Tap anywhere to force a refresh
    if (lastClick > 500 && !fetching)
    {
        _lastFetch = 0;
    }
}

/**
 * @brief Launch a background FreeRTOS task to fetch the device list.
 */
void TabDevices::startFetch()
{
    if (fetching)
        return;
    fetching = true;
    _lastFetch = millis();
    xTaskCreate(fetchTask, "devFetch", 12288, this, 1, nullptr);
}

/**
 * @brief FreeRTOS task that performs the HTTPS GET and parses the JSON response.
 *
 * @param param Pointer to the owning TabDevices instance.
 */
void TabDevices::fetchTask(void *param)
{
    TabDevices *self = static_cast<TabDevices *>(param);

    WiFiClientSecure client;
    client.setInsecure();
    HTTPClient http;
    xSemaphoreTake(httpsGuard, portMAX_DELAY);
    http.useHTTP10(true);
    http.begin(client, DEVICES_URL);
    http.setTimeout(20000);
    int code = http.GET();

    if (code == 200)
    {
        PsramJsonDocDev doc(32 * 1024);
        DeserializationError err = deserializeJson(doc, http.getStream());
        if (!err)
        {
            time_t now = getEpoch();
            int count = 0;
            for (JsonPair kv : doc.as<JsonObject>())
            {
                if (count >= MAX_DEVICES)
                    break;
                const char *name = kv.key().c_str();
                const char *ip = kv.value()["ip"] | "";
                const char *date = kv.value()["date"] | "";
                time_t t = parseISO8601(date);
                long elapsed = (t > 0) ? (long)(now - t) : -1;

                self->devices[count].name = String(name);
                self->devices[count].ip = String(ip);
                self->devices[count].elapsedSecs = elapsed;
                count++;
            }
            self->deviceCount = count;
            self->dataReady = true;
        }
        else
        {
            Report.printf("TabDevices JSON error: %s\n", err.c_str());
        }
    }
    else
    {
        Report.printf("TabDevices HTTP error: %d\n", code);
    }

    http.end();
    xSemaphoreGive(httpsGuard);
    self->fetching = false;
    vTaskDelete(nullptr);
}

#endif
