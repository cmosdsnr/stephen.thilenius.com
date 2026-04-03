#ifndef WINDTIMER_H
#define WINDTIMER_H
#include <Arduino.h>
#include "Desk/WindQueue.h"
#include "Report.h"

/**
 * @brief Wind timer sampler for speed/direction transitions.
 */
class windTimer
{
public:
    /** @brief Constructs the wind timer (does not start hardware timer). */
    windTimer();
    /** @brief Initializes pins, state, and starts the hardware timer. */
    void begin();
    /** @brief Updates the timer interval in microseconds. */
    void changeInterval(uint32_t us);
    /** @brief Detaches the timer interrupt (stub). */
    void detach();
    /** @brief Attaches the timer interrupt (stub). */
    void attach();
    /** @brief Debug helper for the timer (stub). */
    void debug();

    /** @brief Returns queue distance between read and write indices. */
    uint8_t length() const;
    /** @brief Reads the current queue entry and advances if available. */
    bool pop(int16_t &speedHigh, int16_t &directionLow, int16_t &directionHigh);
    /** @brief Returns the current pin state and change flag. */
    bool getState(uint8_t &state);
    /** @brief Prints the current interrupt counter. */
    void reportInterruptCounter()
    {
        Report.printf("interruptCounter: %d\n", _interruptCounter);
    }

private:
    /** @brief ISR trampoline to the instance handler. */
    static void IRAM_ATTR onTimerWindISR();
    /** @brief Internal ISR handler that samples pins and updates the queue. */
    void onTimerWind();
    /** @brief Initializes internal variables and pin modes. */
    void initVars();

    static windTimer *s_instance;

    WindQueue _queue;

    portMUX_TYPE _windTimerMux;
    hw_timer_t *_windTimer;

    bool _speed;
    bool _direction;
    uint8_t _state; // 0,1,2,3 for low-low, low-high, high-low, high-high
    bool _stateChanged;
    volatile uint16_t _interruptCounter;
    volatile int16_t _spin;
    volatile int16_t _dpin;
    int16_t _speedHigh;
    int16_t _directionHigh;
    int16_t _speedLow;
    int16_t _directionLow;
    bool _sawSpeedHigh;
    bool _sawSpeedLow;
    bool _sawDirectionHigh;
    bool _sawDirectionLow;
    bool _startup;
};

extern windTimer windTimerInstance;

#endif
