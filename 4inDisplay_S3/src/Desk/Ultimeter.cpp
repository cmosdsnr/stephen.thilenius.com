#ifdef DESK

// #define DEBUG

#include <Arduino.h>
#include "Desk/WindTimer.h"
#include "Desk/Ultimeter.h"
#include <Clock.h>
#include "SPIMutex.h"

static volatile bool isSending = false;
bool ultimeterVerbose = false;

/**
 * @file Ultimeter.cpp
 * @brief Ultimeter sampling and wind calculation logic.
 * @details Handles anemometer and wind vane sensor data acquisition,
 *          computes wind speed and direction vectors, and transmits
 *          aggregated wind measurements to a remote server.
 */

/**
 * @brief Initialize counters and start the wind timer instance.
 * @details Sets up the Ultimeter with zero counts and wind vectors,
 *          initializes the wind timer, and configures the HTTP client
 *          as insecure for HTTPS communication.
 */
Ultimeter::Ultimeter()
    : _count(0),
      _windVector({0, 0}),
      lastComm(0),
      clientIsConnected(false)
{
    windTimerInstance.begin();
    client.setInsecure();
    client.setHandshakeTimeout(12000);
    http.setTimeout(12000);
}

/**
 * @brief Returns the current direction pin state.
 * @return bool True if direction pin is HIGH, false if LOW
 */
bool Ultimeter::getDirectionPin()
{
    return digitalRead(DIRECTION_PIN);
}

/**
 * @brief Returns the current Davis speed pin state.
 * @return bool True if Davis speed pin is HIGH, false if LOW
 */
bool Ultimeter::getDavisSpdPin()
{
    return digitalRead(DAVIS_SPD);
}

/**
 * @brief Returns the current speed pin state.
 * @return bool True if speed pin is HIGH, false if LOW
 */
bool Ultimeter::getSpeedPin()
{
    return digitalRead(SPEED_PIN);
}

/**
 * @brief Computes average direction based on accumulated vector.
 * @param[out] speed Average wind speed computed from accumulated vector
 * @param[out] direction Average wind direction in degrees (0-360)
 * @param[out] count Number of samples accumulated
 * @param[in] rst If true, resets counters and vectors after retrieval
 * @return bool True if data available (_count > 0), false otherwise
 */
bool Ultimeter::get(float &speed, uint16_t &direction, uint16_t &count, bool rst)
{
    if (!_count)
    {
        speed = 0;
        direction = 270;
        count = 0;
        return false;
    }
    else
    {
        count = _count;
        float dir = atan2(_windVector.y, _windVector.x) * RAD_TO_DEG;
        if (dir < 0)
            dir += 360.0;
        direction = (uint16_t)round(dir);
        speed = sqrt(_windVector.x * _windVector.x + _windVector.y * _windVector.y) / _count;
        if (rst)
            reset();
        return true;
    }
}

/**
 * @brief Retrieves the current state of the wind timer.
 * @param[out] state Wind timer state value
 * @return bool True if state retrieved successfully
 */
bool Ultimeter::state(uint8_t &state)
{
    return windTimerInstance.getState(state);
}

/**
 * @brief Resets accumulated counts and vector.
 * @details Clears the sample counter and resets the wind vector
 *          components to zero.
 */
void Ultimeter::reset()
{
    _count = 0;
    _windVector = {0, 0};
}

/**
 * @brief Consumes queued wind samples and updates the wind vector.
 * @details Main processing loop that:
 *          - Pings the server periodically
 *          - Pops wind timer samples and computes angle/speed
 *          - Accumulates vector components
 *          - Sends aggregated data every 15 seconds
 *          - Handles zero-data scenarios with fallback transmission
 */
