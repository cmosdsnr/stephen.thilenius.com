#ifdef POWERMETER
#include <Arduino.h>
#include "Clock.h"
#include "Tabs.h"
#include "Report.h"
#include "I2C.h"
#include <Wire.h>
#include <ADS1X15.h>

// robtillaart/ADS1X15@^0.5.4

bool isPowerMeterEnabled;
ADS1115 ads48(0x48); // address 0x48
ADS1115 ads49(0x49); // address 0x49
int16_t a0cnt = -2, a1cnt = -2;
int16_t a0ch = 0, a1ch = 0;

int16_t p0[3][860];
int16_t p1[3][860];

bool sampleReady0 = false, sampleReady1 = false;

portMUX_TYPE alert0MuxMain = portMUX_INITIALIZER_UNLOCKED;
portMUX_TYPE alert1MuxMain = portMUX_INITIALIZER_UNLOCKED;

const uint8_t muxChannels[3] = {
    1, // ADS1X15_MUX_DIFF_0_3
    2, // ADS1X15_MUX_DIFF_1_3
    3  // ADS1X15_MUX_DIFF_2_3
};

void IRAM_ATTR alert0()
{
    portENTER_CRITICAL_ISR(&alert0MuxMain);
    // Handle alert0
    // ===== Interrupt Service Routine =====
    a0cnt++;
    if (a0cnt >= 0)
        sampleReady0 = true;
    portEXIT_CRITICAL_ISR(&alert0MuxMain);
}

void IRAM_ATTR alert1()
{
    portENTER_CRITICAL_ISR(&alert1MuxMain);
    // Handle alert1
    a1cnt++;
    if (a1cnt >= 0)
        sampleReady1 = true;
    portEXIT_CRITICAL_ISR(&alert1MuxMain);
}

void powerMeterSetup(void)
{
    if (!ads48.begin())
    {
        Report.println("ADS1115 0x48 init fail");
        return;
    }
    if (!ads49.begin())
    {
        Report.println("ADS1115 0x49 init fail");
        return;
    }

    // Set gain (0 = ±6.144V, 1 = ±4.096V, 2 = ±2.048V, etc.)
    ads48.setGain(2); // = GAIN_TWO, ±2.048 V
    ads49.setGain(2);

    // Set data rate: 7 = 860 SPS
    ads48.setDataRate(7);
    ads49.setDataRate(7);

    // Comparator setup: thresholds full range
    ads48.setComparatorThresholdLow(0x0000);
    ads48.setComparatorThresholdHigh(0xFFFF);
    ads48.setComparatorQueConvert(0); // assert ALERT after 1 conversion
    ads48.setComparatorPolarity(0);   // active low
    ads48.setComparatorLatch(0);      // non-latching

    ads49.setComparatorThresholdLow(0x0000);
    ads49.setComparatorThresholdHigh(0xFFFF);
    ads49.setComparatorQueConvert(0);
    ads49.setComparatorPolarity(0);
    ads49.setComparatorLatch(0);

    // Configure ALERT pins
    pinMode(ALERT0_PIN, INPUT_PULLUP);
    pinMode(ALERT1_PIN, INPUT_PULLUP);
    attachInterrupt(digitalPinToInterrupt(ALERT0_PIN), alert0, FALLING);
    attachInterrupt(digitalPinToInterrupt(ALERT1_PIN), alert1, FALLING);

    // Start continuous conversions
    ads48.requestADC(muxChannels[a0ch]); // start channel
    ads49.requestADC(muxChannels[a1ch]);
}

time_t lastPowerMeterReading = 0;
void powerMeterLoop(void)
{
    int16_t results;
    if (!isPowerMeterEnabled)
        return;
    float multiplier = 0.0000625F;

    if (millis() - lastPowerMeterReading < 900)
        return;
    lastPowerMeterReading = millis();

    if (sampleReady0)
    {
        sampleReady0 = false;
        p0[a0ch][a0cnt] = ads48.getValue();
        if (a0cnt == 859)
        {
            a0ch = (a0ch + 1) % 3;
            ads48.requestADC(muxChannels[a0ch]); // start next channel
            a0cnt = -2;
        }
    }
    if (sampleReady1)
    {
        sampleReady1 = false;
        p1[a1ch][a1cnt] = ads49.getValue();
        if (a1cnt == 859)
        {
            a1ch = (a1ch + 1) % 3;
            ads49.requestADC(muxChannels[a1ch]); // start next channel
            a1cnt = -2;
        }
    }
    // Report.printf("Differential: %.6f, %.6f, %.6f,       %.6f, %.6f, %.6f\n",
    //               multiplier * ads48.readADC_Differential_0_3(),
    //               multiplier * ads48.readADC_Differential_1_3(),
    //               multiplier * ads48.readADC_Differential_2_3(),
    //               multiplier * ads49.readADC_Differential_0_3(),
    //               multiplier * ads49.readADC_Differential_1_3(),
    //               multiplier * ads49.readADC_Differential_2_3());

    // Report.print(ads49.readADC_Differential_2_3());
    // Report.print(", ");
    // Report.print(results * multiplier);
    // Report.println("mV)");

    Report.printf("a0cnt=%d a1cnt=%d\n", a0cnt, a1cnt);
}

#endif