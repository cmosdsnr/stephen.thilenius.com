/**
 * @file SerialCommands.h
 * @brief Sprinkler serial command menu declarations.
 */

#ifndef SPRINKLER_SERIAL_COMMANDS_H
#define SPRINKLER_SERIAL_COMMANDS_H

#include <stddef.h>

struct MenuItem;

#ifdef SPRINKLER
extern const MenuItem menu2[];
extern const size_t menu2Size;
#endif

#endif
