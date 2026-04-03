#ifndef TAB_POWER_H
#define TAB_POWER_H
#include <Arduino.h>
#include <TFT_eSPI.h>
#include "Tab.h"

#define PM_NUM_CH   6
#define PM_CHART_W  440   // downsampled data points (one per chart pixel approx.)

// RGB565 colors matching the web frontend palette
static const uint16_t PM_COLORS[PM_NUM_CH] = {
    0x1B3B,  // ch0  #3366CC  blue
    0xD8A4,  // ch1  #DC3912  red-orange
    0xFD20,  // ch2  #FF9900  orange
    0x0A63,  // ch3  #109618  green
    0x8010,  // ch4  #990099  purple
    0x04F3,  // ch5  #0099C6  cyan
};

/**
 * @brief Power meter tab — fetches 24h history and renders a line chart.
 *
 * Data is fetched via HTTPS (FreeRTOS background task) from the Cloudflare
 * relay so the display loop is never blocked.  Six channel-toggle buttons
 * and a Refresh button are shown below the chart.
 */
class TabPower : public Tab
{
public:
    TabPower(TFT_eSPI *tft);
    void draw() override;
    void loop() override;
    void handle(uint16_t x, uint16_t y, uint32_t lastClick) override;

    // Written by fetch task, read by draw() — guarded by dataReady flag
    float data[PM_NUM_CH][PM_CHART_W];
    volatile int  dataPoints = 0;
    volatile bool fetching   = false;
    volatile bool dataReady  = false;
    int startHour = 0;   // hour-of-day (0-23) of the first data point

private:
    TFT_eSPI *_tft;
    bool          _channelOn[PM_NUM_CH];
    unsigned long _lastFetch = 0;

    void startFetch();
    static void fetchTask(void *param);

    void drawChart();
    void drawChannelButton(int ch);
    void drawRefreshButton();
};

#endif
