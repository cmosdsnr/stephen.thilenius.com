#ifndef TAB_STATUS_STRUCTS_H
#define TAB_STATUS_STRUCTS_H

#include "Arduino.h"

struct Point
{
    int x;
    int y;
};

struct Size
{
    int width;
    int height;
};

struct Date
{
    char day[3];
    char month[3];
};

struct Channel
{
    Point position;
    Size size;
    Date date;
    uint16_t color;
};

#endif
