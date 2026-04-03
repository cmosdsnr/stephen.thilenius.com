#ifndef REPORT_H
#define REPORT_H

#include <Arduino.h>
#include <print.h>
#include <WebSerial.h>

/**
 * @file Report.h
 * @brief Unified reporting for Serial and WebSerial.
 */

/**
 * @brief Unified reporting class for Serial and WebSerial output.
 *
 * Extends Print class to allow standard print/println syntax
 * while directing output to both physical Serial and WebSerial.
 */
class ReportClass : public Print
{
public:
    ReportClass();

    /**
     * @brief Writes a single byte to enabled outputs.
     * @param byte The byte to write
     * @return size_t Bytes written
     */
    size_t write(uint8_t byte);

    /**
     * @brief Writes a buffer of data to enabled outputs.
     * @param buffer Data buffer
     * @param size Size of data
     * @return size_t Bytes written
     */
    size_t write(const uint8_t *buffer, size_t size);

    bool serial = true;    ///< Enable physical Serial output
    bool webSerial = true; ///< Enable WebSerial output
};

extern ReportClass Report;
#endif