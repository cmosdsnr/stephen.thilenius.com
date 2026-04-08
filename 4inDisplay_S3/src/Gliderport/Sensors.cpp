/**
 * @file Sensors.cpp
 * @brief Gliderport sensor implementation.
 */

#ifdef GLIDERPORT
#include <Arduino.h>
#include "devkit_pins.h"
#include "WebSockets.h"
#include "WebSerial.h"
#include "Json.h"
#include "Gliderport/Sensors.h"
#include "SocketCodes.h"

Sensors sensors;

/**
 * @brief Constructs the Sensors manager and initializes DHT sensor.
 */
Sensors::Sensors() : dht(new DHT(DHT_PIN, DHT_TYPE))
{
    dht->begin();

    dhtReading.temperature = 0;
    dhtReading.humidity = 0;
    dhtReading.count = 0;
    //! BMP will be initialized later when I2C is ready
    bmp = nullptr;
    bmpReading.temperature = 0;
    bmpReading.pressure = 0;
    bmpReading.count = 0;

    windReading.speed = 0;
    windReading.direction = 0;
    windReading.count = 0;
    windReading.windVector.x = 0;
    windReading.windVector.y = 0;
}

/**
 * @brief Initializes the BMP280 and verifies the DHT11 sensor.
 */
void Sensors::initBMP()
{

    if (!isnan(dht->readHumidity()))
    {
        printf("DHT11 found.\n");
        sampleDht11();
        dhtFound = true;
    }
    else
    {
        printf("DHT11 not found!\n");
        dhtFound = false;
    }

    bmp = new Adafruit_BMP280();
    if (!bmp->begin(0x76))
    {
        bmpFound = false;
        printf("BMP280 not found! (SDA=%d, SCL=%d)\n", SDA_PIN, SCL_PIN);
        delete bmp;
        bmp = nullptr;
        return;
    }
    else
    {
        //! Default settings
        bmp->setSampling(Adafruit_BMP280::MODE_NORMAL,     //!< Operating Mode
                         Adafruit_BMP280::SAMPLING_X2,     //!< Temp oversampling
                         Adafruit_BMP280::SAMPLING_X16,    //!< Pressure oversampling
                         Adafruit_BMP280::FILTER_X16,      //!< Filtering
                         Adafruit_BMP280::STANDBY_MS_500); //!< Standby time

        printf("BMP280 found.\n");
        sampleBmp();
        bmpFound = true;
    }
}

/**
 * @brief Returns averaged DHT data and optionally resets accumulators.
 *
 * @param reset If true, resets the accumulated readings after retrieval.
 * @return dhtData Averaged temperature and humidity with sample count.
 */
dhtData Sensors::getDhtData(bool reset)
{
    dhtData result;
    result.count = dhtReading.count;
    result.temperature = dhtReading.count ? dhtReading.temperature / dhtReading.count : 0;
    result.humidity = dhtReading.count ? dhtReading.humidity / dhtReading.count : 0;
    if (reset)
    {
        dhtReading.count = 0;
        dhtReading.temperature = 0;
        dhtReading.humidity = 0;
    }
    return result;
}

/**
 * @brief Returns averaged BMP data and optionally resets accumulators.
 *
 * @param reset If true, resets the accumulated readings after retrieval.
 * @return bmpData Averaged temperature and pressure with sample count.
 */
bmpData Sensors::getBmpData(bool reset)
{
    bmpData result;
    result.temperature = bmpReading.count ? bmpReading.temperature / bmpReading.count : 0;
    result.pressure = bmpReading.count ? bmpReading.pressure / bmpReading.count : 0;
    result.count = bmpReading.count;
    if (reset)
    {
        bmpReading.count = 0;
        bmpReading.temperature = 0;
        bmpReading.pressure = 0;
    }
    return result;
}

/**
 * @brief Resets all accumulated DHT and BMP readings to zero.
 */
