/**
 * @file Realys.cpp
 * @brief Coffee relay control implementation.
 */

#ifdef COFFEE
#include "Coffee/Relays.h"
#include "devkit_s3_pins.h"
#include "Tabs.h"
#include "Coffee/TabCoffee.h"

/**
 * @brief Construct a new Relays controller.
 *
 * Configures pin modes for motion sensor input and relay outputs,
 * initializes all relays to LOW, and sets default state.
 *
 * @param motionPin Motion sensor input pin.
 * @param lightsRelay Light relay output pin.
 * @param fillRelay Fill relay output pin.
 * @param lockRelay Lock relay output pin.
 * @param lockhRelay Lock hold relay output pin.
 */
Relays::Relays(uint8_t motionPin, uint8_t lightsRelay, uint8_t fillRelay, uint8_t lockRelay, uint8_t lockhRelay)
{
    _motionPin = motionPin;
    _lightsRelay = lightsRelay;
    _fillRelay = fillRelay;
    _lockRelay = lockRelay;
    _lockhRelay = lockhRelay;
    pinMode(_motionPin, INPUT);
    pinMode(_lightsRelay, OUTPUT);
    pinMode(_fillRelay, OUTPUT);
    pinMode(_lockRelay, OUTPUT);
    pinMode(_lockhRelay, OUTPUT);
    motionState = digitalRead(_motionPin);
    digitalWrite(_lightsRelay, LOW);
    digitalWrite(_fillRelay, LOW);
    digitalWrite(_lockRelay, LOW);
    digitalWrite(_lockhRelay, LOW);
    _lastMotionHigh = 0;
    _lastButtonPress = 0;
    _lights = false;
    _fill = false;
    _lock = false;
    _lockh = false;
}

/**
 * @brief Check the motion sensor and update relay states.
 *
 * Reads the motion pin. On new motion detection, turns on lights and fill.
 * After 5 minutes of no motion, turns off lights and fill automatically.
 */
void Relays::Check()
{
    mVal = digitalRead(_motionPin);
    if (mVal && (millis() - _blockMotion) > 5000)
    {
        _lastMotionHigh = millis();
        if (!motionState)
        {
            motionState = true;
            LightsOn();
            FillOn();
            printf("Motion detected\n");
        }
    }
    if (motionState && (millis() - _lastMotionHigh > 5 * 60 * 1000))
    {
        motionState = false;
        if (_lights)
            LightsOff();
        if (_fill)
            FillOff();
        printf("Motion time expired\n");
    }
}

/**
 * @brief Turn lights relay on and reset the motion timer.
 */
void Relays::LightsOn()
{
    digitalWrite(_lightsRelay, HIGH);
    if (!_lights)
    {
        tabs->tab[1]->changed = true;
        _lights = true;
        _lastMotionHigh = millis();
        motionState = true;
    }
}
/**
 * @brief Turn lights relay off and start the motion-block timer.
 */
void Relays::LightsOff()
{
    digitalWrite(_lightsRelay, LOW);
    if (_lights)
    {
        tabs->tab[1]->changed = true;
        _lights = false;
        _blockMotion = millis();
    }
}
/**
 * @brief Toggle the lights relay on or off.
 */
void Relays::LightsToggle()
{
    if (!_lights)
    {
        LightsOn();
        _lastMotionHigh = millis();
    }
    else
    {
        LightsOff();
    }
}

/**
 * @brief Turn fill relay on and start the fill timer.
 */
void Relays::FillOn()
{
    digitalWrite(_fillRelay, HIGH);
    if (!_fill)
    {
        _lastFillHigh = millis();
        tabs->tab[1]->changed = true;
        _fill = true;
        _msToFill = static_cast<TabConfig *>(tabs->tab[CONFIG_TAB])->getFillTime();
    }
}

/**
 * @brief Turn fill relay off.
 */
void Relays::FillOff()
{
    digitalWrite(_fillRelay, LOW);
    if (_fill)
    {
        tabs->tab[1]->changed = true;
        _fill = false;
    }
}

/**
 * @brief Toggle the fill relay on or off.
 */
void Relays::FillToggle()
{
    if (!_fill)
    {
        FillOn();
    }
    else
    {
        FillOff();
    }
}

/**
 * @brief Turn lock relay on and start the lock timer.
 */
void Relays::LockOn()
{
    digitalWrite(_lockRelay, HIGH);
    if (!_lock)
    {
        _lastLockHigh = millis();
        tabs->tab[1]->changed = true;
        _lock = true;
    }
}

/**
 * @brief Turn lock relay off.
 */
void Relays::LockOff()
{
    digitalWrite(_lockRelay, LOW);
    if (_fill)
    {
        tabs->tab[1]->changed = true;
        _lock = false;
    }
}

/**
 * @brief Toggle the lock relay on or off.
 */
void Relays::LockToggle()
{
    if (!_lock)
    {
        LockOn();
    }
    else
    {
        LockOff();
    }
}

/**
 * @brief Turn lock hold relay on.
 */
void Relays::LockhOn()
{
    digitalWrite(_lockhRelay, HIGH);
    if (!_lockh)
    {
        _lockh = true;
    }
}

/**
 * @brief Turn lock hold relay off.
 */
void Relays::LockhOff()
{
    digitalWrite(_lockhRelay, LOW);
    if (_lockh)
    {
        _lockh = false;
    }
}

/**
 * @brief Per-loop relay housekeeping.
 *
 * Auto-turns off lights after 5 minutes and fill after the configured
 * fill duration. Updates the remaining-percentage values for each relay.
 */
void Relays::loop()
{
    static uint64_t last = 0;
    if (_lights)
    {
        if ((millis() - _lastMotionHigh) > 5 * 60 * 1000)
        {
            LightsOff();
        }
        else
            _percentLights = 100 - (millis() - _lastMotionHigh) / 30000;
    }

    if (_fill)
    {
        if ((millis() - _lastFillHigh) > _msToFill)
        {
            _percentFill = 0;
            FillOff();
        }
        else
        {
            _percentFill = 100.0 - (float)(millis() - _lastFillHigh) / _msToFill;
        }
    }
}

Relays *relays = new Relays(MOTION_PIN, LIGHTS_PIN, FILL_PIN, LOCK_PIN, LOCKH_PIN);
#endif
