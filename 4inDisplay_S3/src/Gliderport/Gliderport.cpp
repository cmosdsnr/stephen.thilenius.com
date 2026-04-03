/**
 * @file Gliderport.cpp
 * @brief Gliderport module implementation.
 */

#ifdef GLIDERPORT
#include "Interrupts.h"
#include "Gliderport/GliderportTimer.h"
#include "Gliderport/Sensors.h"
#include "Tabs.h"
#include "Report.h"
#include "Display.h"
#include "DebugServer.h"
#include "Json.h"

uint16_t lastSpeedHigh = 0, lastDirectionHigh = 0, lastSpeedLow = 0, lastDirectionLow = 0;
u_int64_t lastWindReading = millis();

/**
 * @brief Initializes Gliderport specific hardware/logic.
 * @return void
 */
void gpSetup()
{
}

/**
 * @brief Main loop for Gliderport module.
 *
 * Handles periodic sensor readings (DHT, BMP) and updates
 * the active tab (Gliderport, Rose, Status) with new data.
 * @return void
 */
void gpLoop()
{
    static u_int64_t lastDhtReading = millis();
    if (millis() - lastDhtReading > 5000)
    {
        sensors.sampleDht11();
        sensors.sampleBmp();
        lastDhtReading = millis();
    }

    TabGliderport *tab = (TabGliderport *)tabs->tab[GLIDERPORT_TAB];
    TabRose *tabRose = (TabRose *)tabs->tab[ROSE_TAB];
    TabStatus *tabStatus = (TabStatus *)tabs->tab[STATUS_TAB];
    bool gpActive = tabs->tab[GLIDERPORT_TAB]->isActive;
    bool roseActive = tabs->tab[ROSE_TAB]->isActive;

    //! toggle needed blinking lights
    if (gpActive)
    {
        if (sawSpeedLow)
        {
            tab->setSpeedLow();
            sawSpeedLow = false;
        }
        if (sawSpeedHigh)
        {
            tab->setSpeedHigh();
            sawSpeedHigh = false;
        }
        if (sawDirectionHigh)
        {
            tab->setDirectionLow();
            sawDirectionHigh = false;
        }
        if (sawDirectionLow)
        {
            tab->setDirectionHigh();
            sawDirectionLow = false;
        }
    }
    if (sawSpeedHigh)
        sawSpeedHigh = false;

    lastSpeedHigh = speedHigh;
    //! record every full spin of the anemometer
    if (!readingDone && speedHigh > 0)
    {
        lastWindReading = millis();
        float dir = 143 - (360.0 * directionLow / speedHigh);
        if (dir < 0.0)
            dir += 360.0;
        float speed = 1337.6 / speedHigh; //!< convert to mph
        //! Report.printf("Wind speed: %.1f mph Direction: %.1f deg\n", speed, dir);

        sensors.recordWind(speed, dir);
        readingDone = true; //!< tell interrupt service routine to reset values
        if (roseActive)
        {
            //! Report.printf("Wind speed: %.1f mph Direction: %d deg\n", speed, (uint16_t)dir);
            tabRose->setSpeed(speed);
            tabRose->setDirection((uint16_t)dir);
        }
        //! Report.printf("speedLow: %d speedHigh: %d lastSpeedLow: %d lastSpeedHigh: %d ", speedLow, speedHigh, lastSpeedLow, lastSpeedHigh);
        //! Report.printf("directionLow: %d directionHigh: %d lastDirectionLow: %d lastDirectionHigh: %d\n", directionLow, directionHigh, lastDirectionLow, lastDirectionHigh);
        if (gpActive)
        {
            tab->updateTimes(speedLow, speedHigh, directionLow, directionHigh);
            tab->setDirection((uint16_t)dir);
            tab->setSpeed(speed);
        }
    }
}

#include <HTTPClient.h>
#include <ESPAsyncWebServer.h>

/**********************************************************************************/
void sendIpAddressToServer()
{
    HTTPClient http;
    static char serverPath[100];
    snprintf(serverPath, sizeof(serverPath), "http://192.168.88.11:8080/espIP/?ip=%s", ip.toString());
    http.begin(serverPath);
    int httpResponseCode = http.GET();

    if (httpResponseCode > 0)
    {
        printf("HTTP Response code: ");
        Serial0.println(httpResponseCode);
    }
    else
    {
        printf("Error code: ");
        Serial0.println(httpResponseCode);
    }
    http.end();
}

void addData(AsyncWebServerRequest *request)
{
    doc.clear();
    bmpData bmpData = sensors.getBmpData();
    JsonObject bmp = doc.createNestedObject("bmp");
    bmp["t"] = bmpData.temperature;
    bmp["p"] = bmpData.pressure;
    bmp["c"] = bmpData.count;

    dhtData dhtData = sensors.getDhtData();
    JsonObject dht = doc.createNestedObject("dht");
    dht["t"] = dhtData.temperature;
    dht["h"] = dhtData.humidity;
    dht["c"] = dhtData.count;

    windData windData = sensors.getWindData();
    JsonObject wind = doc.createNestedObject("wind");
    wind["s"] = windData.speed;
    wind["a"] = windData.direction;
    wind["c"] = windData.count;

    serializeJson(doc, str);
    AsyncWebServerResponse *response = request->beginResponse(200, "application/json", str);
    response->addHeader("Connection", "close");
    request->send(response);
}

/**********************************************************************************/
void pingMe(AsyncWebServerRequest *request)
{
    sendIpAddressToServer(); //!< server obviously already has the right address, but want the correct update to ocur anyhow
    AsyncWebServerResponse *response = request->beginResponse(200, "text/html", "<h3>sent</h3>");
    response->addHeader("Connection", "close");
    response->addHeader("Access-Control-Allow-Origin", "*");
    request->send(response);
}
#endif
