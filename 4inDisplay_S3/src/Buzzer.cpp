#include <Arduino.h>
#include "Buzzer.h"
#include "Interrupts.h"
#include "devkit_pins.h"

/**
 * @file Buzzer.cpp
 * @brief Buzzer control implementation.
 */

int melody[] = {
    261, 261, 293, 261, 349, 329,
    261, 261, 293, 261, 392, 349,
    261, 261, 523, 440, 349, 329, 293,
    466, 466, 440, 349, 392, 349};

int noteDurations[] = {
    4, 4, 4, 4, 4, 2,
    4, 4, 4, 4, 4, 2,
    4, 4, 4, 4, 4, 4, 2,
    4, 4, 4, 4, 4, 2};

uint32_t buzzerOn = 0;
uint32_t buzzerStopTime = 0;
uint16_t buzzerFreq = 1300;

/**
 * @brief Initializes the buzzer pin.
 */
void buzzerSetup()
{
    pinMode(BUZZER_PIN, OUTPUT);
    digitalWrite(BUZZER_PIN, LOW);
}

/**
 * @brief Non-blocking loop handler for buzzer.
 *
 * Turns off the buzzer after the duration has elapsed.
 */
void buzzerLoop()
{
    if (buzzerOn)
    {
        if (millis() >= buzzerStopTime)
            buzzerOn = false;
    }
}

/**
 * @brief Generates a short beep.
 */
void quickBeep()
{
    buzz(buzzerFreq, 100);
}

/**
 * @brief Plays a predefined melody.
 *
 * Note: This function uses delay() and is blocking.
 */
void playSong()
{
    for (int i = 0; i < sizeof(melody) / sizeof(melody[0]); i++)
    {
        int noteDuration = 1000 / noteDurations[i];
        buzz(melody[i], noteDuration);
        delay(noteDuration);
    }
}

void buzz(uint16_t freq, uint16_t ms)
{
    uint32_t delay_us = 1000000 / (2 * freq);
    uint32_t cnt = (1000 * ms) / delay_us;

    if (cnt > 40000L)
    {
        printf("cnt too large: %d\n", cnt);
        cnt = 500;
    }
    changeIntervalMain(delay_us);
    buzzerOn = cnt;
}
