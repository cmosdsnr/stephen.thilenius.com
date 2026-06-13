#ifndef _Slider_
#define _Slider_

#include <Arduino.h>
#include <TFT_eSPI.h>

/**
 * @file Slider.h
 * @brief TFT slider widget and configuration.
 */

/**
 * @brief Configuration parameters for a slider.
 */
typedef struct slide_t
{
    // createSlider
    uint16_t slotWidth = 100;
    uint16_t slotHeight = 5;
    uint16_t slotColor = TFT_GREEN;
    uint16_t slotBgColor = TFT_BLACK;

    const char *title = "";

    // createKnob
    uint16_t knobWidth = 21;
    uint16_t knobHeight = 21;
    uint16_t knobRadius = 5;
    uint16_t knobColor = TFT_WHITE;
    uint16_t knobLineColor = TFT_RED;

    // setSliderScale
    int16_t sliderLT = 0.0;
    int16_t sliderRB = 100.0;
    int16_t startPosition = 50;
    uint16_t sliderDelay = 2000;

} slide_param;

/**
 * @brief GUI Slider widget for TFT display.
 */
class Slider : public TFT_eSPI
{

public:
    /**
     * @brief Constructor.
     *
     * @param tft Poiner to TFT_eSPI instance
     * @param spr Pointer to TFT_eSprite (optional usage)
     */
    Slider(TFT_eSPI *tft, TFT_eSprite *spr);

    /**
     * @brief Draws the slider at the specified position.
     *
     * @param x X coordinate
     * @param y Y coordinate
     * @param param Slider configuration
     * @return void
     */
    void drawSlider(uint16_t x, uint16_t y, slide_t param);

    /**
     * @brief Draws the slider using stored internal parameters.
     *
     * @param x X coordinate
     * @param y Y coordinate
     * @return void
     */
    void drawSlider(uint16_t x, uint16_t y);

    /**
     * @brief Configures basic slider visual properties.
     *
     * @return bool Success
     */
    bool createSlider(uint16_t slotWidth, uint16_t slotLength, uint16_t slotColor, uint16_t bgColor);

    /**
     * @brief Configures knob visual properties.
     * @return void
     */
    void createKnob(uint16_t kwidth, uint16_t kheight, uint16_t kradius, uint16_t kcolor1, uint16_t kcolor2);

    /**
     * @brief Sets the value scale and update delay.
     *
     * @param min Minimum value
     * @param max Maximum value
     * @param usdelay Update delay in microseconds
     * @return void
     */
    void setSliderScale(int16_t min, int16_t max, uint16_t usdelay);
    void setSliderScale(int16_t min, int16_t max);

    /**
     * @brief Sets the slider position by value.
     * @param val Value within scale range
     * @return void
     */
    void setSliderPosition(int16_t val);

    /**
     * @brief Gets current slider value.
     * @return int16_t Current value
     */
    int16_t getSliderPosition(void);

    /** @brief Returns slider bounds as start/end coordinates. */
    void getBoundingBox(int16_t *xs, int16_t *ys, int16_t *xe, int16_t *ye);
    /** @brief Returns slider bounds as x/y/width/height. */
    void getBoundingRect(int16_t *x, int16_t *y, uint16_t *w, uint16_t *h);

    /** @brief Checks if a touch hits the slider region. */
    bool checkTouch(uint16_t tx, uint16_t ty);
    /** @brief Draws the current value label. */
    void drawValue();

private:
    void moveTo(int16_t val);
    void drawKnob(uint16_t kpos);
    String _title;
    // createSlider
    uint16_t _slotWidth;
    uint16_t _slotHeight;
    uint16_t _slotColor;
    uint16_t _slotBgColor;

    // createKnob
    uint16_t _kwidth;
    uint16_t _kheight;
    uint16_t _kradius;
    uint16_t _kcolor1;
    uint16_t _kcolor2;

    // setSliderScale
    int16_t _sliderMin = 0.0;
    int16_t _sliderMax = 100.0;
    uint16_t _usdelay = 0;

    // drawSlider
    uint16_t _xpos = 0;
    uint16_t _ypos = 0;
    uint16_t _height = 0;
    uint16_t _width = 0;
    uint16_t _textWidth = 0;
    uint16_t _spriteMargin = 0;
    uint16_t _margin = 0;
    bool _invert = false;
    // moveTo
    int16_t _sliderPos = 0;
    uint16_t _kposPrev;

    // checkTouch
    uint16_t _sxs;
    uint16_t _sys;
    uint16_t _sxe;
    uint16_t _sye;

    TFT_eSprite *_spr;
    TFT_eSPI *_tft;
};

#endif
