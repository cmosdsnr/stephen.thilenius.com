#ifndef DESK_SHOT_H
#define DESK_SHOT_H

#include <Arduino.h>
#include <time.h>

constexpr time_t   EPOCH_VALID_THRESHOLD = 100000;       ///< Minimum epoch before NTP is considered synced.
constexpr time_t   SHOT_WINDOW_SEC       = 4L * 24 * 3600; ///< Default scheduling window: 4 days.
constexpr uint32_t SHOT_BEEP_INTERVAL_MS = 10000;        ///< Time between overdue reminders (ms).

/**
 * @brief Manages GLP shot scheduling: persistence, time tracking, and alerts.
 *
 * Runs independently of the display tab. Call loop() from main each cycle
 * so beeping occurs regardless of which tab is active.
 */
class Shot
{
public:
    Shot();
    /** @brief Call from main loop — beeps once per minute when overdue. */
    void loop();
    /** @brief Returns the next scheduled shot timestamp. */
    time_t getNext() const { return _next; }
    /** @brief Sets the next shot to an absolute timestamp and persists it. */
    void setNext(time_t t);
    /** @brief Adjusts the next shot time by delta seconds and persists. */
    void adjust(long deltaSec);
    /** @brief Resets next shot to 4 days from now and persists. */
    void reset();
    /** @brief Returns true if the shot time has passed. */
    bool isOverdue() const;

private:
    time_t _next;
};

extern Shot *shot;

#endif // DESK_SHOT_H
