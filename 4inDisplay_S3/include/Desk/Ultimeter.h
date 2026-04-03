#ifndef ULTIMETER_H
#define ULTIMETER_H
#include "devkit_s3_pins.h"
#include <HTTPClient.h>

const char fingerprint[] PROGMEM = "21 2b 52 18 ad 87 b8 c0 4b c8 4a 21 86 2a a4 22 c1 ef 0b e6 ad ee 13 7c 48 91 a6 bf 49 6d 37 2e";

const char ca_cert[] PROGMEM = R"EOF(-----BEGIN CERTIFICATE-----
MIIFazCCA1OgAwIBAgIRAIIQz7DSQONZRGPgu2OCiwAwDQYJKoZIhvcNAQELBQAw
TzELMAkGA1UEBhMCVVMxKTAnBgNVBAoTIEludGVybmV0IFNlY3VyaXR5IFJlc2Vh
cmNoIEdyb3VwMRUwEwYDVQQDEwxJU1JHIFJvb3QgWDEwHhcNMTUwNjA0MTEwNDM4
WhcNMzUwNjA0MTEwNDM4WjBPMQswCQYDVQQGEwJVUzEpMCcGA1UEChMgSW50ZXJu
ZXQgU2VjdXJpdHkgUmVzZWFyY2ggR3JvdXAxFTATBgNVBAMTDElTUkcgUm9vdCBY
MTCCAiIwDQYJKoZIhvcNAQEBBQADggIPADCCAgoCggIBAK3oJHP0FDfzm54rVygc
h77ct984kIxuPOZXoHj3dcKi/vVqbvYATyjb3miGbESTtrFj/RQSa78f0uoxmyF+
0TM8ukj13Xnfs7j/EvEhmkvBioZxaUpmZmyPfjxwv60pIgbz5MDmgK7iS4+3mX6U
A5/TR5d8mUgjU+g4rk8Kb4Mu0UlXjIB0ttov0DiNewNwIRt18jA8+o+u3dpjq+sW
T8KOEUt+zwvo/7V3LvSye0rgTBIlDHCNAymg4VMk7BPZ7hm/ELNKjD+Jo2FR3qyH
B5T0Y3HsLuJvW5iB4YlcNHlsdu87kGJ55tukmi8mxdAQ4Q7e2RCOFvu396j3x+UC
B5iPNgiV5+I3lg02dZ77DnKxHZu8A/lJBdiB3QW0KtZB6awBdpUKD9jf1b0SHzUv
KBds0pjBqAlkd25HN7rOrFleaJ1/ctaJxQZBKT5ZPt0m9STJEadao0xAH0ahmbWn
OlFuhjuefXKnEgV4We0+UXgVCwOPjdAvBbI+e0ocS3MFEvzG6uBQE3xDk3SzynTn
jh8BCNAw1FtxNrQHusEwMFxIt4I7mKZ9YIqioymCzLq9gwQbooMDQaHWBfEbwrbw
qHyGO0aoSCqI3Haadr8faqU9GY/rOPNk3sgrDQoo//fb4hVC1CLQJ13hef4Y53CI
rU7m2Ys6xt0nUW7/vGT1M0NPAgMBAAGjQjBAMA4GA1UdDwEB/wQEAwIBBjAPBgNV
HRMBAf8EBTADAQH/MB0GA1UdDgQWBBR5tFnme7bl5AFzgAiIyBpY9umbbjANBgkq
hkiG9w0BAQsFAAOCAgEAVR9YqbyyqFDQDLHYGmkgJykIrGF1XIpu+ILlaS/V9lZL
ubhzEFnTIZd+50xx+7LSYK05qAvqFyFWhfFQDlnrzuBZ6brJFe+GnY+EgPbk6ZGQ
3BebYhtF8GaV0nxvwuo77x/Py9auJ/GpsMiu/X1+mvoiBOv/2X/qkSsisRcOj/KK
NFtY2PwByVS5uCbMiogziUwthDyC3+6WVwW6LLv3xLfHTjuCvjHIInNzktHCgKQ5
ORAzI4JMPJ+GslWYHb4phowim57iaztXOoJwTdwJx4nLCgdNbOhdjsnvzqvHu7Ur
TkXWStAmzOVyyghqpZXjFaH3pO3JLF+l+/+sKAIuvtd7u+Nxe5AW0wdeRlN8NwdC
jNPElpzVmbUq4JUagEiuTDkHzsxHpFKVK7q4+63SM1N95R1NbdWhscdCb+ZAJzVc
oyi3B43njTOQ5yOf+1CceWxG1bQVs5ZufpsMljq4Ui0/1lvh+wjChP4kqKOJ2qxq
4RgqsahDYVvTH9w7jXbyLeiNdd8XM2w9U/t7y0Ff/9yi0GE44Za4rF2LN9d11TPA
mRGunUHBcnWEvgJBQl9nJEiU0Zsnvgc/ubhPgXRR4Xq37Z0j4r7g1SgEEzwxA57d
emyPxgcYxn/eR44/KJ4EBs+lVDR3veyJm+kXQ99b21/+jh5Xos1AnX5iItreGCc=
-----END CERTIFICATE-----)EOF";

