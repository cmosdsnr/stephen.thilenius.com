/**
 * @file PowerMeter.cpp
 * @brief Power meter analysis implementation.
 */

#ifdef POWERMETER
#include <Arduino.h>
#include "Clock.h"
#include "Tabs.h"
#include "Report.h"
#include "I2C.h"
#include <Wire.h>
#include <Adafruit_ADS1X15.h>
#include <dsps_fft2r.h>
#include <dsps_wind_blackman.h>

#define NUM_CHANNELS 6
#define SAMPLES 860
#define SAMPLE_RATE 860 //!< ADS1115 max rate
#define FFT_SIZE 512

float bestFreq;   //!< calculated best Frequency from fscan
uint16_t bestBin; //!< calculated best Frequency from fscan

float multiplier = 0.0000625F; //!< ADS1115 with GAIN_TWO

float workspace[SAMPLES]; //!< for full DFT

uint8_t channelIdx = 0;

static float window[SAMPLES];

struct DFTResult
{
    float maxValue;
    uint16_t bestBin;
    float bestFreq;
    float dft[FFT_SIZE / 2]; //!< Store DFT results array
};

struct Info
{
    float mean;
    float min;
    float max;
};

struct GoertzelResult
{
    float amplitude;
    float phase; //!< in radians
};

struct AnalysisResult
{
    DFTResult dsp;
    GoertzelResult gr;
    Info info;
};

AnalysisResult results[6];

GoertzelResult goertzel();
Info removeDCOffset(uint8_t channel);
DFTResult calcDFT(void);
void initDSP();
AnalysisResult processSamples(uint8_t channel);
void initGoertzel(float targetFreq);

bool isPowerMeterEnabled;
Adafruit_ADS1115 ads48, ads49;
int16_t a0cnt = -2, a1cnt = -2, err = 0;
int16_t a0ch = 0, a1ch = 0, result48, error = 0;
int16_t samples[NUM_CHANNELS][SAMPLES];
bool sampleReady0 = false, sampleReady1 = false;
static float a0SampleRate = 0.0f, a1SampleRate = 0.0f;

portMUX_TYPE alert0MuxMain = portMUX_INITIALIZER_UNLOCKED;
portMUX_TYPE alert1MuxMain = portMUX_INITIALIZER_UNLOCKED;

const uint16_t muxChannels[3] = {
    ADS1X15_REG_CONFIG_MUX_DIFF_0_3,
    ADS1X15_REG_CONFIG_MUX_DIFF_1_3,
    ADS1X15_REG_CONFIG_MUX_DIFF_2_3};

uint64_t last0 = 0, last1 = 0, itime, isum = 0, maxItime = 0, minItime = 1000000;

static volatile TickType_t lastTick0 = 0; //!< FreeRTOS tick (1 ms on Arduino-ESP32)

void IRAM_ATTR alert0()
{
    uint64_t i = esp_timer_get_time();
    if ((i - last0) < 1000)
    {
        itime = i - last0;
        err++;
        return; //!< reject events inside 1 ms
    }
    last0 = i;

    if (a0cnt < 859)
    {
        a0cnt++;
        if (a0cnt >= 0)
            sampleReady0 = true;
    }
}

void IRAM_ATTR alert1()
{
    uint64_t i = esp_timer_get_time();
    if ((i - last1) < 1000)
        return; //!< reject events inside 1 ms
    last1 = i;

    if (a1cnt < 859)
    {
        a1cnt++;
        if (a1cnt >= 0)
            sampleReady1 = true;
    }
}

void check_ads()
{
    Wire.beginTransmission(0x48);
    if (Wire.endTransmission() != 0)
    {
        Report.println("ADS48 not found!");
        return;
    }
    Wire.beginTransmission(0x49);
    if (Wire.endTransmission() != 0)
    {
        Report.println("ADS49 not found!");
        return;
    }
    Report.println("ADS48 and 49 are present!");
}

