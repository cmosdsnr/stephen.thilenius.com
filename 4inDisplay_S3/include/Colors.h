#ifndef COLORS_H
#define COLORS_H

#include <stdint.h>

/**
 * @file Colors.h
 * @brief Pastel color palette for tab backgrounds.
 *
 * All colors are stored as 24-bit RGB888 values in 0xRRGGBB format.
 * TAB_COLORS[] assigns one color per tab slot in order, then the display code
 * converts them to RGB565 when needed.
 */

#define COLOR_BABY_PINK 0xFFB3C6
#define COLOR_LAVENDER 0xC9B8F0
#define COLOR_SKY_BLUE 0xAED9F5
#define COLOR_MINT 0xB4EDCC
#define COLOR_BUTTER_YELLOW 0xFFF0A0
#define COLOR_PEACH 0xFFCBA4
#define COLOR_PERIWINKLE 0xBFCFFF
#define COLOR_POWDER_BLUE 0xC5E8F7
#define COLOR_SAGE 0xC8E6C2
#define COLOR_LILAC 0xE8C5F0

uint16_t rgbTo565(uint8_t r, uint8_t g, uint8_t b);
uint16_t rgbTo565(uint32_t rgb888);

constexpr uint32_t TAB_COLORS[] = {
    COLOR_BABY_PINK,
    COLOR_LAVENDER,
    COLOR_SKY_BLUE,
    COLOR_MINT,
    COLOR_BUTTER_YELLOW,
    COLOR_PEACH,
    COLOR_PERIWINKLE,
    COLOR_POWDER_BLUE,
    COLOR_SAGE,
    COLOR_LILAC,
};

constexpr uint8_t TAB_COLOR_COUNT = sizeof(TAB_COLORS) / sizeof(TAB_COLORS[0]);

#endif
