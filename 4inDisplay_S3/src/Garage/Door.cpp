/**
 * @file Door.cpp
 * @brief Garage door control implementation.
 */

#ifdef GARAGE
#include "devkit_s3_pins.h"
#include "Garage/Door.h"

Door::Door(uint8_t doorPin)
{
    _doorPin = doorPin;
    pinMode(_doorPin, OUTPUT);
    lastButtonPress = 0;
}

void Door::Press()
{
    if (millis() - lastButtonPress > 1500)
    {
        digitalWrite(_doorPin, HIGH);
        delay(1000);
        digitalWrite(_doorPin, LOW);
        lastButtonPress = millis();
    }
}

Door *door = new Door(DOOR_PIN);
#endif
