
#include <arduino.h>
#include <freertos/FreeRTOS.h>

/**
 * @file Interrupts.h
 * @brief Main timer interrupt control.
 */

extern uint16_t tick;
extern portMUX_TYPE timerMuxMain; ///< Shared mux for ISR/main critical sections.

/**
 * @brief Initializes the main hardware timer for interrupts.
 * @return void
 */
void InitTimerMain();

/**
 * @brief Changes the interval of the main timer.
 *
 * @param us Interval in microseconds
 * @return void
 */
void changeIntervalMain(uint32_t us);

/**
 * @brief Disables the main timer interrupt.
 * @return void
 */
void detachMain();

/**
 * @brief Enables the main timer interrupt.
 * @return void
 */
void attachMain();

/**
 * @brief Prints debug information about main interrupts.
 * @return void
 */
void debugInterruptsMain();
