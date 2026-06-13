/**
 * @file Relays.h
 * @brief Coffee relay and motion control.
 */

#ifndef MOTION_H
#define MOTION_H
#include <Arduino.h>

/**
 * @brief Relay control for lights, fill, and locks.
 */
class Relays
{
public:
    /**
     * @brief Create a relay controller.
     * @param motionPin Motion sensor input pin
     * @param lightsRelay Light relay pin
     * @param fillRelay Fill relay pin
     * @param lockRelay Lock relay pin
     * @param lockhRelay Lock hold relay pin
     */
    Relays(uint8_t motionPin, uint8_t lightsRelay, uint8_t fillRelay, uint8_t lockRelay, uint8_t lockhRelay);
    /**
     * @brief Destroy the relay controller.
     */
    ~Relays() {};
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
     * @brief Turn fill on.
     */
    void FillOn();
    /**
     * @brief Turn fill off.
     */
    void FillOff();
    /**
     * @brief Toggle fill.
     */
    void FillToggle();
    /**
     * @brief Turn lock on.
     */
    void LockOn();
    /**
     * @brief Turn lock off.
     */
    void LockOff();
    /**
     * @brief Toggle lock.
     */
    void LockToggle();
    /**
     * @brief Turn lock hold on.
     */
    void LockhOn();
    /**
     * @brief Turn lock hold off.
     */
    void LockhOff();
    /**
     * @brief Toggle lock hold.
     */
    void LockhToggle();
    /**
     * @brief Per-loop updates for the relay controller.
     */
    void loop();

    /**
     * @brief Check if lights are on.
     * @return True if lights are on
     */
    bool AreLightsOn() { return _lights; }
    /**
     * @brief Check if fill is on.
     * @return True if fill is on
     */
    bool IsFillOn() { return _fill; }
    /**
     * @brief Check if lock is on.
     * @return True if lock is on
     */
    bool IsLockOn() { return _lock; }
    /**
     * @brief Check if lock hold is on.
     * @return True if lock hold is on
     */
    bool IsLockhOn() { return _lockh; }
    /**
     * @brief Get last motion pin value.
     * @return Motion pin state
     */
    bool GetMotionPin() { return mVal; }
    /**
     * @brief Get fill percent value.
     * @return Percent for fill
     */
    uint8_t getPercentFill() { return _percentFill; }
    /**
     * @brief Get lights percent remaining.
     * @return Percent remaining for lights
     */
    uint8_t getPercentLights() { return _percentLights; }

private:
    bool _fill, _lights, _lock, _lockh;
    bool motionState, mVal;
    uint8_t _motionPin, _lightsRelay, _fillRelay, _lockRelay, _lockhRelay;
    uint64_t _lastMotionHigh, _lastButtonPress, _blockMotion, _lastFillHigh, _lastLockHigh;
    uint8_t _percentLights, _percentFill;
    uint16_t _msToFill = 0;
};

/**
 * @brief Global relay controller instance.
 */
extern Relays *relays;
#endif