/**
 * @file Realys.cpp
 * @brief Coffee relay control implementation.
 */

#ifdef COFFEE
#include "Coffee/Relays.h"
#include "devkit_s3_pins.h"
#include "Tabs.h"
#include "Coffee/TabCoffee.h"

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

void Relays::FillOff()
{
    digitalWrite(_fillRelay, LOW);
    if (_fill)
    {
        tabs->tab[1]->changed = true;
        _fill = false;
    }
}

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

void Relays::LockOff()
{
    digitalWrite(_lockRelay, LOW);
    if (_fill)
    {
        tabs->tab[1]->changed = true;
        _lock = false;
    }
}

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

void Relays::LockhOn()
{
    digitalWrite(_lockhRelay, HIGH);
    if (!_lockh)
    {
        _lockh = true;
    }
}

void Relays::LockhOff()
{
    digitalWrite(_lockhRelay, LOW);
    if (_lockh)
    {
        _lockh = false;
    }
}

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