void Ultimeter::loop()
{
    int16_t speedHigh, directionLow, directionHigh;
    uint8_t distance = windTimerInstance.length();

    pingServer(); //!< ping the server if needed

    if (!windTimerInstance.pop(speedHigh, directionLow, directionHigh))
    {
        //! printf("No data available: speedHigh=%d, directionLow=%d, directionHigh=%d\n", speedHigh, directionLow, directionHigh);
        return;
    }
    if (_count == 0xfe)
    {
        _count >>= 1;
        _windVector.x /= sqrt(2);
        _windVector.y /= sqrt(2);
    }
    _count++;

    //! using high transition
    float angle = ((360.0 * directionHigh) / speedHigh);
#ifdef DEBUG
    printf("angle:%3.0f\t", angle);
#endif
    //! adjust if necessary
    angle = ANGLE_OFFSET_RISING + angle;
#ifdef DEBUG
    printf("angle with offset:%3.0f\t", angle);
#endif
    if (angle < 0)
        angle += 360;
    else if (angle > 360)
        angle -= 360;

#ifdef DEBUG
    printf("rearranged:%3.0f\t", angle);
#endif

    float spd = 2651.0 / ((TIMER_COUNT / 1000.0) * speedHigh);
    float rad = angle * DEG_TO_RAD;
    _windVector.x += spd * cos(rad);
    _windVector.y += spd * sin(rad);

#ifdef DEBUG
    //! printf("speed:%3.1f\t\tavg:%3.1f\t\tdirection:%4.1f\t\tavg:%4.1f\t\telapsed:%3.0f\t\tcount:%d\r\n",
    //!  speed, speedSum / period, angle, angleSum / count ,period*(TIMER_COUNT / 1000000.0), count);
    printf("average:%3.0f\tcount: %d\r\n", _angleSum / _count, _count);
    if (_count > 10)
        reset();
#endif

    float s = 0;
    uint16_t d, c;
    static uint64_t lastHr = 0;
    static uint64_t lastTick = 0;
    static uint64_t lastMillis = 0;
    if (lastMillis == 0)
    {
        lastMillis = millis() + (1000 * (15 - (getEpoch() % 15))) - 15000;
        printf("lastMillis: %ld\n", lastMillis);
    }
    if (lastMillis + 15000 < millis())
    {
        //! get data and reset counter
        ultimeter->get(s, d, c, true);
        lastMillis += 15000;
        time_t now = getEpoch();
        uint64_t hr = now / 3600L;
        uint64_t tick = (now - hr * 3600L) / 15L;
        if (hr != lastHr || tick != lastTick)
        {
            lastHr = hr;
            lastTick = tick;

            static bool sentZero = false; //!< flag to track if zero has been sent
            static int sentCnt = 0;       //!< counter for how many times we've sent zero
            if (c > 4)
            {
                sentZero = false; //!< reset the zero flag, sending data again
                sentCnt = 0;      //!< reset the counter
                sendWindDataToServer(hr, tick, s, d);
                ultimeter->reset();
            }
            else if (!sentZero) //!< no data, and we have not sent a zero
            {
                sentCnt++; //!< increment 4x for 1 min total
                if (sentCnt >= 4)
                {
                    sentZero = true;                        //!< don't come here again until real data was sent again
                    sentCnt = 0;                            //!< reset the counter
                    sendWindDataToServer(hr, tick, 0, 270); //!< send just once
                }
            }
        }
    }
}

/**
 * @brief Task function for sending wind data to the server asynchronously.
 * @details This FreeRTOS task:
 *          - Constructs a JSON payload with wind measurements
 *          - Adds HTTP headers for the request
 *          - Sends a POST request to the remote server
 *          - Logs the response or error code
 *          - Cleans up allocated resources and terminates
 * @param[in] parameter Pointer to WindData struct containing measurement data
 */
void sendWindDataTask(void *parameter)
{
    WindData *data = (WindData *)parameter;

    String payload = "{\"hour\":" + String(data->hour) +
                     ",\"tick\":" + String(data->tick) +
                     ",\"speed\":" + String(data->speed) +
                     ",\"direction\":" + String(data->direction) + "}";

    data->http->addHeader("Host", "stephen.thilenius.com");
    data->http->addHeader("Content-Type", "application/json");

    //! Send the POST request
    xSemaphoreTake(httpsGuard, portMAX_DELAY);
    int httpResponseCode = data->http->POST(payload);

    //! Check the response code
    if (httpResponseCode > 0)
    {
        String responseBody = data->http->getString();
        responseBody.replace("\"", "");
        if (ultimeterVerbose)
            printf("ultimeterUpdate response body: %s\n", responseBody.c_str());
    }
    else
        printf("Error code: %d\n", httpResponseCode);

    data->http->end(); //!< Free the resources before freeing the struct
    xSemaphoreGive(httpsGuard);
    //! Free the allocated memory
    delete data;
    isSending = false;
    //! Delete the task when done
    vTaskDelete(NULL);
}

/**
 * @brief Initiates transmission of wind data to the remote server.
 * @details Creates an asynchronous FreeRTOS task that:
 *          - Establishes HTTPS connection
 *          - Packages wind measurements into a WindData struct
 *          - Launches sendWindDataTask to handle the POST request
 *          - Updates lastComm timestamp for keepalive tracking
 * @param[in] hour Hour value (0-23) for the measurement period
 * @param[in] tick Tick value (0-3) representing 15-minute intervals
 * @param[in] speed Average wind speed in m/s
 * @param[in] direction Wind direction in degrees (0-360)
 * @pre WiFi must be connected before calling this function
 */
