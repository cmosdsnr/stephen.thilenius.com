/**
 * @file Realys.cpp
 * @brief Garage relay control implementation.
 */

#ifdef GARAGE
#include "Garage/Relays.h"
#include "devkit_s3_pins.h"
#include "Tabs.h"
#include "Garage/TabGarage.h"

/**
 * @brief Construct a new Relays controller.
 *
 * Configures the motion sensor input and relay output pins,
 * and sets default relay states.
 *
 * @param motionPin GPIO pin for the motion sensor input.
 * @param lightsRelay GPIO pin for the lights relay output.
 * @param powerRelay GPIO pin for the power relay output.
 */
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

/**
 * @brief Poll the motion sensor and update relay states.
 *
 * Turns lights and power on when motion is detected.
 * Turns them off after 5 minutes of no motion, unless forced.
 */
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

/**
 * @brief Get the remaining motion-timeout as a pixel width.
 *
 * Maps the fraction of the 5-minute timeout that remains
 * onto a pixel width for drawing a progress bar.
 *
 * @param width Maximum bar width in pixels.
 * @return Scaled pixel width representing the remaining time.
 */
uint16_t Relays::GetRemainingPct(int16_t width)
{
    if (!lights)
        return 0;
    float pct = 1.0 - ((millis() - lastMotionHigh) / (5.0 * 60.0 * 1000.0));
    if (pct < 0)
        return 0;
    return (uint16_t)(pct * width);
}

/**
 * @brief Turn the lights relay on and refresh the UI.
 */
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
/**
 * @brief Turn the lights relay off and refresh the UI.
 */
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
/**
 * @brief Toggle the lights relay and refresh the UI.
 */
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
/**
 * @brief Turn the power relay on and refresh the UI.
 */
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
/**
 * @brief Turn the power relay off and refresh the UI.
 */
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
/**
 * @brief Toggle the power relay and refresh the UI.
 */
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

/**
 * @brief Toggle forced-lights mode and refresh the UI.
 *
 * When forced, the lights stay on regardless of motion timeout.
 */
void Relays::ToggleForceLights()
{
    forceLights = !forceLights;
    tabs->tab[1]->changed = true;
    lastButtonPress = millis();
    lastMotionHigh = lastButtonPress;
}
/**
 * @brief Toggle forced-power mode and refresh the UI.
 *
 * When forced, the power relay stays on regardless of motion timeout.
 */
void Relays::ToggleForcePower()
{
    forcePower = !forcePower;
    tabs->tab[1]->changed = true;
    lastButtonPress = millis();
}

Relays *relays = new Relays(MOTION_PIN, LIGHTS_PIN, POWER_PIN);
#endif
