#ifndef READINGS_H
#define READINGS_H

#include <Arduino.h>
#include "Gliderport/GliderportTimer.h"

struct windData
{
    float speed;
    float direction;
    uint16_t count;
};

struct point
{
    float x, y;
};

// #define DEBUG
class Readings
{
    // ALL TIMES ARE IN # OF INTERRUPTS!! convert before sending!
private:
    uint8_t count; // number of readings seen
    uint32_t angle;
    uint32_t speed;
    point windVector;

public:
    uint8_t getCount() { return count; }
    float getSpeed() { return speed; }
    uint16_t getDirection() { return angle; };
    void reset();
    void recordWind(float spd, float dir);
    windData getWindData();
    bool reportSpeed = false;
};

extern Readings readings;

#endif