void Sensors::reset()
{
    dhtReading.count = 0;
    dhtReading.temperature = 0;
    dhtReading.humidity = 0;
    bmpReading.count = 0;
    bmpReading.temperature = 0;
    bmpReading.pressure = 0;
}

/**
 * @brief Samples the DHT11 sensor and accumulates the reading.
 *
 * @return true if a valid reading was obtained, false otherwise.
 */
bool Sensors::sampleDht11()
{
    sendChanges();

    float h = dht->readHumidity();
    float t = dht->readTemperature(true);

    if (!isnan(h) && !isnan(t))
    {
        dhtFound = true;
        dhtReading.humidity += h;
        dhtReading.temperature += t;
        dhtReading.count++;
        sendChanges();
        return true;
    }
    else
    {
        dhtFound = false;
        return false;
    }
}

/**
 * @brief Samples the BMP280 sensor and accumulates the reading.
 *
 * @return true if a valid reading was obtained, false if BMP is not initialized.
 */
bool Sensors::sampleBmp()
{
    if (bmp)
    {
        float temp = 32.0 + (9.0 / 5.0) * bmp->readTemperature(); //!< °F
        float pressure = bmp->readPressure();                     //!< Pa
        float altitude = bmp->readAltitude(1013.25);              //!< meters

        bmpReading.temperature += temp;
        bmpReading.pressure += pressure;
        bmpReading.count++;
        sendChanges();
        return true; //!< Return true if successful
    }
    else
    {
        return false;
    }
}

/**
 * @brief Records a wind speed and direction sample using vector averaging.
 *
 * @param spd Wind speed in mph.
 * @param dir Wind direction in degrees.
 */
void Sensors::recordWind(float spd, float dir)
{
    if (reportSpeed)
        printf("recordWind: spd=%f dir=%f average speed=%f angle=%f count=%d\n", spd, dir, windReading.speed, windReading.direction, windReading.count);

    if (windReading.count >= 0x0ffe)
    {
        windReading.count >>= 1;
        windReading.windVector.x /= 2.0;
        windReading.windVector.y /= 2.0;
    }

    float rad = dir * 3.14159265 / 180.0;
    windReading.windVector.x += spd * cos(rad);
    windReading.windVector.y += spd * sin(rad);

    windReading.count++;

    windReading.speed = sqrt(windReading.windVector.x * windReading.windVector.x + windReading.windVector.y * windReading.windVector.y) / windReading.count;
    windReading.direction = atan2(windReading.windVector.y, windReading.windVector.x) * 180.0 / 3.14159265;
    if (windReading.direction < 0)
        windReading.direction += 360.0;
}

/**
 * @brief Returns accumulated wind data and optionally resets accumulators.
 *
 * @param reset If true, resets the accumulated wind readings after retrieval.
 * @return windData Current wind speed, direction, count, and vector.
 */
windData Sensors::getWindData(bool reset)
{

    windData result = windReading;
    if (reset)
    {
        windReading.count = 0;
        windReading.speed = 0;
        windReading.direction = 0;
        windReading.windVector = {0, 0};
    }
    return result;
}

/**
 * @brief Sends changed sensor data to connected WebSocket clients.
 *
 * @return true if changes were detected and sent, false otherwise.
 */
