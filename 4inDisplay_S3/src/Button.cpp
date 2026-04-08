#include "Button.h"
#include "Report.h"

/**
 * @file Button.cpp
 * @brief Button widget implementation.
 */

/**
 * @brief Construct a new Button object
 *
 * @param tft Pointer to TFT_eSPI instance
 * @param x X coordinate
 * @param y Y coordinate
 * @param width Button width
 * @param height Button height
 * @param text Button label
 * @param bgColor Background color
 * @param textColor Text color
 * @param callback Function to call on click
 */
Button::Button(TFT_eSPI *tft, int x, int y, int width, int height,
               const char *text, uint16_t bgColor, uint16_t textColor,
               std::function<void()> callback)
    : _tft(tft), _x(x), _y(y), _width(width), _height(height),
      _text(text), _bgColor(bgColor), _textColor(textColor),
      _callback(callback), _enabled(true), _minClickInterval(500)
{
}

/**
 * @brief Draws the button on the screen
 *
 * @param cornerRadius Radius of rounded corners
 */
void Button::draw(int cornerRadius)
{
    if (!_tft)
        return;

    uint16_t bgColor, textColor;
    getDisplayColors(bgColor, textColor);

    //! Draw button background
    _tft->fillRoundRect(_x, _y, _width, _height, cornerRadius, bgColor);

    //! Draw button border for better visibility
    _tft->drawRoundRect(_x, _y, _width, _height, cornerRadius, TFT_WHITE);

    //! Calculate text position (centered)
    _tft->setTextDatum(MC_DATUM); //!< Middle Center
    _tft->setTextColor(textColor);

    int textX = _x + _width / 2;
    int textY = _y + _height / 2;

    _tft->drawString(_text, textX, textY, 2); //!< Font size 2
}

/**
 * @brief Handles a touch event and executes the callback if within bounds.
 *
 * @param x X coordinate of the touch event.
 * @param y Y coordinate of the touch event.
 * @return true if the button was clicked and the callback executed.
 */
bool Button::handle(uint16_t x, uint16_t y)
{

    //! Check if click is within button bounds
    if (isInBounds(x, y))
    {
        Report.printf("Button '%s' clicked at (%d, %d)\n", _text.c_str(), x, y);

        //! Execute callback if available
        if (_callback)
        {
            _callback();
        }

        return true;
    }

    return false;
}

/**
 * @brief Sets or changes the button callback function.
 *
 * @param callback New callback function to execute on button press.
 */
void Button::setCallback(std::function<void()> callback)
{
    _callback = callback;
}

/**
 * @brief Changes the button text and optionally redraws.
 *
 * @param newText New text label for the button.
 * @param redraw Whether to immediately redraw the button.
 */
void Button::setText(const char *newText, bool redraw)
{
    _text = newText;
    if (redraw)
    {
        draw();
    }
}

/**
 * @brief Changes button colors and optionally redraws.
 *
 * @param newBgColor New background color (RGB565 format).
 * @param newTextColor New text color (RGB565 format).
 * @param redraw Whether to immediately redraw the button.
 */
void Button::setColors(uint16_t newBgColor, uint16_t newTextColor, bool redraw)
{
    _bgColor = newBgColor;
    _textColor = newTextColor;
    if (redraw)
    {
        draw();
    }
}

/**
 * @brief Updates the button position.
 *
 * @param newX New X coordinate of the top-left corner.
 * @param newY New Y coordinate of the top-left corner.
 */
void Button::setPosition(int newX, int newY)
{
    _x = newX;
    _y = newY;
}

/**
 * @brief Updates the button dimensions.
 *
 * @param newWidth New width in pixels.
 * @param newHeight New height in pixels.
 */
void Button::setSize(int newWidth, int newHeight)
{
    _width = newWidth;
    _height = newHeight;
}

/**
 * @brief Enables or disables the button and optionally redraws.
 *
 * @param enabled true to enable, false to disable (grayed out).
 * @param redraw Whether to immediately redraw the button.
 */
void Button::setEnabled(bool enabled, bool redraw)
{
    _enabled = enabled;
    if (redraw)
    {
        draw();
    }
}

/**
 * @brief Checks whether the given coordinates fall within the button bounds.
 *
 * @param x X coordinate to check.
 * @param y Y coordinate to check.
 * @return true if the coordinates are inside the button area.
 */
bool Button::isInBounds(uint16_t x, uint16_t y) const
{
    return (x >= _x && x <= _x + _width &&
            y >= _y && y <= _y + _height);
}

/**
 * @brief Returns the appropriate colors based on the button's enabled state.
 *
 * @param bgColor Reference to receive the background color.
 * @param textColor Reference to receive the text color.
 */
void Button::getDisplayColors(uint16_t &bgColor, uint16_t &textColor) const
{
    if (_enabled)
    {
        bgColor = _bgColor;
        textColor = _textColor;
    }
    else
    {
        //! Grayed out colors for disabled state
        bgColor = TFT_DARKGREY;
        textColor = TFT_LIGHTGREY;
    }
}
