#include <Arduino.h>
#include "devkit_pins.h"

// pins    colors              Function
// 2 & 5   yellow & black      Speed reed switch (5.4 ohms closed)
// 3 & 4   red & green         Direction reed switch (5.4 ohms closed)

// speed duty cycle is about 30% (high 30% of the time)

bool triggered = false;
unsigned long triggerTime = 0;

void IRAM_ATTR speedIsr()
{
    if (!triggered)
    {
        triggered = true;
        triggerTime = millis();
    }
}

void gpSetup()
{
    pinMode(SPEED_PIN, INPUT_PULLUP);
    pinMode(DIRECTION_PIN, INPUT_PULLUP);
    attachInterrupt(SPEED_PIN, speedIsr, CHANGE);
}

bool wait = false;
unsigned long waitTill = 0;
unsigned long lastRise = 0;
unsigned long lastFall = 0;
unsigned long lastCall = millis();

uint16_t lowDuration = 0, highDuration = 0, period = 0, avgPeriod = 0;

uint8_t direction = FALLING;

void gpLoop()
{
    if (triggered && !wait)
    {
        waitTill = triggerTime + 10;
        wait = true;
        if (direction == FALLING)
        {
            period = triggerTime - lastFall;
            lowDuration = triggerTime - lastRise;
            lastFall = triggerTime;
        }
        else
        {
            period = triggerTime - lastRise;
            highDuration = triggerTime - lastFall;
            lastRise = triggerTime;
        }
        avgPeriod = (9 * avgPeriod + period) / 10;
        Serial.printf("period: %d low duration:%d high duration: %d   called: %ld\n", avgPeriod, lowDuration, highDuration, millis() - lastCall);
    }
    lastCall = millis();
    if (wait && (millis() > waitTill))
    {
        if (digitalRead(SPEED_PIN))
            direction = FALLING;
        else
            direction = RISING;
        wait = false;
        triggered = false;
    }
    // if ((millis() - lastCall) < 50)
}