bool Sensors::sendChanges()
{

    if (ws.count() == 0)
        return false; //!< if no clients, quit
    doc.clear();
    doc["code"] = SocketCode::VARIABLES;
    JsonObject variables = doc.createNestedObject("variables");

    if (ws.count() == 0)
        return false; //!< if no clients, quit

    bool windChanged = (lastReading.count != windReading.count || lastReading.speed != windReading.speed || lastReading.direction != windReading.direction);
    bool bmpChanged = (bmpFoundLast != bmpFound || lastBmpReading.count != bmpReading.count || lastBmpReading.temperature != bmpReading.temperature || lastBmpReading.pressure != bmpReading.pressure);
    bool dhtChanged = (dhtFoundLast != dhtFound || lastDhtReading.count != dhtReading.count || lastDhtReading.temperature != dhtReading.temperature || lastDhtReading.humidity != dhtReading.humidity);

    if (windChanged || bmpChanged || dhtChanged)
    {
        if (windChanged)
        {
            JsonObject w = variables.createNestedObject("Wind Data");
            w["speed"] = serialized(String(windReading.speed, 2));
            w["direction"] = serialized(String(windReading.direction, 2));
            w["count"] = windReading.count;

            JsonObject x = w.createNestedObject("Vector");
            x["x"] = serialized(String(windReading.windVector.x, 2));
            x["y"] = serialized(String(windReading.windVector.y, 2));
        }
        if (bmpChanged)
        {
            JsonObject b = variables.createNestedObject("BMP Data");
            if (bmpFound)
            {
                b["is Present"] = "Yes";
                b["temperature"] = serialized(String(bmpReading.count ? bmpReading.temperature / bmpReading.count : 0, 2));
                b["pressure"] = serialized(String(bmpReading.count ? bmpReading.pressure / bmpReading.count : 0, 2));
                b["count"] = bmpReading.count;
            }
            else
            {
                b["is Present"] = "No";
                b["temperature"] = serialized(String(bmpReading.count ? bmpReading.temperature / bmpReading.count : 0, 2));
                b["pressure"] = serialized(String(bmpReading.count ? bmpReading.pressure / bmpReading.count : 0, 2));
                b["count"] = bmpReading.count;
            }
        }
        if (dhtChanged)
        {
            JsonObject d = variables.createNestedObject("DHT11 Data");
            if (dhtFound)
            {
                d["is Present"] = "Yes";
                d["temperature"] = serialized(String(dhtReading.count ? dhtReading.temperature / dhtReading.count : 0, 2));
                d["humidity"] = serialized(String(dhtReading.count ? dhtReading.humidity / dhtReading.count : 0, 2));
                d["count"] = dhtReading.count;
            }
            else
            {
                d["is Present"] = "No";
            }
        }

        return true;
    }
    else
        return false; //!< if nothing changed, don't send
    serializeJson(doc, str);
    ws.textAll(str);
    return true;
}

/**
 * @brief Adds all sensor data (wind, BMP, DHT) to a JSON object.
 *
 * @param variables JSON object to populate with sensor readings.
 */
void Sensors::addAllData(JsonObject variables)
{
    JsonObject w = variables.createNestedObject("Wind Data");
    w["speed"] = serialized(String(windReading.speed, 2));
    w["direction"] = serialized(String(windReading.direction, 2));
    w["count"] = windReading.count;

    JsonObject x = w.createNestedObject("Vector");
    x["x"] = serialized(String(windReading.windVector.x, 2));
    x["y"] = serialized(String(windReading.windVector.y, 2));

    JsonObject b = variables.createNestedObject("BMP Data");
    if (bmpFound)
    {
        b["is Present"] = "Yes";
        b["temperature"] = serialized(String(bmpReading.count ? bmpReading.temperature / bmpReading.count : 0, 2));
        b["pressure"] = serialized(String(bmpReading.count ? bmpReading.pressure / bmpReading.count : 0, 2));
        b["count"] = bmpReading.count;
    }
    else
    {
        b["is Present"] = "No";
        b["temperature"] = serialized(String(bmpReading.count ? bmpReading.temperature / bmpReading.count : 0, 2));
        b["pressure"] = serialized(String(bmpReading.count ? bmpReading.pressure / bmpReading.count : 0, 2));
        b["count"] = bmpReading.count;
    }

    JsonObject d = variables.createNestedObject("DHT11 Data");
    if (dhtFound)
    {
        d["is Present"] = "Yes";
        d["temperature"] = serialized(String(dhtReading.count ? dhtReading.temperature / dhtReading.count : 0, 2));
        d["humidity"] = serialized(String(dhtReading.count ? dhtReading.humidity / dhtReading.count : 0, 2));
        d["count"] = dhtReading.count;
    }
    else
    {
        d["is Present"] = "No";
    }
}

#endif
