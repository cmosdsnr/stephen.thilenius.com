#ifdef DESK
#include <Arduino.h>
#include "Desk/WindTimer.h"
#include "devkit_s3_pins.h"

/**
 * @file WindTimer.cpp
 * @brief Wind timer sampling and ISR implementation.
 */

//! #define DEBUG_INTERRUPT
#define DEBUG_FREQ 20

static constexpr int16_t kFilterRange = 6;
static constexpr int16_t kFilterTripHigh = 4;
static constexpr int16_t kFilterTripLow = 2;
static constexpr uint32_t kTimerCountUs = 10101;

windTimer *windTimer::s_instance = nullptr;
windTimer windTimerInstance;

/**
 * @brief Construct a wind timer with default internal state.
 */
windTimer::windTimer()
    : _windTimerMux(portMUX_INITIALIZER_UNLOCKED),
      _windTimer(nullptr),
      _speed(false),
      _direction(false),
      _interruptCounter(0),
      _spin(0),
      _dpin(0),
      _speedHigh(0),
      _directionHigh(0),
      _speedLow(0),
      _directionLow(0),
      _sawSpeedHigh(false),
      _sawSpeedLow(false),
      _sawDirectionHigh(false),
      _sawDirectionLow(false),
      _startup(true),
      _state(0),
      _stateChanged(false)
{
}

/**
 * @brief Initialize pins, state, and start the hardware timer.
 */
void windTimer::begin()
{
    printf("Initializing Wind Timer\n");
    s_instance = this;
    initVars();
    _windTimer = timerBegin(1, 80, true); //!< start a windTimer that is 80MHz/80 = 1MHz
    timerAttachInterrupt(_windTimer, &windTimer::onTimerWindISR, true);
    timerAlarmWrite(_windTimer, kTimerCountUs, true); //!< 10,101/1MHz = 10.101ms, 99 per second
    timerAlarmEnable(_windTimer);
}

/**
 * @brief Update the timer interval in microseconds.
 */
void windTimer::changeInterval(uint32_t us)
{
    timerAlarmWrite(_windTimer, us, true);
}

/**
 * @brief Detach the wind timer interrupt (stub).
 */
void windTimer::detach()
{
}

/**
 * @brief Attach the wind timer interrupt (stub).
 */
void windTimer::attach()
{
}

/**
 * @brief Debug helper for the wind timer (stub).
 */
void windTimer::debug()
{
}

/**
 * @brief Returns the ring-buffer distance from read to write index.
 */
uint8_t windTimer::length() const
{
    return _queue.length();
}

/**
 * @brief Reads the current queue entry and advances if available.
 */
bool windTimer::pop(int16_t &speedHigh, int16_t &directionLow, int16_t &directionHigh)
{
    return _queue.pop(speedHigh, directionLow, directionHigh);
}

bool windTimer::getState(uint8_t &state)
{
    state = _state;
    if (_stateChanged)
    {
        _stateChanged = false;
        return true;
    }
    return false;
}

/**
 * @brief ISR trampoline to instance handler.
 */
void IRAM_ATTR windTimer::onTimerWindISR()
{
    if (s_instance)
        s_instance->onTimerWind();
}

/**
 * @brief Samples pins, applies filtering, and queues timing data.
 */
void windTimer::onTimerWind()
{
    portENTER_CRITICAL_ISR(&_windTimerMux);
#ifndef DEBUG_INTERRUPT
    if (digitalRead(SPEED_PIN))
    {
        if (_spin < kFilterRange)
            _spin++;
    }
    else
    {
        if (_spin > 0)
            _spin--;
    }
    if (digitalRead(DIRECTION_PIN))
    {
        if (_dpin < kFilterRange)
            _dpin++;
    }
    else
    {
        if (_dpin > 0)
            _dpin--;
    }
    if (!_speed && _spin > kFilterTripHigh)
    {
        _sawSpeedHigh = true;
        _speed = HIGH;
        if (!_startup)
        {
            _stateChanged = true;
            _speedHigh = _interruptCounter;
            _queue.push(_speedHigh, _directionLow, _directionHigh);
            _directionHigh = -1; //!< overwritten at next direction high toggle
            _directionLow = -1;  //!< overwritten at next direction low toggle
            _interruptCounter = 0;
        }
        else
        {
            _stateChanged = true;
            _interruptCounter = 0;
            _startup = false;
        }
    }
    if (_speed && _spin < kFilterTripLow)
    {
        _stateChanged = true;
        _sawSpeedLow = true;
        _speed = LOW;
        _speedLow = _interruptCounter;
    }
    if (!_direction && _dpin > kFilterTripHigh)
    {
        _stateChanged = true;
        _sawDirectionHigh = true;
        _direction = HIGH;
        _directionHigh = _interruptCounter;
    }
    if (_direction && _dpin < kFilterTripLow)
    {
        _stateChanged = true;
        _sawDirectionLow = true;
        _direction = LOW;
        _directionLow = _interruptCounter;
    }
    if (_stateChanged)
    {
        _state = (_direction ? 1 : 0) + (_speed ? 2 : 0);
    }
#else
    static char rotate = 0;
    if (_interruptCounter % DEBUG_FREQ == 0)
    {
        if (rotate == 0)
        {
            _sawDirectionLow = true;
            _direction = LOW;
            _directionLow = _interruptCounter;
            rotate = 1;
        }
        else if (rotate == 1)
        {
            _sawSpeedLow = true;
            _speed = LOW;
            _speedLow = _interruptCounter;
            rotate = 2;
        }
        else if (rotate == 2)
        {
            _sawDirectionHigh = true;
            _direction = HIGH;
            _directionHigh = _interruptCounter;
            rotate = 3;
        }
        else
        {
            _sawSpeedHigh = true;
            _speed = HIGH;
            if (!_startup)
                _speedHigh = _interruptCounter;
            else
            {
                _interruptCounter = 0;
                _startup = false;
            }
            rotate = 0;
        }
    }
#endif
    _interruptCounter++;
    portEXIT_CRITICAL_ISR(&_windTimerMux);
}

/**
 * @brief Initializes internal variables and pin modes.
 */
void windTimer::initVars()
{
    pinMode(SPEED_PIN, INPUT_PULLUP);
    pinMode(DIRECTION_PIN, INPUT_PULLUP);

    pinMode(DAVIS_SPD, INPUT_PULLDOWN);
    pinMode(DAVIS_DIR, INPUT_PULLUP);

    _queue.reset();
    _interruptCounter = 0;
    _spin = 0;
    _dpin = 0;
    _speed = LOW;
    _direction = LOW;

    _speedHigh = 0;
    _directionHigh = 0;
    _speedLow = 0;
    _directionLow = 0;

    _sawSpeedHigh = false;
    _sawSpeedLow = false;
    _sawDirectionHigh = false;
    _sawDirectionLow = false;
    _startup = true;
    _windTimerMux = portMUX_INITIALIZER_UNLOCKED;
}
#endif
