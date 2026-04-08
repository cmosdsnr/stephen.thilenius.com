/**
 * @file Tab.cpp
 * @brief Base tab implementation.
 */

#include "Tab.h"
#include "Tabs.h"

/**
 * @brief Construct a new Tab object with default values.
 */
Tab::Tab()
{
}

/**
 * @brief Main loop for the tab.
 *
 * Triggers a redraw if the tab state has changed.
 */
void Tab::loop()
{
    if (changed)
        draw();
}
