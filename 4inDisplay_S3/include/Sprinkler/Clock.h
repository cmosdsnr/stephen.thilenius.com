#ifndef SPRINKLER_CLOCK_H
#define SPRINKLER_CLOCK_H

#include "../Clock.h"

struct BoundaryData
{
    time_t boundary;
    uint8_t daysSinceBoundary;
    time_t dayStart;
    struct tm boundaryInfo;
};

struct SchedulePosition
{
    uint8_t daysSinceBoundary;
    uint16_t minutesIntoDay;
};

// needed from Clock.cpp in project specific Clock.cpp files
extern bool lastRebootFlag;
extern struct tm timeInfo;
extern time_t timeSinceEpoch;
extern BoundaryData boundaryData;

bool setBoundaryTime();
time_t getDayStart();
SchedulePosition getSchedulePosition();
uint8_t getDaysSinceBoundary();
time_t getBoundary();
#endif
