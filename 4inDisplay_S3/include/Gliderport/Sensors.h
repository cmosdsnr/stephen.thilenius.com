/**
 * @file Sensors.h
 * @brief Gliderport sensor aggregation and reporting.
 */

#ifndef SENSORS_H
#define SENSORS_H

#include <ArduinoJson.h>
#include <Arduino.h>
#include "devkit_pins.h"

#include <DHT.h>
#define DHT_TYPE DHT11

#include <Adafruit_BMP280.h>
/**
 * @brief 2D vector point.
 */
struct point
{
    float x, y;
};
/**
 * @brief Wind data sample.
 */
struct windData
{
    float speed;
    float direction;
    uint16_t count;
    point windVector;
};

/**
 * @brief DHT sensor data sample.
 */
struct dhtData
{
    float temperature;
    float humidity;
    uint16_t count;
};

/**
 * @brief BMP sensor data sample.
 */
struct bmpData
{
    float temperature;
    float pressure;
    uint16_t count;
};

/**
 * @brief Sensor manager for DHT, BMP, and wind data.
 */
class Sensors
{
private:
    DHT *dht = nullptr;
    Adafruit_BMP280 *bmp = nullptr;
    bmpData bmpReading;
    dhtData dhtReading;
    windData windReading;
    bool bmpFound = false;
    bool dhtFound = false;

    bool bmpFoundLast = false;
    bool dhtFoundLast = false;
    windData lastReading = {0, 0, 0, {0, 0}};
    bmpData lastBmpReading = {0, 0, 0};
    dhtData lastDhtReading = {0, 0, 0};

public:
    /**
     * @brief Create a sensor manager.
     */
    Sensors();
    /**
     * @brief Initialize BMP sensor.
     */
    void initBMP();

    /**
     * @brief Sample the DHT11 sensor.
     * @return True if a valid sample was read
     */
    bool sampleDht11();
    /**
     * @brief Sample the BMP sensor.
     * @return True if a valid sample was read
     */
    bool sampleBmp();
    /**
     * @brief Record a wind sample.
     * @param spd Wind speed
     * @param dir Wind direction
     */
    void recordWind(float spd, float dir);

    /**
     * @brief Get accumulated wind data.
     * @param reset Reset counters after read
     * @return Wind data sample
     */
    windData getWindData(bool reset = true);
    /**
     * @brief Get accumulated DHT data.
     * @param reset Reset counters after read
     * @return DHT data sample
     */
    dhtData getDhtData(bool reset = true);
    /**
     * @brief Get accumulated BMP data.
     * @param reset Reset counters after read
     * @return BMP data sample
     */
    bmpData getBmpData(bool reset = true);

    /**
     * @brief Send changes to connected clients.
     * @return True if changes were sent
     */
    bool sendChanges();
    /**
     * @brief Add all sensor data to a JSON payload.
     * @param variables JSON object to populate
     */
    void addAllData(JsonObject variables);
    /**
     * @brief Reset accumulated readings.
     */
    void reset();
    bool reportSpeed = false;
};

/**
 * @brief Global sensor manager instance.
 */
extern Sensors sensors;
#endif
