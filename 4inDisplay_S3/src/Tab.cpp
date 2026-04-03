/**
 * @file Tab.cpp
 * @brief Base tab implementation.
 */

#include "Tab.h"
#include "Tabs.h"

Tab::Tab()
{
}

void Tab::loop()
{
    if (changed)
        draw();
}
