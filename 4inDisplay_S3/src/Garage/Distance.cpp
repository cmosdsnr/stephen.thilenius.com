/**
 * @file Distance.cpp
 * @brief Garage distance sensor implementation.
 */

/** This example shows how to get single-shot range
 measurements from the VL53L0X. The sensor can optionally be
 configured with different ranging profiles, as described in
 the VL53L0X API user manual, to get better performance for
 a certain application. This code is based on the four
 "SingleRanging" examples in the VL53L0X API.

 The range readings are in units of mm. */
#ifdef GARAGE

#include "Garage/Distance.h"
#include "Report.h"

VL53L0X sensor;
bool sensorFound = false;

void setupDistance()
{
    pinMode(48, INPUT_PULLUP);
    sensor.setTimeout(500);
    if (!sensor.init())
    {
        printf("Failed to detect and initialize sensor!\n");
        scanI2CDevices();
        return;
    }
    else
    {
        sensorFound = true;
        printf("VL53L0X Found\n");
    }

#if defined LONG_RANGE
    //! lower the return signal rate limit (default is 0.25 MCPS)
    sensor.setSignalRateLimit(0.1);
    //! increase laser pulse periods (defaults are 14 and 10 PCLKs)
    sensor.setVcselPulsePeriod(VL53L0X::VcselPeriodPreRange, 18);
    sensor.setVcselPulsePeriod(VL53L0X::VcselPeriodFinalRange, 14);
#endif

#if defined HIGH_SPEED
    //! reduce timing budget to 20 ms (default is about 33 ms)
    sensor.setMeasurementTimingBudget(20000);
#elif defined HIGH_ACCURACY
    //! increase timing budget to 200 ms
    sensor.setMeasurementTimingBudget(200000);
#endif
    printf("Distance: %d\n", sensor.readRangeSingleMillimeters());
}

static unsigned long lastReading = 0;

void distanceLoop()
{
    if (sensorFound && (unsigned long)(millis() - lastReading) > 2000)
    {
        lastReading = millis();
        writeVariable("distance", String(sensor.readRangeSingleMillimeters()));
        if (sensor.timeoutOccurred())
        {
            Report.print("Distance Sensor TIMEOUT, reset ESP\r\n");
        }
    }
}

uint16_t getDistance()
{
    if (sensorFound)
        return sensor.readRangeSingleMillimeters();
    return 0;
}

#endif
