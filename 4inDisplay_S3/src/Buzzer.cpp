#include <Arduino.h>
#include "Buzzer.h"
#include "Interrupts.h"
#include "devkit_pins.h"
#include <freertos/FreeRTOS.h>

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

volatile uint32_t buzzerOn = 0;
uint16_t buzzerFreq = 1300;

/**
 * @brief Initializes the buzzer pin.
 */
void buzzerSetup()
{
    pinMode(BUZZER_PIN, OUTPUT);
    digitalWrite(BUZZER_PIN, LOW);
}

// ---------------------------------------------------------------------------
// Note sequencer (non-blocking shot reminder)
// ---------------------------------------------------------------------------

struct Note
{
    uint16_t freq; ///< Hz; 0 = silence
    uint16_t ms;   ///< Duration in milliseconds
};

// ---------------------------------------------------------------------------
// Lone Ranger (William Tell Overture finale) — gallop pattern
// Groups of 3: short-short-long (80/80/160ms), 30ms gaps between groups
// ---------------------------------------------------------------------------

static const Note _loneRanger[] = {
    // dun dun DUN  (G4 G4 Eb4)
    {392,80},{0,30},{392,80},{0,30},{311,160},{0,60},
    // dun dun DUN  (Bb4 Bb4 G4)
    {466,80},{0,30},{466,80},{0,30},{392,160},{0,60},
    // dun dun DUN  (G4 G4 Eb4)
    {392,80},{0,30},{392,80},{0,30},{311,160},{0,60},
    // dun dun DUN  (Bb4 Bb4 G4)
    {466,80},{0,30},{466,80},{0,30},{392,160},{0,120},
    // melody: G4 Bb4 G4  Eb4 G4 Bb4
    {392,160},{0,30},{466,160},{0,30},{392,160},{0,30},
    {311,160},{0,30},{392,160},{0,30},{466,160},{0,120},
    // G5 high finish
    {784,320},{0,80},
};
static constexpr uint8_t _loneRangerCount = sizeof(_loneRanger) / sizeof(_loneRanger[0]);

static const Note _shotUp[] = {
    {523, 150}, {0, 60},  //!< C5, pause
    {659, 150}, {0, 60},  //!< E5, pause
    {784, 300}, {0, 300}, //!< G5, tail silence
};
static const Note _shotDown[] = {
    {784, 150}, {0, 60},  //!< G5, pause
    {659, 150}, {0, 60},  //!< E5, pause
    {523, 300}, {0, 300}, //!< C5, tail silence
};
static constexpr uint8_t _shotNoteCount = sizeof(_shotUp) / sizeof(_shotUp[0]);

static int16_t      _seqIdx       = -1;
static uint8_t      _seqLen       = 0;
static uint32_t     _seqNext      = 0;
static bool         _seqAscending = true;
static const Note  *_seqNotes     = nullptr;

static void startSequence(const Note *notes, uint8_t len)
{
    _seqNotes = notes;
    _seqLen   = len;
    _seqIdx   = 0;
    _seqNext  = millis();
}

/**
 * @brief Starts the shot reminder chime, alternating ascending/descending each call.
 */
void startShotReminder()
{
    startSequence(_seqAscending ? _shotUp : _shotDown, _shotNoteCount);
    _seqAscending = !_seqAscending;
}

/**
 * @brief Starts the Lone Ranger (William Tell Overture) sequence.
 */
void playLoneRanger()
{
    startSequence(_loneRanger, _loneRangerCount);
}

/**
 * @brief Advances the note sequencer. Call from the main loop every cycle.
 */
void buzzerLoop()
{
    if (_seqIdx < 0 || _seqNotes == nullptr || _seqIdx >= _seqLen)
    {
        _seqIdx = -1;
        return;
    }
    if (millis() < _seqNext)
        return;

    const Note &n = _seqNotes[_seqIdx];
    if (n.freq > 0)
        buzz(n.freq, n.ms);
    _seqNext = millis() + n.ms;
    _seqIdx++;
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

/**
 * @brief Emits a tone at the specified frequency for a given duration.
 *
 * @param freq Frequency in Hz.
 * @param ms Duration in milliseconds.
 */
void buzz(uint16_t freq, uint16_t ms)
{
    if (freq == 0 || ms == 0)
    {
        buzzerOn = 0;
        return;
    }
    uint32_t delay_us = 1000000 / (2 * freq);
    uint32_t cnt = (1000 * ms) / delay_us;

    if (cnt > 40000L)
    {
        printf("cnt too large: %d\n", cnt);
        cnt = 500;
    }
    portENTER_CRITICAL(&timerMuxMain);
    changeIntervalMain(delay_us);
    buzzerOn = cnt;
    portEXIT_CRITICAL(&timerMuxMain);
}
