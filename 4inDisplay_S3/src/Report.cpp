/**
 * @file Report.cpp
 * @brief Report output routing implementation.
 */

#include "Report.h"

/**
 * @brief Construct a new ReportClass instance with default settings.
 */
ReportClass::ReportClass() {}

/**
 * @brief Write a single byte to connected outputs.
 * @param v Byte to write
 * @return size_t Bytes written
 */
size_t ReportClass::write(uint8_t v)
{
    size_t size = 0;
    if (serial)
    {
        Serial0.write(v);
        Serial.write(v);
        size = 1;
    }
    if (webSerial)
        size = writeWebSerial(&v, 1);
    return size;
}

/**
 * @brief Write a buffer to connected outputs.
 * @param buffer Data buffer
 * @param size Size of buffer
 * @return size_t Bytes written
 */
size_t ReportClass::write(const uint8_t *buffer, size_t size)
{
    if (serial)
    {
        Serial0.write(buffer, size);
        Serial.write(buffer, size);
    }
    if (webSerial)
        size = writeWebSerial(buffer, size);
    return size;
}

ReportClass Report;
