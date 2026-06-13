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
#define SLIDER_X 5
#define SLIDER_Y TAB_H + 50
#define SLIDER_H 12

#define BUTTON_ON_COLOR 0x421a //!< BLUE
#define BUTTON_OFF_COLOR TFT_LIGHTGREY
#define RADIUS 7

/**
 * @brief Construct a new TabConfig object.
 *
 * Initializes the configuration tab with a slider knob sprite.
 *
 * @param tft Display driver.
 */
TabConfig::TabConfig(TFT_eSPI *tft) : Tab()
{
    name = "Configure";
    _tft = tft;
    nameWidth = _tft->textWidth(name.c_str());
    _knob = new TFT_eSprite(tft); //!< Sprite for the slide knob
    _s1 = new Slider(tft, _knob);
    _s1->setSliderScale(3 * 4, 12 * 4);
    _s1->setSliderPosition(8 * 4);
    changed = true;
}

/**
 * @brief Draw the configuration tab interface.
 *
 * Renders the background and creates a slider widget for adjusting
 * the coffee fill level in cups.
 */
void TabConfig::draw()
{
    changed = false;
    _tft->fillRect(0, TAB_H - CORNER_RADIUS, _tft->width(), _tft->height() - TAB_H + CORNER_RADIUS, bgColor);

    //! Create a parameter set for the slider
    slide_t param;

    //! Slider slot parameters
    param.slotWidth = _tft->width() - 70;  //!< Leaves room for text area and knob
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

/**
 * @brief Handle touch input on the Config tab.
 *
 * Forwards the touch coordinates to the slider widget.
 *
 * @param x Touch x coordinate.
 * @param y Touch y coordinate.
 * @param lastClick Milliseconds since the last touch event.
 */
void TabConfig::handle(uint16_t x, uint16_t y, uint32_t lastClick)
{
    _s1->checkTouch(x, y);
}

/**
 * @brief Get the configured fill time in milliseconds.
 *
 * Converts the slider position (in quarter-cups) to a fill duration.
 * One cup takes approximately 2857 ms to fill.
 *
 * @return Fill time in milliseconds.
 */
uint16_t TabConfig::getFillTime(void)
{
    float a = 714.3 * (float)_s1->getSliderPosition();
    printf("pos: %d %f\n", _s1->getSliderPosition(), a);
    return (uint16_t)(a); //!< 20s = 7 cups, 1 cup per 2857ms, getSliderPosition() returns 1/4 cups, so 1/4 cup in 714.3ms
}

/**
 * @brief Per-loop updates for the Config tab.
 *
 * Publishes the slider position as a variable when it changes and
 * handles deferred variable initialization.
 */
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

/**
 * @brief Schedule deferred variable initialization.
 *
 * Sets a flag so that variable values are published on the next loop iteration.
 */
void TabConfig::initializeVariables()
{
    _x = true;
}
#endif
