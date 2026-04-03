#include <Arduino.h>
#include <esp_sntp.h>
#include <WiFi.h>
#include "SerialMenu.h"
#include "Clock.h"
#include <WebSockets.h>

/**
 * @file Clock.cpp
 * @brief NTP time synchronization and time helpers.
 */

const char *ntpServer = "pool.ntp.org";

struct tm timeInfo;
time_t timeSinceEpoch;
char lastReboot[12] = "";
bool lastRebootFlag = false;

/**
 * @brief Connects to NTP server and synchronizes time.
 *
 * Attempts to resolve default NTP pool or fallback IP.
 * Sets the system time zone and configures automatic time updates.
 */
void setupTime()
{
    if (WiFi.status() != WL_CONNECTED)
    {
        printf("❌ Wi-Fi not connected. SNTP will fail.\n");
        return;
    }

    IPAddress ip;
    if (!WiFi.hostByName("pool.ntp.org", ip))
    {
        printf("❌ DNS resolution failed for pool.ntp.org\n");
        return;
    }
    printf("Resolved pool.ntp.org to ");
    Serial0.println(ip);

    const char *ntpServerIP = "123.45.67.89";

    sntp_setoperatingmode(SNTP_OPMODE_POLL);
    sntp_setservername(0, ntpServer);
    sntp_init();

    //! Set timezone immediately so when time syncs it is correct
    setenv("TZ", "PST8PDT,M3.2.0,M11.1.0", 1);
    tzset();

    printf("⏳ SNTP initialized, waiting for background sync...\n");
}

char *getLocalTime()
{
    static char str[12];
    time(&timeSinceEpoch);
    localtime_r(&timeSinceEpoch, &timeInfo);
    strftime(str, 12, "%m/%d %H:%M", &timeInfo);
    return str;
}

char *getFullDateTime()
{
    static char str[64] = "Not Set";
    if (timeSinceEpoch == 0)
        return str; //!< time not set yet
    time(&timeSinceEpoch);
    localtime_r(&timeSinceEpoch, &timeInfo);

    strftime(str, 64, "%A, %m/%d/%y at %H:%M (%Z)", &timeInfo);
    // strftime(str, 64, "%A, %B %d %Y %H:%M:%S zone %Z %z", &timeInfo);
    return str;
}

char *getRebootTime()
{
    return lastReboot;
}

time_t getEpoch()
{
    time(&timeSinceEpoch);
    return timeSinceEpoch;
}

void clockLoop()
{
    static unsigned long lastMillis = 0;
    if (millis() - lastMillis < 1000)
        return;
    lastMillis = millis();

    //! Capture reboot time once we have a valid time
    if (!lastRebootFlag && getEpoch() > 1000000000)
    {
        lastRebootFlag = true;
        strcpy(lastReboot, getLocalTime());
        printf("✅ Time synchronized. Local time: %s\n", getFullDateTime());
        SerialMenu.printMenu(MAIN_MENU);
        sendEvent("START", "Wifi started");
    }
}
