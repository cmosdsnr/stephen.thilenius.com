/**
 * @file GliderportTimer.cpp
 * @brief Gliderport timer ISR implementation.
 */

#ifdef GLIDERPORT
#include <Arduino.h>
#include "Gliderport/GliderportTimer.h"
#include "devkit_pins.h"

//! volatile uint16_t tick = TICK_COUNT;

portMUX_TYPE gliderportTimerMux = portMUX_INITIALIZER_UNLOCKED;

//! a filter is created whose output ranges from 0 to FILTER_RANGE
//! the filter goes up or down by FILTER_STEP_PER_INTERRUPT depending on the input pin state
//! the resulting internal pin state trips at 7 and 3, hysteresis
//! #define FILTER_RANGE 10
//! #define FILTER_TRIP_H 7
//! #define FILTER_TRIP_L 3

#define FILTER_RANGE 6
#define FILTER_TRIP_H 4
#define FILTER_TRIP_L 2

//! #define DEBUG_INTERRUPT
#define DEBUG_FREQ 20

hw_timer_t *gliderportTimer = NULL;

volatile uint16_t interruptCounter = 0, last = 0;
volatile int16_t spin = 0, dpin = 0; //!< analog value
bool speed = LOW, direction = LOW, readingDone = false;

uint16_t speedHigh = 0, directionHigh = 0;
uint16_t speedLow = 0, directionLow = 0;

bool sawSpeedHigh = false;
bool sawSpeedLow = false;
bool sawDirectionHigh = false;
bool sawDirectionLow = false;
bool startup = true;
uint8_t testPt = 0, testPt1 = 0, testPt2 = 0, testPt3 = 0;

/*************************************/
//! timer called every 10ms
/*************************************/
void IRAM_ATTR onGliderportTimer()
{
    portENTER_CRITICAL_ISR(&gliderportTimerMux);

    if (readingDone)
    {
        readingDone = false;
        directionHigh -= speedHigh;
        directionLow -= speedHigh;
        interruptCounter -= speedHigh;
        speedHigh = 0;
    }

#ifndef DEBUG_INTERRUPT

    if (digitalRead(SPEED_PIN))
    {
        if (spin < FILTER_RANGE)
            spin++;
    }
    else
    {
        if (spin > 0)
            spin--;
    }
    if (digitalRead(DIRECTION_PIN))
    {
        if (dpin < FILTER_RANGE)
            dpin++;
    }
    else
    {
        if (dpin > 0)
            dpin--;
    }
    if (!speed && spin > FILTER_TRIP_H)
    {
        sawSpeedHigh = true;
        speed = HIGH;
        if (!startup)
            speedHigh = interruptCounter;
        else
        {
            interruptCounter = 0;
            startup = false;
        }
    }
    if (speed && spin < FILTER_TRIP_L)
    {
        sawSpeedLow = true;
        speed = LOW;
        speedLow = interruptCounter;
    }
    if (!direction && dpin > FILTER_TRIP_H)
    {
        sawDirectionHigh = true;
        direction = HIGH;
        directionHigh = interruptCounter;
    }
    if (direction && dpin < FILTER_TRIP_L)
    {
        sawDirectionLow = true;
        direction = LOW;
        directionLow = interruptCounter;
    }
#else

    static char rotate = 0;
    if (interruptCounter % DEBUG_FREQ == 0)
    {
        if (rotate == 0)
        {
            sawDirectionLow = true;
            direction = LOW;
            directionLow = interruptCounter;
            rotate = 1;
        }
        else if (rotate == 1)
        {
            sawSpeedLow = true;
            speed = LOW;
            speedLow = interruptCounter;
            rotate = 2;
        }
        else if (rotate == 2)
        {
            sawDirectionHigh = true;
            direction = HIGH;
            directionHigh = interruptCounter;
            rotate = 3;
        }
        else
        {
            sawSpeedHigh = true;
            speed = HIGH;
            if (!startup)
                speedHigh = interruptCounter;
            else
            {
                interruptCounter = 0;
                startup = false;
            }
            s
                rotate = 0;
        }
    }
#endif
    interruptCounter++;
    portEXIT_CRITICAL_ISR(&gliderportTimerMux);
}

void InitGliderportTimer()
{
    gliderportTimer = timerBegin(1, 80, true);                       //!< start a timer that is 80MHz/80 = 1MHz
    timerAttachInterrupt(gliderportTimer, &onGliderportTimer, true); //!< attach the onTimer() function
    timerAlarmWrite(gliderportTimer, 2000, true);                    //!< 2000/1MHz = 2ms
    timerAlarmEnable(gliderportTimer);                               //!< enable the timer
}

#endif
