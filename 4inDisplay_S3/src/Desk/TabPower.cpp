#ifdef DESK

/**
 * @file TabPower.cpp
 * @brief Power meter tab UI with 24-hour line chart and channel toggle buttons.
 */

#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>
#include <freertos/FreeRTOS.h>
#include <freertos/task.h>
#include <esp_heap_caps.h>

// Allocate the JSON document from PSRAM so the regular heap stays free for SSL
struct PsramAllocator
{
    void *allocate(size_t size) { return heap_caps_malloc(size, MALLOC_CAP_SPIRAM | MALLOC_CAP_8BIT); }
    void deallocate(void *ptr) { free(ptr); }
    void *reallocate(void *ptr, size_t new_size) { return heap_caps_realloc(ptr, new_size, MALLOC_CAP_SPIRAM | MALLOC_CAP_8BIT); }
};
using PsramJsonDoc = BasicJsonDocument<PsramAllocator>;

#include "Desk/TabPower.h"
#include "Tabs.h"
#include "Report.h"
#include "Buzzer.h"
#include "Desk/EpromData.h"
#include "SPIMutex.h"

// ── Chart geometry ──────────────────────────────────────────────────────────
#define CHART_X1 30                   // left edge (room for y-axis labels)
#define CHART_X2 475                  // right edge
#define CHART_W (CHART_X2 - CHART_X1) // 445 px
#define CHART_Y1 (TAB_H + 5)          // top edge  (≈70)
#define CHART_Y2 270                  // bottom edge
#define CHART_H (CHART_Y2 - CHART_Y1) // ≈200 px
#define XLABEL_Y (CHART_Y2 + 3)       // x-axis hour labels sit below the border

// ── Button geometry ─────────────────────────────────────────────────────────
#define BTN_Y 285 // 320 - BTN_H - 5 = 285 (5 px from screen bottom)
#define BTN_H 30
#define CH_BTN_W 60
#define CH_BTN_GAP 4
// channel button i starts at: i * (CH_BTN_W + CH_BTN_GAP)
// ch5 ends at:               5 * 64 + 60 = 380
#define REF_BTN_X 384
#define REF_BTN_W 92

// ── API ─────────────────────────────────────────────────────────────────────
#define PM_URL "https://stephen.stephen-c19.workers.dev/api/powerMeter/Hours?hours=24"

// ── Subtle gridline colour ───────────────────────────────────────────────────
#define GRID_COLOR 0x2104 // very dark grey

// ────────────────────────────────────────────────────────────────────────────

/**
 * @brief Construct the Power tab and load persisted channel selections.
 *
 * @param tft Pointer to the TFT display driver.
 */
TabPower::TabPower(TFT_eSPI *tft) : Tab()
{
    name = "Power";
    _tft = tft;
    nameWidth = _tft->textWidth(name.c_str());
    changed = true;
    uint8_t mask = loadPowerChannels();
    for (int i = 0; i < PM_NUM_CH; i++)
        _channelOn[i] = (mask >> i) & 0x01;
}

// ── draw ────────────────────────────────────────────────────────────────────

/**
 * @brief Draw the full Power tab: chart area, channel buttons, and refresh button.
 */
void TabPower::draw()
{
    changed = false;
    _tft->fillRect(0, TAB_H - CORNER_RADIUS,
                   _tft->width(), _tft->height() - TAB_H + CORNER_RADIUS,
                   bgColor);
    drawChart();
    for (int i = 0; i < PM_NUM_CH; i++)
        drawChannelButton(i);
    drawRefreshButton();
}

/**
 * @brief Render the line chart with gridlines, axis labels, and polylines for active channels.
 */
