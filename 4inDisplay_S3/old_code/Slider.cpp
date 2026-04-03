#include "Slider.h"

// Swap any type
template <typename T>
static inline void
swap_val(T &a, T &b)
{
    T t = a;
    a = b;
    b = t;
}

/***************************************************************************************
** Function name:           Slider
** Description:             Constructor with pointers to TFT and sprite instances
***************************************************************************************/
Slider::Slider(TFT_eSPI *tft, TFT_eSprite *spr)
{
    _tft = tft;
    _spr = spr;
}

/***************************************************************************************
** Function name:           createSlider
** Description:             Create slider with slot parameters
***************************************************************************************/
bool Slider::createSlider(uint16_t slotWidth, uint16_t slotLength, uint16_t slotColor, uint16_t bgColor)
{
    _slotWidth = slotWidth;
    _slotLength = slotLength;
    _slotColor = slotColor;
    _slotBgColor = bgColor;
    _kposPrev = slotLength / 2;
    return 0;
}

/***************************************************************************************
** Function name:           createKnob
** Description:             Create the slider control knob with parameters
***************************************************************************************/
void Slider::createKnob(uint16_t kwidth, uint16_t kheight, uint16_t kradius, uint16_t kcolor1, uint16_t kcolor2)
{
    _kwidth = kwidth;
    _kheight = kheight;
    _kradius = kradius;
    _kcolor1 = kcolor1;
    _kcolor2 = kcolor2;

    _sliderPos = _slotLength / 2;
}

/***************************************************************************************
** Function name:           setSliderScale
** Description:             Set slider scale range with movement delay in us per pixel
***************************************************************************************/
void Slider::setSliderScale(int16_t min, int16_t max, uint16_t usdelay)
{
    setSliderScale(min, max);
    _usdelay = usdelay;
}

/***************************************************************************************
** Function name:           setSliderScale
** Description:             Set slider scale range (no movement delay)
***************************************************************************************/
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

/***************************************************************************************
** Function name:           setSliderPosition
** Description:             Set slider position to a value in the set scale range
***************************************************************************************/
void Slider::setSliderPosition(int16_t val)
{
    moveTo(_invert ? _sliderMax - val : val);
}

/***************************************************************************************
** Function name:           getSliderPosition
** Description:             Get the current slider value in set scale range
***************************************************************************************/
int16_t Slider::getSliderPosition(void)
{
    return _invert ? _sliderMax - _sliderPos : _sliderPos;
}

/***************************************************************************************
** Function name:           checkTouch
** Description:             Check is touch x, are inside slider box, if so move slider
***************************************************************************************/
bool Slider::checkTouch(uint16_t tx, uint16_t ty)
{
    if (tx >= _sxs && tx <= _sxe && ty >= _sys && ty <= _sye)
    {
        uint16_t tp, kd;
        tp = tx - _sxs;
        kd = _kwidth;

        int16_t tv = map(tp, _slotWidth / 2 + kd / 2 + 1, _slotLength - _slotWidth / 2 - kd / 2 - 1, _sliderMin, _sliderMax);
        tv = constrain(tv, _sliderMin, _sliderMax);
        moveTo(tv);
        return true;
    }
    return false;
}

/***************************************************************************************
** Function name:           drawSlider
** Description:             drawSlider to TFT screen with set parameters
***************************************************************************************/
void Slider::drawSlider(uint16_t x, uint16_t y, slide_t param)
{
    // createSlider
    _slotWidth = param.slotWidth;
    _slotLength = param.slotLength;
    _slotColor = param.slotColor;
    _slotBgColor = param.slotBgColor;

    _title = param.title;

    // createKnob
    _kwidth = param.knobWidth;
    _kheight = param.knobHeight;
    _kradius = param.knobRadius;
    _kcolor1 = param.knobColor;
    _kcolor2 = param.knobLineColor;

    // setSliderScale
    setSliderScale(param.sliderLT, param.sliderRB);

    _sliderPos = param.startPosition;
    _usdelay = param.sliderDelay;

    _kposPrev = _slotLength / 2;

    drawSlider(x, y);
}