void powerMeterSetup(void)
{
    isPowerMeterEnabled = true;
    if (!ads48.begin())
    {
        Report.println("Failed to initialize ADS at 48.");
        isPowerMeterEnabled = false;
    }
    if (!ads49.begin(0x49))
    {
        Report.println("Failed to initialize ADS at 49.");
        isPowerMeterEnabled = false;
    }
    if (!isPowerMeterEnabled)
        return;

    pinMode(ALERT0_PIN, INPUT_PULLUP);
    pinMode(ALERT1_PIN, INPUT_PULLUP);
    attachInterrupt(digitalPinToInterrupt(ALERT0_PIN), alert0, FALLING);
    attachInterrupt(digitalPinToInterrupt(ALERT1_PIN), alert1, FALLING);
    ads48.setGain(GAIN_TWO); //!< 2x gain   +/- 2.048V  1 bit = 0.0625mV
    ads49.setGain(GAIN_TWO); //!< 2x gain   +/- 2.048V  1 bit = 0.0625mV
    ads48.setDataRate(RATE_ADS1115_860SPS);
    ads49.setDataRate(RATE_ADS1115_860SPS);
    ads48.startADCReading(ADS1X15_REG_CONFIG_MUX_DIFF_0_3, true);
    ads49.startADCReading(ADS1X15_REG_CONFIG_MUX_DIFF_0_3, true);
    initDSP();
}

time_t lastPowerMeterReading = 0;
uint16_t c0 = 0, c1 = 0;
uint32_t maxTSL = 0, minTSL = 100000, sum = 0;
bool running = false;
time_t lastStart = 0;

bool powerMeterLoop(void)
{
    static uint32_t lastMicro, startMicro;
    static uint32_t tsl = 0;
    static int missed0 = 0, missed1 = 0;
    if (!isPowerMeterEnabled)
        return false;
    float multiplier = 0.0000625F; //!< volts per bit for ADS1115 with GAIN_TWO

    //! read 1 channel on each ADC at 860sps for 1s, then rest for 4s
    //! return blocked = true while sampling to block the long duration tft->getTouch

    //! start running
    if (lastStart == 0 || (millis() - lastStart > 5000 && !running))
    {
        lastStart = millis();
        running = true;
        a0cnt = -2;
        a1cnt = -2;
        c0 = 0;
        c1 = 0;
        err = 0;
        ads48.startADCReading(muxChannels[a0ch], true);
        ads49.startADCReading(muxChannels[a1ch], true);
        startMicro = micros();
    }

    if (error > 0)
    {
        Report.printf("Got Error: %d\n", micros() - lastMicro);
        error = 0;
    }
    if (sampleReady0)
    {
        sampleReady0 = false;

        if (c0 > 0)
        {
            tsl = micros() - lastMicro;
            if (tsl > maxTSL)
                maxTSL = tsl;
            if (tsl < minTSL)
                minTSL = tsl;
            sum += tsl;
        }
        lastMicro = micros();
        c0++;
        samples[a0ch][a0cnt] = ads48.getLastConversionResults();
        if (a0cnt == 859)
            a0SampleRate = 860000000.0f / (float)(micros() - startMicro);
    }

    if (sampleReady1)
    {
        sampleReady1 = false;
        if (c1 != a1cnt)
        {
            missed1++;
            c1 = a1cnt;
        }

        c1++;
        samples[3 + a1ch][a1cnt] = ads49.getLastConversionResults();
        if (a1cnt == 859)
            a1SampleRate = 860000000.0f / (float)(micros() - startMicro);
    }

    //! end running
    if (running && a0cnt >= 859 && a1cnt >= 859)
    {
        running = false;
        a0ch = (a0ch + 1) % 3;
        a1ch = (a1ch + 1) % 3;
        missed0 = 0;
        missed1 = 0;
        sum = 0;
        maxTSL = 0;
        minTSL = 100000;

        if (a0ch == 0) //!< we've read all 6 channels and back at 0
        {
            Report.printf("ADS48 rate: %.3f sps, ADS49 rate: %.3f sps, err=%d\n", a0SampleRate, a1SampleRate, err);
            results[0] = processSamples(0);

            if (results[0].info.max - results[0].info.min > 0.1) //!< at least 100mV pk-pk = 500mA, 60W
            {
                Report.println("Signal Found");
                int i = 0;
                //! find first rising crossing
                while (i < SAMPLES - 1 && workspace[i] <= 0 && workspace[i + 1] > 0)
                    i++;
                float firstRiseX = i - workspace[i] / (workspace[i + 1] - workspace[i]);
                Report.printf("first rise at sample %.1f between %.1f and %.1f\n", firstRiseX, workspace[i - 1], workspace[i]);
                //! count all subsequent rising crossings
                int count = 0;
                float lastX = firstRiseX;
                for (; i < SAMPLES - 1; i++)
                {
                    if (workspace[i] < 0 && workspace[i + 1] >= 0)
                    {
                        float thisX = i - workspace[i - 1] / (workspace[i] - workspace[i - 1]);
                        count++;
                        lastX = thisX;
                    }
                }
                float period = (lastX - firstRiseX) / count; //!< in samples
                float freq = a0SampleRate / period;          //!< in Hz

                Report.printf("counted %d periods, period %.1f samples, freq %.2f Hz, phase: %f\n", count, period, freq, 2 * PI * firstRiseX / period);
            }

            Report.println();
            Report.println();
        }
    }

    static bool wasRunning = false;
    if (running)
        wasRunning = true;
    if (!running && wasRunning)
    {
        wasRunning = false;
        c0 = 0;
        c1 = 0;
    }
    return running;
}

