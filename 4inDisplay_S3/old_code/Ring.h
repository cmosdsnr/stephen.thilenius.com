#ifndef CLASSES_H
#define CLASSES_H
#include <Arduino.h>

class Ring
{

public:
    Ring(int _x, int _y, int _r, int _w, int _ringColor, int _backgroundColor, int _disabledColor, int _enabledColor, const uint8_t *_bits, int _width, int _height);

    void begin();

    void fillToDeg(uint16_t deg);

    void Increment();

    void Reset();

    void flashOrange();

    void flashBlack();

    void drawX();

    void clear();

private:
    bool go;
    int seg, x, y, r, w;
    int width, height;
    const uint8_t *bits;
    unsigned int color;
    int ringColor;
    int disabledColor;
    int backgroundColor;
    int enabledColor;
};

#endif