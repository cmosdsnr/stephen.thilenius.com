#include <HTTPClient.h>
#include "DebugServer.h"
#include "devkit_pins.h"

/**
 * @file Functions.cpp
 * @brief GPIO configuration helpers.
 */

#ifdef GLIDERPORT
double cosine[256], sine[256];
double sc[6], ss[6];
#endif

/**
 * @brief Configures GPIO pins based on active module.
 *
 * Sets modes (INPUT/OUTPUT) and initial states for pins
 * defined for the specific compilation target (GLIDERPORT, COFFEE, etc.).
 */
void initializePins()
{
#ifdef GLIDERPORT
    for (uint8_t i = 0; i < 6; i++)
    {
        sc[i] = 0.0;
        ss[i] = 0.0;
    }
    for (uint16_t i = 0; i < 256; i++)
    {
        cosine[i] = cos(2 * PI * i / 4);
        sine[i] = sin(2 * PI * i / 4);
    }

    //! odometer pins
    pinMode(SPEED_PIN, INPUT_PULLUP);
    pinMode(DIRECTION_PIN, INPUT_PULLUP);
#endif

#ifdef COFFEE
    pinMode(MOTION_PIN, INPUT);  //!< motion sensor (input)
    pinMode(LIGHTS_PIN, OUTPUT); //!< Light relay (output)
    pinMode(FILL_PIN, OUTPUT);   //!< Fill relay (output)
    pinMode(LOCKH_PIN, OUTPUT);  //!< Lock hold control (output)
    pinMode(LOCK_PIN, OUTPUT);   //!< Lock control (output)
    pinMode(PHVR_PIN, INPUT);    //!< photovoltaic Resistor (analog input)
    pinMode(LEVL_PIN, INPUT);    //!< Water level sensor (input)
    pinMode(ECHO_PIN, INPUT);    //!< Ultrasonic echo (input)
    pinMode(TRIG_PIN, OUTPUT);   //!< Ultrasonic trigger (output)

    digitalWrite(LIGHTS_PIN, LOW);
    digitalWrite(FILL_PIN, LOW);
    digitalWrite(LOCKH_PIN, LOW);
    digitalWrite(LOCK_PIN, LOW);
    digitalWrite(TRIG_PIN, LOW);
#endif

#ifdef SPRINKLER
    pinMode(PUMP_PIN, OUTPUT);
    pinMode(CH1_PIN, OUTPUT);
    pinMode(CH2_PIN, OUTPUT);
    pinMode(CH3_PIN, OUTPUT);
    pinMode(CH4_PIN, OUTPUT);
    pinMode(NC_PIN, OUTPUT);
    digitalWrite(PUMP_PIN, LOW);
    digitalWrite(CH1_PIN, LOW);
    digitalWrite(CH2_PIN, LOW);
    digitalWrite(CH3_PIN, LOW);
    digitalWrite(CH4_PIN, LOW);
    digitalWrite(NC_PIN, LOW);
#endif

    printf("Pins initialized\n");
}
