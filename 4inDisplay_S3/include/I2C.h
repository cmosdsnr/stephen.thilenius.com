/**
 * @file I2C.h
 * @brief I2C bus initialization and scanning.
 */
/**
 * @brief Scans for devices on the I2C bus.
 *
 * Prints the address of any found devices to Serial.
 * @return void
 */
void scanI2CDevices();

/**
 * @brief Initializes the I2C bus.
 * @return void
 */
void InitI2C(void);