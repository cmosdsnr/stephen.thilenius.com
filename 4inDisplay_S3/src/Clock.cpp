#include <Arduino.h>
#include <esp_sntp.h>
#include <WiFi.h>
#include "SerialMenu.h"
#include "Clock.h"
#include <WebSockets.h>
#include "Networks.h"
#include "Report.h"

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
        Report.printf("❌ Wi-Fi not connected. SNTP will fail.\n");
        return;
    }

    IPAddress ip;
    if (!WiFi.hostByName("pool.ntp.org", ip))
    {
        Report.printf("❌ DNS resolution failed for pool.ntp.org\n");
        return;
    }
    Report.printf("Resolved pool.ntp.org to %s\n", ip.toString().c_str());

    if (sntp_enabled())
        sntp_stop();
    sntp_setoperatingmode(SNTP_OPMODE_POLL);
    sntp_setservername(0, ntpServer);
    sntp_init();

    //! Set timezone immediately so when time syncs it is correct
    setenv("TZ", "PST8PDT,M3.2.0,M11.1.0", 1);
    tzset();

    Report.printf("⏳ SNTP initialized, waiting for background sync...\n");
}

/**
 * @brief Writes the current local time into a caller-supplied buffer.
 *
 * @param buf Buffer to write into.
 * @param len Size of buf in bytes (minimum 12).
 */
void getLocalTime(char *buf, size_t len)
{
    time(&timeSinceEpoch);
    localtime_r(&timeSinceEpoch, &timeInfo);
    strftime(buf, len, "%m/%d %H:%M", &timeInfo);
}

/**
 * @brief Returns the full date and time as a formatted string.
 *
 * @return Pointer to a static buffer containing the date/time, or "Not Set" if time has not been synchronized.
 */
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

/**
 * @brief Returns the time at which the device last rebooted.
 *
 * @return Pointer to a static buffer containing the reboot time string.
 */
char *getRebootTime()
{
    return lastReboot;
}

/**
 * @brief Returns the current time as seconds since the Unix epoch.
 *
 * @return Current epoch time.
 */
time_t getEpoch()
{
    time(&timeSinceEpoch);
    return timeSinceEpoch;
}

/**
 * @brief Periodic clock loop that captures reboot time once NTP syncs.
 *
 * Should be called from the main loop. Runs once per second and records
 * the reboot timestamp after the first successful time synchronization.
 */
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
        getLocalTime(lastReboot, sizeof(lastReboot));
        Report.printf("✅ Time synchronized. Local time: %s\n", getFullDateTime());
        SerialMenu.printMenu(MAIN_MENU);
        sendEvent("WiFi", "Wifi started");
        extern char bootDiag[];
        sendEvent("Boot", bootDiag);
    }

    //! Heartbeat to backend every 5 minutes (only after NTP sync)
    static unsigned long lastHeartbeat = 0;
    if (lastRebootFlag && millis() - lastHeartbeat > 300000)
    {
        lastHeartbeat = millis();
        extern Networks *wifiNetworks;
        wifiNetworks->sendHeartbeat();
    }
}
