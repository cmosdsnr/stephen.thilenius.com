#ifdef DESK

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

#define DEVICES_URL "https://stephen.stephen-c19.workers.dev/api/espList"
#define ROW_H 18
#define TOP (TAB_H + 10)
#define COL_NAME 5
#define COL_IP 290
#define COL_ELAPSED 390

/**
 * @brief Parse an ISO8601 UTC timestamp string to a time_t epoch.
 *        Format: "2026-04-01T17:40:12.208Z"
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
 * @brief Format elapsed seconds into "Xd HH:MM:SS" or "HH:MM:SS".
 */
static String formatElapsed(long secs)
{
    if (secs < 0) secs = 0;
    long s = secs % 60;
    long m = (secs / 60) % 60;
    long h = (secs / 3600) % 24;
    long d = secs / 86400;

    char buf[32];
    if (d > 0)
        snprintf(buf, sizeof(buf), "%ldd %02ld:%02ld:%02ld", d, h, m, s);
    else
        snprintf(buf, sizeof(buf), "%02ld:%02ld:%02ld", h, m, s);
    return String(buf);
}

TabDevices::TabDevices(TFT_eSPI *tft) : Tab()
{
    name = "Devices";
    bgColor = 0xf7de;
    _tft = tft;
    nameWidth = _tft->textWidth(name.c_str());
    changed = true;
}

void TabDevices::draw()
{
    changed = false;
    _tft->fillRect(0, TAB_H - CORNER_RADIUS, _tft->width(), _tft->height() - TAB_H + CORNER_RADIUS, bgColor);

    _tft->setTextFont(2);
    _tft->setTextColor(TFT_BLACK);

    // Header row
    _tft->setCursor(COL_NAME, TOP);
    _tft->print("Name");
    _tft->setCursor(COL_IP, TOP);
    _tft->print("IP");
    _tft->setCursor(COL_ELAPSED, TOP);
    _tft->print("Last Seen");
    _tft->drawFastHLine(0, TOP + ROW_H - 2, _tft->width(), TFT_DARKGREY);

    if (fetching && deviceCount == 0)
    {
        _tft->setCursor(COL_NAME, TOP + ROW_H + 4);
        _tft->setTextColor(TFT_DARKGREY);
        _tft->print("Fetching...");
        return;
    }

    for (int i = 0; i < deviceCount && i < MAX_DEVICES; i++)
    {
        int y = TOP + ROW_H + 4 + i * ROW_H;
        _tft->setTextColor(TFT_BLACK);
        _tft->setCursor(COL_NAME, y);
        _tft->print(devices[i].name.substring(0, 35)); // truncate long names
        _tft->setCursor(COL_IP, y);
        _tft->print(devices[i].ip);
        _tft->setCursor(COL_ELAPSED, y);
        _tft->print(devices[i].elapsed);
    }
}

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

void TabDevices::handle(uint16_t x, uint16_t y, uint32_t lastClick)
{
    // Tap anywhere to force a refresh
    if (lastClick > 500 && !fetching)
    {
        _lastFetch = 0;
    }
}

void TabDevices::startFetch()
{
    if (fetching)
        return;
    fetching = true;
    _lastFetch = millis();
    xTaskCreate(fetchTask, "devFetch", 12288, this, 1, nullptr);
}

void TabDevices::fetchTask(void *param)
{
    TabDevices *self = static_cast<TabDevices *>(param);

    WiFiClientSecure client;
    client.setInsecure();
    HTTPClient http;
    http.useHTTP10(true);
    http.begin(client, DEVICES_URL);
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
                self->devices[count].elapsed = (elapsed >= 0) ? formatElapsed(elapsed) : "?";
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
    self->fetching = false;
    vTaskDelete(nullptr);
}

#endif