AnalysisResult processSamples(uint8_t channel)
{
    AnalysisResult result;
    result.info = removeDCOffset(channel);
    result.gr = goertzel();
    result.dsp = calcDFT();
    return result;
}

void initDSP()
{
    initGoertzel(60.0f); //!< 60Hz
    //! Initialize the Blackman window
    dsps_wind_blackman_f32(window, FFT_SIZE);

    esp_err_t err = dsps_fft2r_init_fc32(nullptr, FFT_SIZE);
    if (err != ESP_OK)
    {
        Report.printf("FFT init failed: %d\n", err);
        while (true)
        {
            delay(10);
        }
    }
}

//! Goertzel state
static float coeff, sine, cosine;

//! Initialize Goertzel for a target frequency
void initGoertzel(float targetFreq)
{
    float normalized = 2.0f * M_PI * targetFreq / a0SampleRate; //!< normalize to sample rate
    cosine = cosf(normalized);
    sine = sinf(normalized);
    coeff = 2.0f * cosine;
}

GoertzelResult goertzel()
{
    float Q0 = 0, Q1 = 0, Q2 = 0;
    for (int i = 0; i < SAMPLES; i++)
    {
        float x = workspace[i];
        Q0 = coeff * Q1 - Q2 + x;
        Q2 = Q1;
        Q1 = Q0;
    }
    float real = Q1 - Q2 * cosine;
    float imag = Q2 * sine;
    float amplitude = (2.0 * sqrt(real * real + imag * imag)) / SAMPLES;
    float phase = atan2f(imag, real); //!< phase in radians

    GoertzelResult result;
    result.amplitude = amplitude;
    result.phase = phase;
    return result;
}

Info removeDCOffset(uint8_t channel)
{
    Info info;
    info.min = 1e6;
    info.max = -1e6;
    info.mean = 0;

    int numToAvg = (int)round(floor(860.0f * 60.0f / a0SampleRate) * a0SampleRate / 60.0f);
    //! 1) Copy samples to workspace and
    //! remove DC offset for the given channel
    for (int i = 0; i < SAMPLES; i++)
    {
        workspace[i] = multiplier * samples[channel][i]; //!< copy samples to workspace
        if (workspace[i] > info.max)
            info.max = workspace[i];
        if (workspace[i] < info.min)
            info.min = workspace[i];
        if (i < numToAvg)
            info.mean += workspace[i];
    }
    info.mean /= numToAvg;

    //! remove DC offset
    for (int i = 0; i < SAMPLES; i++)
        workspace[i] -= info.mean;
    return info;
}

static float fftBuf[2 * FFT_SIZE];

DFTResult calcDFT(void)
{
    //! 2) Build the interleaved complex array
    for (int i = 0; i < FFT_SIZE; i++)
    {
        fftBuf[2 * i] = window[i] * workspace[i]; //!< real part
        fftBuf[2 * i + 1] = 0.0f;                 //!< imag part
    }

    //! 3) Run the radix-2 complex FFT
    dsps_fft2r_fc32(fftBuf, FFT_SIZE);

    //! 4) Bit-reverse reorder
    dsps_bit_rev_fc32(fftBuf, FFT_SIZE);

    DFTResult result;
    //! 5) Compute magnitudes into result.dft[] array
    for (int k = 0; k < FFT_SIZE / 2; k++)
    {
        float real = fftBuf[2 * k];
        float imag = fftBuf[2 * k + 1];
        result.dft[k] = 10.0f * log10f(real * real + imag * imag + 1e-12f);
    }

    result.maxValue = result.dft[0];
    result.bestBin = 0;
    result.bestFreq = 0.0f;

    for (int i = 0; i < FFT_SIZE / 2; i++)
    {
        if (result.maxValue < result.dft[i])
        {
            result.maxValue = result.dft[i];
            result.bestBin = i;
            result.bestFreq = i * a0SampleRate / (float)FFT_SIZE; //!< convert index to frequency
        }
    }
    return result;
}

#endif
