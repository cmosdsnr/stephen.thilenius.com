#include <Arduino.h>
#include "Interrupts.h"
#include "Functions.h"
#include "Buzzer.h"
#include "Display.h"
#include "devkit_pins.h"

/**
 * @file Interrupts.cpp
 * @brief Main timer interrupt implementation.
 */

portMUX_TYPE timerMuxMain = portMUX_INITIALIZER_UNLOCKED;
//! 50ms timer
hw_timer_t *timerMain = NULL;
uint16_t tick = 0;
bool b = false;

/**
 * @brief Interrupt Service Routine for main timer.
 *
 * Called periodically to handle ticking and buzzer timing.
 * Uses critical section for thread safety.
 */
void IRAM_ATTR onTimerMain()
{
    portENTER_CRITICAL_ISR(&timerMuxMain);
    if (tick)
    {
        tick--;
    }
    if (buzzerOn)
    {
        digitalWrite(BUZZER_PIN, b);
        b = !b;
        buzzerOn--;
        if (!buzzerOn)
            digitalWrite(BUZZER_PIN, LOW);
    }
    portEXIT_CRITICAL_ISR(&timerMuxMain);
}

/**
 * @brief Initializes the main hardware timer.
 *
 * Sets up a timer to interrupt every 2ms (default) or specified interval.
 */
void InitTimerMain()
{
    //! fs = 60*4 = 240Hz
    //! ts = 1/fs = 4.1667ms

    timerMain = timerBegin(0, 80, true);                 //!< start a timer that is 80MHz/80 = 1MHz, every us
    timerAttachInterrupt(timerMain, &onTimerMain, true); //!< attach the onTimer() function
    timerAlarmWrite(timerMain, 2000, true);              //!< 2000/1MHz = 2ms
    timerAlarmEnable(timerMain);                         //!< enable the timer
}

/**
 * @brief Adjusts the main timer interval.
 *
 * @param us Interval in microseconds
 */
void changeIntervalMain(uint32_t us)
{
    timerAlarmWrite(timerMain, us, true);
}

void detachMain()
{
}

void attachMain()
{
}

void debugInterruptsMain()
{
}
