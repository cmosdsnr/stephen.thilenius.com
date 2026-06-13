/**
 * @file Slider.cpp
 * @brief Slider UI control implementation.
 */

#include "Slider.h"
#include "Report.h"

/**
 * @brief Swaps two values of the same type.
 *
 * @param a First value.
 * @param b Second value.
 */
template <typename T>
static inline void
swap_val(T &a, T &b)
{
    T t = a;
    a = b;
    b = t;
}

/**
 * @brief Constructor with pointers to TFT and sprite instances.
 *
 * @param tft Pointer to TFT_eSPI
 * @param spr Pointer to TFT_eSprite
 */
Slider::Slider(TFT_eSPI *tft, TFT_eSprite *spr)
{
    _tft = tft;
    _spr = spr;
}

/**
 * @brief Create slider with slot parameters.
 *
 * @param slotWidth Width of the slot
 * @param slotLength Length of the slot
 * @param slotColor Color of the slot
 * @param bgColor Background color
 * @return bool Success status
 */
bool Slider::createSlider(uint16_t slotWidth, uint16_t slotLength, uint16_t slotColor, uint16_t bgColor)
{
    _slotHeight = slotWidth;
    _slotWidth = slotLength;
    _slotColor = slotColor;
    _slotBgColor = bgColor;
    _kposPrev = slotLength / 2;
    return 0;
}

/**
 * @brief Create the slider control knob with parameters.
 *
 * @param kwidth Knob width
 * @param kheight Knob height
 * @param kradius Knob radius
 * @param kcolor1 Color 1
 * @param kcolor2 Color 2
 */
void Slider::createKnob(uint16_t kwidth, uint16_t kheight, uint16_t kradius, uint16_t kcolor1, uint16_t kcolor2)
{
    _kwidth = kwidth;
    _kheight = kheight;
    _kradius = kradius;
    _kcolor1 = kcolor1;
    _kcolor2 = kcolor2;

    _sliderPos = _slotWidth / 2;
}

/**
 * @brief Set slider scale range with movement delay in us per pixel.
 *
 * @param min Minimum value
 * @param max Maximum value
 * @param usdelay Delay in microseconds
 */
void Slider::setSliderScale(int16_t min, int16_t max, uint16_t usdelay)
{
    setSliderScale(min, max);
    _usdelay = usdelay;
}

/**
 * @brief Set slider scale range (no movement delay).
 *
 * @param min Minimum value
 * @param max Maximum value
 */
void Slider::setSliderScale(int16_t min, int16_t max)
{

    if (min > max)
    {
        _invert = true;
        swap_val(min, max);
    }
    else
    {
        _invert = false;
    }
    _sliderMin = min;
    _sliderMax = max;
    _sliderPos = min;
}

/**
 * @brief Set slider position to a value in the set scale range.
 *
 * @param val Value to set
 */
void Slider::setSliderPosition(int16_t val)
{
    moveTo(_invert ? _sliderMax - val : val);
}

/**
 * @brief Get the current slider value in set scale range.
 * @return int16_t Current value
 */
int16_t Slider::getSliderPosition(void)
{
    return _invert ? _sliderMax - _sliderPos : _sliderPos;
}

/**
 * @brief Checks if a touch coordinate falls within the slider region and moves the knob.
 *
 * @param tx Touch X coordinate.
 * @param ty Touch Y coordinate.
 * @return bool True if the touch was inside the slider area.
 */
bool Slider::checkTouch(uint16_t tx, uint16_t ty)
{
    if (tx >= (_sxs + _textWidth - 1 + _kwidth / 2) && tx <= _sxe - _kwidth / 2 && ty >= _sys && ty <= _sye)
    {
        uint16_t tp, kd;
        tp = tx - (_sxs + _textWidth - 1 + _kwidth / 2);
        kd = _kwidth;

        int16_t tv = map(tp, 0, _slotWidth - kd / 2, _sliderMin, _sliderMax);
        tv = constrain(tv, _sliderMin, _sliderMax);
        moveTo(tv);
        return true;
    }
    return false;
}

/**
 * @brief Draws the slider at a given position using a parameter struct.
 *
 * Configures all slider and knob properties from the param struct, then renders.
 *
 * @param x X coordinate for the slider.
 * @param y Y coordinate for the slider.
 * @param param Slider configuration parameters.
 */
void Slider::drawSlider(uint16_t x, uint16_t y, slide_t param)
{
    _slotHeight = param.slotHeight;
    _slotWidth = param.slotWidth;
    _slotColor = param.slotColor;
    _slotBgColor = param.slotBgColor;

    _title = param.title;

    //! createKnob
    _kwidth = param.knobWidth;
    _kheight = param.knobHeight;
    _kradius = param.knobRadius;
    _kcolor1 = param.knobColor;
    _kcolor2 = param.knobLineColor;

    //! setSliderScale
    setSliderScale(param.sliderLT, param.sliderRB);

    _sliderPos = param.startPosition;
    _usdelay = param.sliderDelay;

    _kposPrev = _slotWidth / 2;

    drawSlider(x, y);
}

/**
 * @brief Draws the slider at a given position using internal properties.
 *
 * Renders the slot, knob, title, and scale labels on the TFT display.
 *
 * @param x X coordinate for the slider.
 * @param y Y coordinate for the slider.
 */
