/**
 * @file PowerMeter.h
 * @brief Power meter module API.
 */

#ifndef POWER_METER_H
#define POWER_METER_H

/**
 * @brief Initialize power meter hardware and state.
 */
void powerMeterSetup();
/**
 * @brief Run the power meter loop.
 * @return True when UI should block other input
 */
bool powerMeterLoop();
/**
 * @brief Check ADS device status.
 */
void check_ads();

#endif