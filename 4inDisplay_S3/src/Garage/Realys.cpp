/**
 * @file Realys.cpp
 * @brief Garage relay control implementation.
 */

#ifdef GARAGE
#include "Garage/Relays.h"
#include "devkit_s3_pins.h"
#include "Tabs.h"
#include "Garage/TabGarage.h"

Relays::Relays(uint8_t motionPin, uint8_t lightsRelay, uint8_t powerRelay)
{
    _motionPin = motionPin;
    _lightsRelay = lightsRelay;
    _powerRelay = powerRelay;
    pinMode(_motionPin, INPUT);
    pinMode(_lightsRelay, OUTPUT);
    pinMode(_powerRelay, OUTPUT);
    motionState = digitalRead(_motionPin);
    digitalWrite(_lightsRelay, LOW);
    digitalWrite(_powerRelay, LOW);
    forceLights = false;
    forcePower = true;
    lastMotionHigh = 0;
    lastButtonPress = 0;
    lights = false;
    power = true;
}

void Relays::Check()
{
    mVal = digitalRead(_motionPin);
    if (mVal && (millis() - blockMotion) > 5000)
    {
        lastMotionHigh = millis();
        if (!motionState)
        {
            motionState = true;
            LightsOn();
            PowerOn();
            printf("Motion detected\n");
        }
    }
    if (motionState && (millis() - lastMotionHigh > 5 * 60 * 1000))
    {
        motionState = false;
        if (lights && !forceLights)
            LightsOff();
        if (power && !forcePower)
            PowerOff();
        printf("Motion time expired\n");
    }
}

uint16_t Relays::GetRemainingPct(int16_t width)
{
    if (!lights)
        return 0;
    float pct = 1.0 - ((millis() - lastMotionHigh) / (5.0 * 60.0 * 1000.0));
    if (pct < 0)
        return 0;
    return (uint16_t)(pct * width);
}

void Relays::LightsOn()
{
    digitalWrite(_lightsRelay, HIGH);
    if (!lights)
    {
        tabs->tab[1]->changed = true;
        lights = true;
        lastMotionHigh = millis();
        motionState = true;
    }
}
void Relays::LightsOff()
{
    digitalWrite(_lightsRelay, LOW);
    if (lights)
    {
        tabs->tab[1]->changed = true;
        lights = false;
        blockMotion = millis();
    }
}
void Relays::LightsToggle()
{
    lights = !lights;
    digitalWrite(_lightsRelay, lights ? HIGH : LOW);
    tabs->tab[1]->changed = true;
    if (lights)
    {
        LightsOn();
        lastMotionHigh = millis();
    }
    else
    {
        LightsOff();
    }
}
void Relays::PowerOn()
{
    digitalWrite(_powerRelay, HIGH);
    if (!power)
    {
        lastMotionHigh = millis();
        tabs->tab[1]->changed = true;
        power = true;
        PowerOn();
    }
}
void Relays::PowerOff()
{
    digitalWrite(_powerRelay, HIGH);
    if (power)
    {
        tabs->tab[1]->changed = true;
        power = false;
        PowerOff();
        blockMotion = millis();
    }
}
void Relays::PowerToggle()
{
    digitalWrite(_powerRelay, !digitalRead(_powerRelay));
    tabs->tab[1]->changed = true;
    power = !power;
    if (power)
    {
        PowerOn();
        lastMotionHigh = millis();
    }
    else
    {
        PowerOff();
    }
}

void Relays::ToggleForceLights()
{
    forceLights = !forceLights;
    tabs->tab[1]->changed = true;
    lastButtonPress = millis();
    lastMotionHigh = lastButtonPress;
}
void Relays::ToggleForcePower()
{
    forcePower = !forcePower;
    tabs->tab[1]->changed = true;
    lastButtonPress = millis();
}

Relays *relays = new Relays(MOTION_PIN, LIGHTS_PIN, POWER_PIN);
#endif
