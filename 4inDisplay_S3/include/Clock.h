#ifndef CLOCK_H
#define CLOCK_H

#include <time.h>

void clockLoop();
char *getLocalTime();
char *getRebootTime();
time_t getEpoch();
char *getFullDateTime();

/**
 * @brief Initializes time synchronization via NTP.
 *
 * Connects to NTP server and sets system time.
 * @return void
 */
void setupTime();

/**
 * @brief Updates local time variables from system time.
 *
 * Refreshes timeInfo, timeSinceEpoch, and formatted string buffers.
 * @return void
 */
void reloadLocalTime();

#endif