void Ultimeter::sendWindDataToServer(uint64_t hour, uint64_t tick, float speed, uint16_t direction)
{
    lastComm = millis();
    if (WiFi.status() == WL_CONNECTED && !isSending)
    {
        isSending = true;
        String url = "https://stephen.stephen-c19.workers.dev/api/ultimeterUpdate";
        // String url = "https://stephen.thilenius.com/api/ultimeterUpdate";
        if (!http.begin(client, url))
        {
            printf("begin() failed\n");
            isSending = false;
            return;
        }

        WindData *data = new WindData;
        data->hour = hour;
        data->tick = tick;
        data->speed = speed;
        data->direction = direction;
        data->http = &http;

        //! Create a new task to send the data
        BaseType_t result = xTaskCreate(
            sendWindDataTask, //!< Task function
            "SendWindData",   //!< Task name
            8192,             //!< Stack size (in words)
            data,             //!< Task input parameter
            1,                //!< Priority of the task
            NULL              //!< Task handle
        );
        if (result == pdPASS)
        {
            lastComm = millis(); // Only update if task actually started
        }
        else
        {
            delete data; // Prevent memory leak if task creation failed
            printf("Failed to create wind task\n");
            isSending = false;
        }
    }
}

/**
 * @brief Task function for sending ping request to the server asynchronously.
 * @details This FreeRTOS task:
 *          - Sends a lightweight GET request as a keepalive signal
 *          - Logs the server response or error code
 *          - Cleans up allocated resources and terminates
 * @param[in] parameter Pointer to PingData struct containing HTTP client reference
 * @see Ultimeter::pingServer()
 */
void sendWindPingTask(void *parameter)
{
    PingData *data = (PingData *)parameter;
    xSemaphoreTake(httpsGuard, portMAX_DELAY);
    int httpResponseCode = data->http->GET();

    //! Check the response code
    if (httpResponseCode > 0)
    {
        String responseBody = data->http->getString();
        responseBody.replace("\"", "");
        printf("Ping response body: %s\n", responseBody.c_str());
    }
    else
        printf("Ping Error code: %d\n", httpResponseCode);

    data->http->end(); //!< Free the resources before freeing the struct
    xSemaphoreGive(httpsGuard);
    //! Free the allocated memory
    delete data;
    isSending = false;
    //! Delete the task when done
    vTaskDelete(NULL);
}

/**
 * @brief Sends a keepalive ping to the server periodically.
 * @details Implements a heartbeat mechanism that:
 *          - Sends a GET request every 3 minutes if no other communication occurred
 *          - Updates lastComm timestamp on startup and after ping
 *          - Prevents server timeout during periods of inactivity
 *          - Creates asynchronous FreeRTOS task to avoid blocking main loop
 * @pre WiFi must be connected before calling this function
 * @note First ping is sent on initialization; subsequent pings occur if
 *       180000ms (3 minutes) have elapsed since last communication
 */
void Ultimeter::pingServer()
{
    //! run every three minutes if nothing else has happened, and on startup
    if (lastComm > 0 && millis() - lastComm < 180000)
        return;
    lastComm = millis();
    if (WiFi.status() == WL_CONNECTED && !isSending)
    {
        isSending = true;

        String url = "https://stephen.stephen-c19.workers.dev/api/ultimeterPing";
        // String url = "https://stephen.thilenius.com/api/ultimeterPing";
        if (!http.begin(client, url))
        {
            printf("begin() failed\n");
            isSending = false;
            return;
        }

        PingData *data = new PingData;
        data->http = &http;

        //! Create a new task to send the data
        BaseType_t result = xTaskCreate(
            sendWindPingTask, //!< Task function
            "SendWindPing",   //!< Task name
            6144,             //!< Stack size (in words)
            data,             //!< Task input parameter
            1,                //!< Priority of the task
            NULL              //!< Task handle
        );
        if (result == pdPASS)
        {
            lastComm = millis(); // Only update if task actually started
        }
        else
        {
            delete data; // Prevent memory leak if task creation failed
            printf("Failed to create wind task\n");
            isSending = false;
        }
    }
}

/**
 * @brief Global pointer to the Ultimeter singleton instance.
 * @details Provides access to wind measurement and transmission functionality
 *          throughout the application.
 */
Ultimeter *ultimeter = nullptr;
#endif