void TabPower::drawChart()
{
    // Border
    _tft->drawRect(CHART_X1, CHART_Y1, CHART_W, CHART_H, TFT_BLACK);

    if (dataPoints == 0)
    {
        _tft->setTextFont(2);
        _tft->setTextColor(TFT_DARKGREY);
        _tft->setCursor(CHART_X1 + 10, CHART_Y1 + CHART_H / 2 - 8);
        _tft->print(fetching ? "Fetching..." : "No data  -  tap Refresh");
        return;
    }

    // Find max across active channels (ignore zero-noise floor)
    float maxVal = 0.5f;
    for (int ch = 0; ch < PM_NUM_CH; ch++)
    {
        if (!_channelOn[ch])
            continue;
        for (int i = 0; i < dataPoints; i++)
            if (data[ch][i] > maxVal)
                maxVal = data[ch][i];
    }

    // Horizontal gridlines + Y labels (ticks at 1/3, 2/3, max — skip 0 to avoid border clash)
    _tft->setTextFont(1);
    _tft->setTextColor(TFT_BLACK);
    for (int t = 1; t <= 3; t++)
    {
        int py = CHART_Y2 - (int)((float)t / 3.0f * CHART_H);
        float val = maxVal * (float)t / 3.0f;
        _tft->drawFastHLine(CHART_X1 + 1, py, CHART_W - 2, GRID_COLOR);
        _tft->setCursor(0, py - 4);
        _tft->printf("%.1f", val);
    }

    // Label at the left border (startHour)
    _tft->setCursor(CHART_X1 + 1, XLABEL_Y);
    _tft->printf("%02d", startHour % 24);

    // Vertical gridlines + X labels at clock hours 0, 6, 12, 18 anchored to startHour.
    // Find the first multiple-of-6 hour that falls after startHour.
    int firstRound = ((startHour + 5) / 6) * 6;
    for (int slot = 0; slot < 4; slot++)
    {
        int roundHour = firstRound + slot * 6;
        int offset = roundHour - startHour; // hours from the left edge of the chart
        if (offset >= 24)
            break;

        int px = CHART_X1 + (int)((float)offset / 24.0f * CHART_W);
        int labelHr = roundHour % 24;

        // Skip gridline if it lands on or too close to the left border
        if (px - CHART_X1 > 15)
            _tft->drawFastVLine(px, CHART_Y1 + 1, CHART_H - 2, GRID_COLOR);

        // Center 2-digit label (font 1 ~6 px/char); clamp inside chart
        int labelX = max(px - 6, CHART_X1 + 1);
        _tft->setCursor(labelX, XLABEL_Y);
        _tft->printf("%02d", labelHr);
    }

    // Draw polyline for each active channel
    for (int ch = 0; ch < PM_NUM_CH; ch++)
    {
        if (!_channelOn[ch])
            continue;
        uint16_t color = PM_COLORS[ch];

        int prevX = CHART_X1;
        int prevY = CHART_Y2 - (int)(data[ch][0] / maxVal * (float)(CHART_H - 2));
        prevY = constrain(prevY, CHART_Y1 + 1, CHART_Y2 - 1);

        for (int i = 1; i < dataPoints; i++)
        {
            int x = CHART_X1 + (int)((float)i / (float)(PM_CHART_W - 1) * (CHART_W - 1));
            int y = CHART_Y2 - (int)(data[ch][i] / maxVal * (float)(CHART_H - 2));
            y = constrain(y, CHART_Y1 + 1, CHART_Y2 - 1);
            _tft->drawLine(prevX, prevY, x, y, color);
            prevX = x;
            prevY = y;
        }
    }
}

/**
 * @brief Draw a single channel toggle button.
 *
 * @param ch Channel index (0 to PM_NUM_CH-1).
 */
void TabPower::drawChannelButton(int ch)
{
    int bx = ch * (CH_BTN_W + CH_BTN_GAP);
    bool on = _channelOn[ch];
    uint16_t fill = on ? PM_COLORS[ch] : (uint16_t)TFT_DARKGREY;
    _tft->fillRoundRect(bx, BTN_Y, CH_BTN_W, BTN_H, 5, fill);
    _tft->drawRoundRect(bx, BTN_Y, CH_BTN_W, BTN_H, 5, TFT_WHITE);
    _tft->setTextFont(2);
    _tft->setTextColor(TFT_WHITE);
    _tft->setCursor(bx + 14, BTN_Y + 8);
    _tft->printf("ch%d", ch);
}

/**
 * @brief Draw the Refresh button, greyed out while a fetch is in progress.
 */
void TabPower::drawRefreshButton()
{
    uint16_t fill = fetching ? (uint16_t)TFT_DARKGREY : (uint16_t)TFT_NAVY;
    _tft->fillRoundRect(REF_BTN_X, BTN_Y, REF_BTN_W, BTN_H, 5, fill);
    _tft->drawRoundRect(REF_BTN_X, BTN_Y, REF_BTN_W, BTN_H, 5, TFT_WHITE);
    _tft->setTextFont(2);
    _tft->setTextColor(TFT_WHITE);
    _tft->setCursor(REF_BTN_X + 10, BTN_Y + 8);
    _tft->print(fetching ? "..." : "Refresh");
}

// ── loop ────────────────────────────────────────────────────────────────────

/**
 * @brief Periodic update loop; auto-fetches every 60 seconds and redraws on new data.
 */
void TabPower::loop()
{
    // Auto-fetch on first view and every 60 s
    if (_lastFetch == 0 || millis() - _lastFetch > 60000UL)
        startFetch();

    if (dataReady)
    {
        dataReady = false;
        draw();
    }
}

// ── handle ──────────────────────────────────────────────────────────────────

/**
 * @brief Handle touch input on channel toggle and refresh buttons.
 *
 * @param x Touch X coordinate.
 * @param y Touch Y coordinate.
 * @param lastClick Milliseconds since the previous touch event.
 */
