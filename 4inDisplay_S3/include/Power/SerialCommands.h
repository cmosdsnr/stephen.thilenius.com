/**
 * @file SerialCommands.h
 * @brief Power meter serial command declarations.
 */

#ifndef POWER_SERIAL_COMMANDS_H
#define POWER_SERIAL_COMMANDS_H

#include <stddef.h>

struct MenuItem;

#ifdef POWERMETER
extern const MenuItem menu2[];
extern const size_t menu2Size;
#endif

#endif
