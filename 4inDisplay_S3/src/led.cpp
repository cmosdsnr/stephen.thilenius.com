#include <FastLED.h>
#include "devkit_pins.h"

/**
 * @file led.cpp
 * @brief LED animation helpers.
 */

#define NUM_LEDS 1 ///< Number of LEDs controlled by FastLED

/// @brief Array to store LED color data.
CRGB leds[NUM_LEDS];

/**
 * @brief Initializes the LED hardware and sets initial state.
 *
 * Configures the LED strip using FastLED with a predefined pin, sets the first
 * LED to green, adjusts brightness, and updates the display.
 */
void setupLed(void)
{
    FastLED.addLeds<SK6812, LED_PIN, GRB>(leds, NUM_LEDS);
    leds[0] = CRGB::Green;
    FastLED.setBrightness(55);
    FastLED.show();
}

/**
 * @brief Updates the LED color periodically.
 *
 * Every 2 seconds, a new random RGB color is generated and displayed on the first LED.
 * This function is intended to be called continuously inside the main loop.
 */
void loopLed()
{
    static uint64_t last_print_time = millis();

    if ((unsigned long)(millis() - last_print_time) > 2000)
    {
        last_print_time = millis();
        uint8_t r = random(0, 255);
        uint8_t g = random(0, 255 - r);
        uint8_t b = 255 - r - g;
        leds[0] = CRGB(r, g, b);
        FastLED.show();
    }
}