void Slider::drawSlider(uint16_t x, uint16_t y)
{
    _xpos = x + 2;
    _ypos = y + _kheight / 2 + 2;

    _tft->setTextDatum(TL_DATUM);
    _tft->setTextColor(TFT_BLACK);
    _tft->setTextSize(2); //!< 20px tall (10xN)

    _height = _kheight > 20 + 10 ? _kheight + 2 : 20 + 10 + 2;
    _textWidth = (16 * 2) + 10;

    _width = _slotWidth + _textWidth + _kwidth;
    _sxs = x;
    _sys = y;
    _sxe = x + _width;
    _sye = y + _height;

    _margin = (_height - _slotHeight) / 2;
    _spriteMargin = (_height - _kheight) / 2;
    _tft->drawRoundRect(x, y, _width, _height, _height / 4, TFT_BLACK);
    _tft->fillRoundRect(x + _textWidth - 1 + _kwidth / 2, y + _margin + 1, _slotWidth, _slotHeight, _slotHeight / 4, _slotColor);

    //! add title
    _tft->setTextDatum(TL_DATUM);
    _tft->setTextColor(TFT_BLACK);
    _tft->setTextSize(1);
    uint16_t _title_x = x + (_width - _tft->textWidth(_title.c_str())) / 2;
    _tft->drawString(_title.c_str(), _title_x, y - 15, 2);

    //! add scale
    for (int i = 0; i < 10; i++)
    {
        _tft->drawString(String(i + 3), x + _textWidth + 12 + ((_slotWidth / 10) - 1) * i, y + _height + 2, 2);
    }

    _spr->createSprite(_kwidth + 2, _kheight);
    _spr->fillSprite(_slotBgColor);

    _spr->drawFastVLine(0, _margin - _spriteMargin + 1, _slotHeight, _slotColor);
    _spr->drawFastVLine(_kwidth + 1, _margin - _spriteMargin + 1, _slotHeight, _slotColor);
    //! Draw slider outline
    _spr->fillSmoothRoundRect(1, 0, _kwidth, _kheight, _kradius, _kcolor1, _slotBgColor);

    //! Draw marker stripe
    if (_kcolor1 != _kcolor2)
        _spr->drawFastVLine(_kwidth / 2 + 1, 1, _sye - _sys - 2, _kcolor2);

    _kposPrev = map(_sliderPos, _sliderMin, _sliderMax, _textWidth - 1, _textWidth - 1 + _slotWidth);
    drawKnob(_kposPrev);
    drawValue();
}

/**
 * @brief Draws the current slider value label in the text area.
 */
void Slider::drawValue()
{
    _tft->setTextDatum(TL_DATUM);
    _tft->setTextColor(TFT_BLACK);
    _tft->setTextSize(2);
    _tft->fillRoundRect(_sxs + 1, _sys + 1, _textWidth, _height - 2, _height / 4, _slotBgColor);
    uint8_t pos = getSliderPosition();
    _tft->drawString(String(getSliderPosition() / 4), _sxs + 6 + (pos < 40 ? 4 : 0), _sys, 2);
    _tft->setTextSize(1);
}

/**
 * @brief Animates the knob to a new position within the scale range.
 *
 * @param val Target value to move the slider to.
 */
void Slider::moveTo(int16_t val)
{
    val = constrain(val, _sliderMin, _sliderMax);

    _sliderPos = val;

    uint16_t kpos = map(val, _sliderMin, _sliderMax, _textWidth - 1, _textWidth - 1 + _slotWidth);

    int8_t dp = 1;
    if (kpos < _kposPrev)
        dp = -1;
    while (kpos != _kposPrev)
    {
        _kposPrev += dp;
        drawKnob(_kposPrev);
    }
    drawValue();
}

/**
 * @brief Draws the knob sprite at the specified horizontal position.
 *
 * @param kpos Horizontal pixel position for the knob.
 */
void Slider::drawKnob(uint16_t kpos)
{
    uint16_t x, y;

    x = _xpos + kpos;
    y = _ypos + _spriteMargin - 14;
    _spr->pushSprite(x, y);
}

/**
 * @brief Gets the bounding box of the slider as start and end coordinates.
 *
 * @param xs Pointer to receive the start X coordinate.
 * @param ys Pointer to receive the start Y coordinate.
 * @param xe Pointer to receive the end X coordinate.
 * @param ye Pointer to receive the end Y coordinate.
 */
void Slider::getBoundingBox(int16_t *xs, int16_t *ys, int16_t *xe, int16_t *ye)
{
    //! Bounds already corrected for Sprite wipe action
    *xs = _sxs;
    *ys = _sys;
    *xe = _sxe;
    *ye = _sye;
}

/**
 * @brief Gets the bounding rectangle of the slider as position and dimensions.
 *
 * @param x Pointer to receive the X position.
 * @param y Pointer to receive the Y position.
 * @param w Pointer to receive the width.
 * @param h Pointer to receive the height.
 */
void Slider::getBoundingRect(int16_t *x, int16_t *y, uint16_t *w, uint16_t *h)
{
    //! Corrected to be outside slider draw zone
    *x = _sxs - 1;
    *y = _sys - 1;
    *w = _sxe - _sxs + 1;
    *h = _sye - _sys + 1;
}