/**
 * @brief HTTP ping context.
 */
struct PingData
{
    HTTPClient *http;
};

/**
 * @brief Wind report payload for server updates.
 */
struct WindData : PingData
{
    uint64_t hour;
    uint64_t tick;
    float speed;
    uint16_t direction;
};

#define ANGLE_OFFSET_FALLING 0
#define ANGLE_OFFSET_RISING 0
// a filter is created whose output ranges from 0 to FILTER_RANGE
// the filter goes up or down by FILTER_STEP_PER_INTERRUPT depending on the input pin state
// the resulting internal pin state trips at 7 and 3, hysteresis
#define FILTER_RANGE 6
#define FILTER_TRIP_H 4
#define FILTER_TRIP_L 2

// #define DEBUG_INTERRUPT
#define DEBUG_FREQ 20

#define TIMER_COUNT 10101 // us
#define TICK_COUNT 33     // 33*TIMER_COUNT/1,000,000.333333s

/**
 * @brief Simple 2D point used for wind vector accumulation.
 */
struct point
{
    float x, y;
};

/**
 * @brief Computes wind speed and direction from timer samples.
 */
class Ultimeter
{
public:
    /** @brief Constructs the Ultimeter and initializes the wind timer. */
    Ultimeter();
    /** @brief Initializes the wind timer (legacy API). */
    void InitTimerWind();
    /** @brief Returns the number of samples accumulated. */
    uint32_t getCount() { return _count; }
    /** @brief Returns the accumulated period value. */
    uint16_t getPeriod();
    /** @brief Returns the accumulated rising delay value. */
    uint16_t getDelayRising();
    /** @brief Returns the accumulated falling delay value. */
    uint16_t getDelayFalling();

    /** @brief Returns averaged wind speed/direction and resets accumulation. */
    bool get(float &speed, uint16_t &direction, uint16_t &count, bool rst = false);

    void reset();
    /** @brief Reads wind values (legacy API). */
    void readWind();

    /** @brief Returns the current pin state and change flag. */
    bool state(uint8_t &state);
    /** @brief Updates the wind timer interval in microseconds. */
    void changeIntervalWind(int16_t us);
    /** @brief Detaches the wind timer interrupt. */
    void detachWind();
    /** @brief Attaches the wind timer interrupt. */
    void attachWind();
    /** @brief Prints or toggles debug for wind interrupts. */
    void debugInterruptsWind();
    /** @brief Processes queued timer samples and updates vector. */
    void loop();
    /** @brief Sends wind data to the server. */
    void sendWindDataToServer(uint64_t hour, uint64_t tick, float speed, uint16_t direction);
    /** @brief Pings the server to check connectivity. */
    void pingServer();
    /** @brief Reads the direction pin state. */
    bool getDirectionPin();
    /** @brief Reads the speed pin state. */
    bool getSpeedPin();
    /** @brief Reads the Davis speed pin state. */
    bool getDavisSpdPin();

private:
    uint16_t _count; // number of readings seen
    point _windVector;

    uint64_t lastComm;
    WiFiClientSecure client;
    HTTPClient http; // Ping, httpUpdate;
    PingData dataPing;
    WindData dataUpdate;
    bool clientIsConnected;
};

extern Ultimeter *ultimeter;
extern bool ultimeterVerbose;
#endif