/***************************************************************************************
** Function name:           drawSlider
** Description:             drawSlider to TFT screen and set slider position value
***************************************************************************************/
void Slider::drawSlider(uint16_t x, uint16_t y)
{
    _xpos = x + 2;
    _ypos = y + _kheight / 2 + 2;
    // _tft->drawWideLine(_xpos, _ypos, _xpos + _slotLength, _ypos,_slotWidth, _slotColor, _slotBgColor);

    _sxs = _xpos - 1;
    _sys = _ypos - _kheight / 2 - 1;
    _sxe = _xpos + _slotLength + 2;
    _sye = _ypos + _kheight / 2 + 3;

    int16_t _fill_x, _fill_y;
    uint16_t _fill_w, _fill_h;
    getBoundingRect(&_fill_x, &_fill_y, &_fill_w, &_fill_h);
    _tft->drawRoundRect(_fill_x - 35, _fill_y, _fill_w + 35, _fill_h, _fill_h / 4, TFT_BLACK);
    // _tft->drawLine(_fill_x, _fill_y, _fill_x, _fill_y + _fill_h, TFT_BLACK);

    // add colored slider bar
    int16_t bar_y = _fill_y + (_fill_h - _slotWidth) / 2;
    _tft->fillRoundRect(_fill_x, bar_y, _fill_w, _slotWidth, _slotWidth / 2, _slotColor);

    // add title
    _tft->setTextDatum(TL_DATUM);
    _tft->setTextColor(TFT_BLACK);
    _tft->setTextSize(1);
    uint16_t _title_x = _xpos + (_slotLength - _tft->textWidth(_title.c_str(), 2)) / 2;
    _tft->drawString(_title.c_str(), _title_x, _fill_y - 15, 2);

    // add scale
    for (int i = 0; i < 10; i++)
    {
        _tft->drawString(String(i + 3), _fill_x + 12 + ((_fill_w / 10) - 1) * i, _fill_y + _fill_h + 2, 2);
    }

    _spr->createSprite(_kwidth + 2, _fill_h);
    _spr->fillSprite(_slotBgColor);
    _spr->drawFastHLine(0, 0, _kwidth + 2, TFT_BLACK);
    _spr->drawFastHLine(0, _fill_h - 1, _kwidth + 2, TFT_BLACK);

    _spr->drawFastVLine(0, (_fill_h - _slotWidth) / 2, _slotWidth, _slotColor);
    _spr->drawFastVLine(_kwidth + 1, (_fill_h - _slotWidth) / 2, _slotWidth, _slotColor);
    // Draw slider outline
    _spr->fillSmoothRoundRect(1, 1, _kwidth, _fill_h - 2, _kradius, _kcolor1, _slotBgColor);

    // Draw marker stripe
    if (_kcolor1 != _kcolor2)
        _spr->drawFastVLine(_kwidth / 2 + 1, 1, _sye - _sys - 2, _kcolor2);

    _kposPrev = map(_sliderPos, _sliderMin, _sliderMax, _slotWidth / 2 + 1, _slotLength - _slotWidth / 2 - _kwidth - 1);
    drawKnob(_kposPrev);
    drawValue();
}

/***************************************************************************************
** Function name:           drawValue (private fn)
** Description:             draw teh current value on the left
***************************************************************************************/
void Slider::drawValue()
{
    _tft->setTextDatum(TL_DATUM);
    _tft->setTextColor(TFT_BLACK);
    _tft->setTextSize(2);
    _tft->fillRect(_sxs - 28, _sys + 4, 29, 16, _slotBgColor);
    _tft->drawString(String(getSliderPosition() / 4), _sxs - 28, _sys - 2, 2);
}

/***************************************************************************************
** Function name:           moveTo (private fn)
** Description:             Move the slider to a new value in set range
***************************************************************************************/
void Slider::moveTo(int16_t val)
{
    val = constrain(val, _sliderMin, _sliderMax);

    _sliderPos = val;

    uint16_t kpos = map(val, _sliderMin, _sliderMax, _slotWidth / 2 + 1, _slotLength - _slotWidth / 2 - _kwidth - 1);

    int8_t dp = 1;
    if (kpos < _kposPrev)
        dp = -1;
    while (kpos != _kposPrev)
    {
        _kposPrev += dp;
        drawKnob(_kposPrev);
        // delayMicroseconds(_usdelay);
    }
    drawValue();

    // _spr->deleteSprite();
}

/***************************************************************************************
** Function name:           drawKnob (private fn)
** Description:             Draw the slider control knob at pixel kpos position
***************************************************************************************/
void Slider::drawKnob(uint16_t kpos)
{
    uint16_t x, y;

    x = _xpos + kpos - 1;
    y = _ypos - _kheight / 2 - 2;

    if (_usdelay == 0 && abs(kpos - _kposPrev) > _kwidth + 1)
    {
        _spr->pushSprite(_xpos + _kposPrev, y);
    }

    // Draw slider outline
    // _spr->fillSmoothRoundRect(1, 1, _kwidth, _kheight, _kradius, _kcolor1, _slotBgColor);

    // Draw marker stripe
    if (_kcolor1 != _kcolor2)
        _spr->drawFastVLine(_kwidth / 2 + 1, 0, _sye - _sys - 2, _kcolor2);
    _spr->pushSprite(x, y);
}

/***************************************************************************************
** Function name:           getBoundingBox
** Description:             Return the bounding box as coordinates
***************************************************************************************/
void Slider::getBoundingBox(int16_t *xs, int16_t *ys, int16_t *xe, int16_t *ye)
{
    // Bounds already corrected for Sprite wipe action
    *xs = _sxs;
    *ys = _sys;
    *xe = _sxe;
    *ye = _sye;
}

/***************************************************************************************
** Function name:           getBoundingRect
** Description:             Return outside bounding box rectangle x,y and width,height
***************************************************************************************/
void Slider::getBoundingRect(int16_t *x, int16_t *y, uint16_t *w, uint16_t *h)
{
    // Corrected to be outside slider draw zone
    *x = _sxs - 1;
    *y = _sys - 1;
    *w = _sxe - _sxs + 1;
    *h = _sye - _sys + 1;
}
