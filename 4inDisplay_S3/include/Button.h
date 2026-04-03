#ifndef BUTTON_H
#define BUTTON_H

#include <TFT_eSPI.h>
#include <functional>

/**
 * @brief Button class for creating interactive UI elements
 * @details Provides a simple button widget with customizable appearance,
 *          position, size, and callback functionality for touch events
 */
class Button
{
public:
    /**
     * @brief Button constructor
     * @param tft Pointer to TFT display object
     * @param x X position of button (top-left corner)
     * @param y Y position of button (top-left corner)
     * @param width Button width in pixels
     * @param height Button height in pixels
     * @param text Button text label
     * @param bgColor Background color (RGB565 format)
     * @param textColor Text color (RGB565 format)
     * @param callback Function to call when button is pressed
     */
    Button(TFT_eSPI *tft, int x, int y, int width, int height,
           const char *text, uint16_t bgColor, uint16_t textColor,
           std::function<void()> callback = nullptr);

    /**
     * @brief Draws the button on the display
     * @param cornerRadius Radius for rounded corners (default: 5)
     * @details Draws a filled rounded rectangle with centered text
     */
    void draw(int cornerRadius = 5);

    /**
     * @brief Handles touch events for this button
     * @param x X coordinate of touch event
     * @param y Y coordinate of touch event
     * @return true if button was clicked and callback executed
     * @details Checks if touch coordinates are within button bounds
     *          and executes callback if available and debounce time met
     */
    bool handle(uint16_t x, uint16_t y);

    /**
     * @brief Sets or changes the button callback function
     * @param callback New callback function to execute on button press
     */
    void setCallback(std::function<void()> callback);

    /**
     * @brief Changes the button text and redraws if specified
     * @param newText New text for the button
     * @param redraw Whether to immediately redraw the button (default: false)
     */
    void setText(const char *newText, bool redraw = false);

    /**
     * @brief Changes button colors and redraws if specified
     * @param newBgColor New background color
     * @param newTextColor New text color
     * @param redraw Whether to immediately redraw the button (default: false)
     */
    void setColors(uint16_t newBgColor, uint16_t newTextColor, bool redraw = false);

    /**
     * @brief Updates button position
     * @param newX New X position
     * @param newY New Y position
     */
    void setPosition(int newX, int newY);

    /**
     * @brief Updates button size
     * @param newWidth New width
     * @param newHeight New height
     */
    void setSize(int newWidth, int newHeight);

    /**
     * @brief Enables or disables the button
     * @param enabled Button state (true = enabled, false = disabled)
     * @param redraw Whether to immediately redraw the button (default: false)
     * @details Disabled buttons appear grayed out and don't respond to touches
     */
    void setEnabled(bool enabled, bool redraw = false);

    /**
     * @brief Checks if coordinates are within button bounds
     * @param x X coordinate to check
     * @param y Y coordinate to check
     * @return true if coordinates are inside the button area
     */
    bool isInBounds(uint16_t x, uint16_t y) const;

private:
    TFT_eSPI *_tft;                  ///< Pointer to TFT display
    int _x, _y;                      ///< Button position (top-left corner)
    int _width, _height;             ///< Button dimensions
    String _text;                    ///< Button text label
    uint16_t _bgColor;               ///< Background color (RGB565)
    uint16_t _textColor;             ///< Text color (RGB565)
    std::function<void()> _callback; ///< Callback function for button press
    bool _enabled;                   ///< Button enabled state
    uint32_t _minClickInterval;      ///< Minimum time between clicks (ms)

    /**
     * @brief Returns appropriate colors based on enabled state
     * @param bgColor Reference to background color (modified)
     * @param textColor Reference to text color (modified)
     */
    void getDisplayColors(uint16_t &bgColor, uint16_t &textColor) const;
};

#endif // BUTTON_H