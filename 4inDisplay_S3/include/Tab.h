#ifndef Tab_h
#define Tab_h

#include <TFT_eSPI.h>

/**
 * @file Tab.h
 * @brief Base tab interface for the UI.
 */

/**
 * @brief Abstract base class for UI Tabs.
 *
 * Defines the interface for all tab pages in the user interface.
 */
class Tab
{
public:
    Tab();

    /**
     * @brief Main loop function for the tab.
     *
     * Called repeatedly to update logic.
     */
    virtual void loop();

    /**
     * @brief Handle touch events.
     *
     * @param x Touch X coordinate
     * @param y Touch Y coordinate
     * @param lastClick Timestamp of last click
     * @return void
     */
    virtual void handle(uint16_t x, uint16_t y, uint32_t lastClick) = 0; // do actions when touched

    /**
     * @brief Draws the tab content to the screen.
     * @return void
     */
    virtual void draw() = 0;

    /**
     * @brief Resets/Initializes tab specific variables.
     * @return void
     */
    virtual void initializeVariables() {};

    uint16_t bgColor;     ///< Background color of the tab
    String name;          ///< Name of the tab
    uint8_t nameWidth;    ///< Width of the name text in pixels
    TFT_eSPI *_tft;       ///< Pointer to display driver
    bool changed = false; ///< Flag indicating if redraw is needed
    String message = "";  ///< Status message string

    bool isActive = false; ///< Flag indicating if this tab is currently selected
};

#endif