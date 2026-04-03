/**
 * @file Door.h
 * @brief Garage door control.
 */

#ifndef DOOR_H
#define DOOR_H

#include <Arduino.h>

/**
 * @brief Door button controller.
 */
class Door
{
public:
    /**
     * @brief Create a door controller.
     * @param doorPin Door relay pin
     */
    Door(uint8_t doorPin);
    /**
     * @brief Trigger a door press.
     */
    void Press();

private:
    uint8_t _doorPin;
    unsigned long lastButtonPress;
};

/**
 * @brief Global door controller instance.
 */
extern Door *door;

#endif // DOOR_H
