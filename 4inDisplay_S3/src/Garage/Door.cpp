/**
 * @file Door.cpp
 * @brief Garage door control implementation.
 */

#ifdef GARAGE
#include "devkit_s3_pins.h"
#include "Garage/Door.h"

/**
 * @brief Construct a new Door controller.
 *
 * @param doorPin GPIO pin connected to the door relay.
 */
Door::Door(uint8_t doorPin)
{
    _doorPin = doorPin;
    pinMode(_doorPin, OUTPUT);
    lastButtonPress = 0;
}

/**
 * @brief Simulate a door button press.
 *
 * Drives the relay HIGH for one second, then LOW.
 * Debounced to ignore presses within 1.5 seconds of the last one.
 */
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
