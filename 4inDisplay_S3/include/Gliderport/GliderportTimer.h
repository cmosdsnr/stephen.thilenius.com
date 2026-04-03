/**
 * @file GliderportTimer.h
 * @brief Gliderport timing constants and ISR glue.
 */

#include <arduino.h>

#define TIMER_COUNT 10101 // us
#define TICK_COUNT 33     // 33*TIMER_COUNT/1,000,000 = 0.333333s

extern bool sawSpeedHigh, sawSpeedLow;
extern bool sawDirectionHigh, sawDirectionLow;
extern bool readingDone, startup;
extern uint16_t speedHigh, directionHigh, speedLow, directionLow;
extern volatile uint16_t interruptCounter;
/**
 * @brief Initialize the Gliderport timer ISR.
 */
void InitGliderportTimer();
