#ifndef TAB_DEVICES_H
#define TAB_DEVICES_H
#include <Arduino.h>
#include <TFT_eSPI.h>
#include "Tab.h"

#define MAX_DEVICES 20

struct DeviceEntry
{
    String name;
    String ip;
    long elapsedSecs = -1;
};

/**
 * @brief Devices tab — polls the ESP registry and lists all active devices.
 */
class TabDevices : public Tab
{
public:
    TabDevices(TFT_eSPI *tft);
    void draw() override;
    void loop() override;
    void handle(uint16_t x, uint16_t y, uint32_t lastClick) override;

    // Written by fetch task, read by draw()
    DeviceEntry devices[MAX_DEVICES];
    int deviceCount = 0;
    volatile bool dataReady = false;
    volatile bool fetching = false;

private:
    TFT_eSPI *_tft;
    unsigned long _lastFetch = 0;

    void startFetch();
    static void fetchTask(void *param);
};

#endif
