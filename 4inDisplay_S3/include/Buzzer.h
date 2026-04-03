#ifndef BUZZER_H
#define BUZZER_H

extern uint32_t buzzerOn;
extern uint16_t buzzerFreq;

/**
 * @brief Emits a short beep sound.
 * @return void
 */
void quickBeep();

/**
 * @brief Initializes the buzzer hardware.
 * @return void
 */
void buzzerSetup();

/**
 * @brief Emits a sound at a specific frequency for a duration.
 *
 * @param freq Frequency in Hz
 * @param ms Duration in milliseconds
 * @return void
 */
void buzz(uint16_t freq, uint16_t ms);

/**
 * @brief Handler loop for buzzer timing.
 *
 * Should be called in the main loop to handle non-blocking buzzer operations.
 * @return void
 */
void buzzerLoop();

/**
 * @brief Plays a predefined melody.
 * @return void
 */
void playSong();

#endif