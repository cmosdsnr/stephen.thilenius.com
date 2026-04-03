#ifdef GLIDERPORT
#include <Arduino.h>
#include "Gliderport/Readings.h"

Readings readings;

// #define DEBUG

void Readings::reset()
{
    count = 0;
    windVector.x = 0;
    windVector.y = 0;
}

void Readings::recordWind(float spd, float dir)
{
    if (reportSpeed)
        Serial0.printf("recordWind: spd=%f dir=%f average speed=%f angle=%f count=%d\n", spd, dir, speed, angle, count);
    if (count == 0xfe)
    {
        count >>= 1;
        windVector.x /= 2.0;
        windVector.y /= 2.0;
    }
    count++;

    float rad = dir * 3.14159265 / 180.0;
    windVector.x += spd * cos(rad);
    windVector.y += spd * sin(rad);
    speed = sqrt(windVector.x * windVector.x + windVector.y * windVector.y) / count;
    angle = atan2(windVector.y, windVector.x) * 180.0 / 3.14159265;
    if (angle < 0)
        angle += 360.0;
    count++;
}

windData Readings::getWindData()
{
    windData result;
    result.count = count;
    result.speed = speed;
    result.direction = angle;
    reset();
    return result;
}
#endif