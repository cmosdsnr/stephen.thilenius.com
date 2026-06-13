#ifdef COFFEE

/**
 * @file Shot.cpp
 * @brief GLP shot schedule management: persistence, tracking, and alerts.
 *
 * Runs independently of the display tab via loop() in main.cpp so that
 * beeping occurs regardless of which tab is currently shown.
 */

#include "Coffee/Shot.h"
#include "Coffee/EpromData.h"
#include "Buzzer.h"
#include "Clock.h"

/**
 * @brief Load the persisted next-shot timestamp from EEPROM.
 */
Shot::Shot()
{
    uint64_t stored = getNextShot();
    // 0 or 0xFFFFFFFFFFFFFFFF means EEPROM was never written
    _next = (stored == 0 || stored == 0xFFFFFFFFFFFFFFFFULL)
                ? 0
                : (time_t)stored;
}

/**
 * @brief Main loop — beeps once per minute while the shot is overdue.
 *
 * Safe to call before NTP sync; returns immediately if epoch is not yet valid.
 */
void Shot::loop()
{
    if (getEpoch() < EPOCH_VALID_THRESHOLD)
        return;

    if (!isOverdue())
        return;

    static uint64_t lastBeep = 0;
    if (millis() - lastBeep > SHOT_BEEP_INTERVAL_MS)
    {
        lastBeep = millis();
        startShotReminder();
    }
}

/**
 * @brief Sets the next shot to an absolute timestamp and persists it.
 * @param t New target timestamp (epoch seconds).
 */
void Shot::setNext(time_t t)
{
    _next = t;
    saveNextShot((uint64_t)_next);
}

/**
 * @brief Adds delta seconds to the next shot time and persists the result.
 * @param deltaSec Signed offset in seconds.
 */
void Shot::adjust(long deltaSec)
{
    _next += deltaSec;
    saveNextShot((uint64_t)_next);
}

/**
 * @brief Resets next shot to 4 days from now and persists.
 */
void Shot::reset()
{
    _next = getEpoch() + SHOT_WINDOW_SEC;
    saveNextShot((uint64_t)_next);
}

/**
 * @brief Returns true if the scheduled shot time has passed.
 */
bool Shot::isOverdue() const
{
    return getEpoch() > EPOCH_VALID_THRESHOLD && _next < getEpoch();
}

Shot *shot = nullptr;

#endif
