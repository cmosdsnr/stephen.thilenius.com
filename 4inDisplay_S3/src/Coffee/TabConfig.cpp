/**
 * @file TabConfig.cpp
 * @brief Coffee configuration tab implementation.
 */

#ifdef COFFEE
#include <TFT_eWidget.h> //!< Widget library
#include "bmp.h"
#include "Tabs.h"
#include "Coffee/TabConfig.h"
#include "Coffee/Relays.h"
#include "Report.h"
#include "Buzzer.h"
#include "Slider.h"

#define LINEH 36
#define SLIDER_X 150
#define SLIDER_Y TAB_H + 50
#define SLIDER_W 240
#define SLIDER_H 12

#define BUTTON_ON_COLOR 0x421a //!< BLUE
#define BUTTON_OFF_COLOR TFT_LIGHTGREY
#define RADIUS 7

TabConfig::TabConfig(TFT_eSPI *tft) : Tab()
{
    name = "Configure";
    bgColor = 0xd7ff;
    _tft = tft;
    nameWidth = _tft->textWidth(name.c_str());
    _knob = new TFT_eSprite(tft); //!< Sprite for the slide knob
    _s1 = new Slider(tft, _knob);
    changed = true;
}

void TabConfig::draw()
{
    changed = false;
    _tft->fillRect(0, TAB_H - CORNER_RADIUS, _tft->width(), _tft->height() - TAB_H + CORNER_RADIUS, bgColor);

    //! Create a parameter set for the slider
    slide_t param;

    //! Slider slot parameters
    param.slotWidth = SLIDER_W;  //!< Note: ends of slot will be rounded and anti-aliased
    param.slotHeight = SLIDER_H; //!< Length includes rounded ends
    param.slotColor = TFT_BLUE;  //!< Slot colour
    param.slotBgColor = bgColor; //!< Slot background colour for anti-aliasing

    param.title = "Fill Level (cups)";
    //! Slider control knob parameters (smooth rounded rectangle)
    param.knobWidth = 15;
    param.knobHeight = SLIDER_H + 12;
    param.knobRadius = 5;          //!< Corner radius
    param.knobColor = TFT_WHITE;   //!< Anti-aliased with slot backgound colour
    param.knobLineColor = TFT_RED; //!< Colour of marker line (set to same as knobColor for no line)

    //! Slider range and movement speed
    param.sliderLT = 3 * 4;      //!< Left side for horizontal, top for vertical slider
    param.sliderRB = 12 * 4;     //!< Right side for horizontal, bottom for vertical slider
    param.startPosition = 8 * 4; //!< Start position for control knob
    param.sliderDelay = 0;       //!< Microseconds per pixel movement delay (0 = no delay)

    //! Create slider using parameters and plot at 0,0
    _s1->drawSlider(SLIDER_X, SLIDER_Y, param);
}

void TabConfig::handle(uint16_t x, uint16_t y, uint32_t lastClick)
{
    _s1->checkTouch(x, y);
}

//! return ms required to fill
uint16_t TabConfig::getFillTime(void)
{
    float a = 714.3 * (float)_s1->getSliderPosition();
    printf("pos: %d %f\n", _s1->getSliderPosition(), a);
    return (uint16_t)(a); //!< 20s = 7 cups, 1 cup per 2857ms, getSliderPosition() returns 1/4 cups, so 1/4 cup in 714.3ms
}

void TabConfig::loop()
{
    static int16_t lastPos = -1;
    if (_s1->getSliderPosition() != lastPos)
    {
        lastPos = _s1->getSliderPosition();
        writeVariable("Slider Position", String(0.25 * (float)lastPos));
    }
    if (_x)
    {
        _x = false;
        printf("Initializing variables coffee\n");
        writeVariable("Slider Position", String(0.25 * (float)_s1->getSliderPosition()));
    }
}

void TabConfig::initializeVariables()
{
    _x = true;
}
#endif
