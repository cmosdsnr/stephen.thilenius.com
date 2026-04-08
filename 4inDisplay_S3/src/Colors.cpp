/**
 * @file Colors.cpp
 * @brief Color conversion helpers for the display pipeline.
 */

#include "Colors.h"

/**
 * @brief Converts 8-bit RGB channel values to a 16-bit RGB565 color.
 *
 * @param r Red component in the range 0-255.
 * @param g Green component in the range 0-255.
 * @param b Blue component in the range 0-255.
 * @return uint16_t RGB565-packed color value.
 */
uint16_t rgbTo565(uint8_t r, uint8_t g, uint8_t b)
{
    return ((r & 0xF8) << 8) | ((g & 0xFC) << 3) | (b >> 3);
}

/**
 * @brief Converts a 24-bit RGB888 color value to RGB565.
 *
 * @param rgb888 Color packed as 0xRRGGBB.
 * @return uint16_t RGB565-packed color value.
 */
uint16_t rgbTo565(uint32_t rgb888)
{
    return rgbTo565(
        static_cast<uint8_t>((rgb888 >> 16) & 0xFF),
        static_cast<uint8_t>((rgb888 >> 8) & 0xFF),
        static_cast<uint8_t>(rgb888 & 0xFF));
}