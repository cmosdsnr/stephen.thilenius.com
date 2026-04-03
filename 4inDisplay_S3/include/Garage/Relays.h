/**
 * @file Relays.h
 * @brief Garage relay and motion control.
 */

#ifndef MOTION_H
#define MOTION_H

#include <Arduino.h>

/**
 * @brief Relay control for garage lights and power.
 */
class Relays
{
public:
    /**
     * @brief Create a relay controller.
     * @param motionPin Motion sensor input pin
     * @param lightsRelay Light relay pin
     * @param powerRelay Power relay pin
     */
    Relays(uint8_t motionPin, uint8_t lightsRelay, uint8_t powerRelay);
    /**
     * @brief Destroy the relay controller.
     */
    ~Relays();
    /**
     * @brief Update relay states from inputs.
     */
    void Check();
    /**
     * @brief Turn lights on.
     */
    void LightsOn();
    /**
     * @brief Turn lights off.
     */
    void LightsOff();
    /**
     * @brief Toggle lights.
     */
    void LightsToggle();
    /**
     * @brief Turn power on.
     */
    void PowerOn();
    /**
     * @brief Turn power off.
     */
    void PowerOff();
    /**
     * @brief Toggle power.
     */
    void PowerToggle();

    /**
     * @brief Toggle forced lights mode.
     */
    void ToggleForceLights();
    /**
     * @brief Toggle forced power mode.
     */
    void ToggleForcePower();
    /**
     * @brief Check if lights are forced on.
     * @return True if forced on
     */
    bool AreLightsForced() { return forceLights; }
    /**
     * @brief Check if power is forced on.
     * @return True if forced on
     */
    bool IsPowerForced() { return forcePower; }
    /**
     * @brief Check if lights are on.
     * @return True if lights are on
     */
    bool AreLightsOn() { return lights; }
    /**
     * @brief Check if power is on.
     * @return True if power is on
     */
    bool IsPowerOn() { return power; }
    /**
     * @brief Get last motion pin value.
     * @return Motion pin state
     */
    bool GetMotionPin() { return mVal; }
    /**
     * @brief Get remaining time percent mapped to a width.
     * @param width Render width
     * @return Percent value
     */
    uint16_t GetRemainingPct(int16_t width);

private:
    bool power, lights;
    bool motionState, forceLights, forcePower, mVal;
    uint8_t _motionPin, _lightsRelay, _powerRelay;
    uint64_t lastMotionHigh, lastButtonPress, blockMotion;
};

/**
 * @brief Global relay controller instance.
 */
extern Relays *relays;
#endif