void TabPower::handle(uint16_t x, uint16_t y, uint32_t lastClick)
{
    if (lastClick < 300)
        return;
    if (y < BTN_Y || y >= BTN_Y + BTN_H)
        return;

    quickBeep();

    // Channel toggle buttons
    for (int ch = 0; ch < PM_NUM_CH; ch++)
    {
        int bx = ch * (CH_BTN_W + CH_BTN_GAP);
        if (x >= (uint16_t)bx && x < (uint16_t)(bx + CH_BTN_W))
        {
            _channelOn[ch] = !_channelOn[ch];
            uint8_t mask = 0;
            for (int i = 0; i < PM_NUM_CH; i++)
                if (_channelOn[i])
                    mask |= (1 << i);
            savePowerChannels(mask);
            drawChannelButton(ch);
            // Redraw chart area without full screen clear
            _tft->fillRect(CHART_X1 + 1, CHART_Y1 + 1, CHART_W - 2, CHART_H - 2, bgColor);
            drawChart();
            return;
        }
    }

    // Refresh button
    if (x >= REF_BTN_X && !fetching)
    {
        _lastFetch = 0; // will trigger startFetch() on next loop()
    }
}

// ── fetch ────────────────────────────────────────────────────────────────────

/**
 * @brief Launch a background FreeRTOS task to fetch 24-hour power data.
 */
void TabPower::startFetch()
{
    if (fetching)
        return;
    fetching = true;
    _lastFetch = millis();
    drawRefreshButton();
    xTaskCreate(fetchTask, "pwrFetch", 16384, this, 1, nullptr);
}

/**
 * @brief FreeRTOS task that performs the HTTPS GET, parses JSON, and downsamples data.
 *
 * @param param Pointer to the owning TabPower instance.
 */
void TabPower::fetchTask(void *param)
{
    TabPower *self = static_cast<TabPower *>(param);

    WiFiClientSecure client;
    client.setInsecure();
    HTTPClient http;
    xSemaphoreTake(httpsGuard, portMAX_DELAY);
    http.useHTTP10(true);
    http.begin(client, PM_URL);
    http.setTimeout(20000);
    int code = http.GET();

    if (code == 200)
    {
        // Allocate document in PSRAM, keeping the regular heap free for SSL
        PsramJsonDoc *doc = new PsramJsonDoc(200 * 1024);
        if (!doc)
        {
            Report.println("TabPower: JSON alloc failed");
        }
        else
        {
            DeserializationError err = deserializeJson(*doc, http.getStream());
            if (err)
            {
                Report.printf("TabPower JSON error: %s\n", err.c_str());
            }
            else
            {
                JsonArray amperages = (*doc)["amperages"].as<JsonArray>();
                int total = (int)amperages.size(); // ~1440 for 24 h

                if (total > 0)
                {
                    // Temporary per-channel accumulation buffers (heap)
                    float *sums = (float *)calloc(PM_NUM_CH, sizeof(float));
                    float *out = (float *)calloc(PM_NUM_CH * PM_CHART_W, sizeof(float));

                    if (sums && out)
                    {
                        int outIdx = 0;
                        int inCount = 0; // rows accumulated into current bucket

                        int minuteIdx = 0;
                        for (JsonArray row : amperages)
                        {
                            int ch = 0;
                            for (float raw : row)
                            {
                                if (ch < PM_NUM_CH)
                                {
                                    // Match frontend scaling: ch2 uses raw/2
                                    float val = (ch == 2) ? raw / 2.0f : raw;
                                    sums[ch] += val;
                                }
                                ch++;
                            }
                            inCount++;
                            minuteIdx++;

                            // Flush bucket when we pass the next output pixel boundary
                            int nextOut = (minuteIdx * PM_CHART_W) / total;
                            if (nextOut > outIdx && outIdx < PM_CHART_W)
                            {
                                for (int c = 0; c < PM_NUM_CH; c++)
                                {
                                    out[c * PM_CHART_W + outIdx] = sums[c] / (float)inCount;
                                    sums[c] = 0.0f;
                                }
                                inCount = 0;
                                outIdx++;
                            }
                        }

                        // Copy result into self->data
                        for (int c = 0; c < PM_NUM_CH; c++)
                            memcpy(self->data[c], out + c * PM_CHART_W, PM_CHART_W * sizeof(float));

                        // Derive local UTC offset from the running clock.
                        // tzset() must be called in each FreeRTOS task for DST to apply.
                        tzset();
                        time_t now = time(nullptr);
                        struct tm lnow, gnow;
                        localtime_r(&now, &lnow);
                        gmtime_r(&now, &gnow);
                        int utcOffset = lnow.tm_hour - gnow.tm_hour;
                        if (utcOffset > 12)
                            utcOffset -= 24;
                        if (utcOffset < -12)
                            utcOffset += 24;

                        long startUTCHour = (*doc)["start"].as<long>();
                        self->startHour = (int)((startUTCHour % 24 + utcOffset + 24) % 24);
                        self->dataPoints = outIdx;
                        self->dataReady = true;
                    }
                    else
                    {
                        Report.println("TabPower: buffer alloc failed");
                    }

                    free(sums);
                    free(out);
                }
            }
            delete doc;
        }
    }
    else
    {
        Report.printf("TabPower HTTP error: %d\n", code);
    }

    http.end();
    xSemaphoreGive(httpsGuard);
    self->fetching = false;
    vTaskDelete(nullptr);
}

#endif
