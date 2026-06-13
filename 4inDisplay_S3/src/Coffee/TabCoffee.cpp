/**
 * @file TabCoffee.cpp
 * @brief Coffee control tab implementation.
 */

#ifdef COFFEE
#include <TFT_eWidget.h> //!< Widget library
#include "bmp.h"
#include "Tabs.h"
#include "Coffee/TabCoffee.h"
#include "Coffee/Relays.h"
#include "Report.h"
#include "Buzzer.h"
#include "Slider.h"

#define LINEH 36
#define TIME_LIGHTS 180 //!< seconds
#define SEVEN_CUPS 20   //!< seconds

#define lineWidth 5

#define BUTTON_WIDTH 110
#define BUTTON_HEIGHT 65
#define BMP_WIDTH 64
#define BMP_HEIGHT 64
#define INDENT 10
#define ICON_SPACING (480 - 3 * BUTTON_WIDTH - 2 * INDENT) / 2
#define BUTTON_Y (TAB_H + 3)
#define IMAGE_X_OFFSET (BUTTON_WIDTH - BMP_WIDTH) / 2
#define IMAGE_Y_OFFSET (BUTTON_HEIGHT - BMP_HEIGHT) / 2

#define LIGHT_X INDENT
#define FILL_X LIGHT_X + ICON_SPACING + BUTTON_WIDTH
#define LOCK_X FILL_X + ICON_SPACING + BUTTON_WIDTH

#define BUTTON_ON_COLOR 0x421a //!< BLUE
#define BUTTON_OFF_COLOR TFT_DARKGREY
#define ICON_OFF_COLOR TFT_WHITE
#define RADIUS 7

#define lockColor 0x5ae4

#define BAR_X 10
#define BAR_W 440  // fixed width, leaves room for tick labels
#define BAR_H 18
#define BAR_LABEL_H 12 // space for label above bar
#define BAR_TICK_H 18  // ticks + numbers below bar
#define BAR_TOTAL_H (BAR_LABEL_H + BAR_H + BAR_TICK_H)
#define FILL_BAR_Y (BUTTON_Y + BUTTON_HEIGHT + 8 + BAR_LABEL_H)
#define LIGHT_BAR_Y (FILL_BAR_Y + BAR_H + BAR_TICK_H + 5 + BAR_LABEL_H)
#define SLIDER_Y (LIGHT_BAR_Y + BAR_H + BAR_TICK_H + 8)

/**
 * @brief Construct a new Tab Coffee object.
 *
 * @param tft Display driver
 */
TabCoffee::TabCoffee(TFT_eSPI *tft) : Tab()
{
    name = "Coffee";
    _tft = tft;
    nameWidth = _tft->textWidth(name.c_str());
    _knob = new TFT_eSprite(tft);
    _s1 = new Slider(tft, _knob);
    _s1->setSliderScale(3 * 4, 12 * 4);
    _s1->setSliderPosition(8 * 4);
    changed = true;
}

static uint8_t lastPct = 101;
static bool barDrawn = false;
static bool filling = false;
static uint8_t lastLightPct = 101;
static bool lightBarDrawn = false;

/**
 * @brief Draws the Coffee tab interface.
 *
 * Logic includes drawing buttons for coffee machine control.
 */
void TabCoffee::draw()
{
    changed = false;
    barDrawn = false;
    lightBarDrawn = false;
    lastPct = 101;
    lastLightPct = 101;
    _tft->fillRect(0, TAB_H - CORNER_RADIUS, _tft->width(), _tft->height() - TAB_H + CORNER_RADIUS, bgColor);

    if (relays->AreLightsOn())
    {

        _tft->fillRoundRect(LIGHT_X, BUTTON_Y, BUTTON_WIDTH, BUTTON_HEIGHT, RADIUS, BUTTON_ON_COLOR);
        _tft->drawXBitmap(LIGHT_X + IMAGE_X_OFFSET, BUTTON_Y + IMAGE_Y_OFFSET, light_on_bits, LIGHT_WIDTH, LIGHT_HEIGHT, TFT_YELLOW);
    }
    else
    {
        _tft->fillRoundRect(LIGHT_X, BUTTON_Y, BUTTON_WIDTH, BUTTON_HEIGHT, RADIUS, BUTTON_OFF_COLOR);
        _tft->drawXBitmap(LIGHT_X + IMAGE_X_OFFSET, BUTTON_Y + IMAGE_Y_OFFSET, light_off_bits, LIGHT_WIDTH, LIGHT_HEIGHT, TFT_WHITE);
    }

    if (relays->IsFillOn())
    {

        _tft->fillRoundRect(FILL_X, BUTTON_Y, BUTTON_WIDTH, BUTTON_HEIGHT, RADIUS, BUTTON_ON_COLOR);
        _tft->drawXBitmap(FILL_X + IMAGE_X_OFFSET, BUTTON_Y + IMAGE_Y_OFFSET, water_bits, WATER_WIDTH, WATER_HEIGHT, TFT_YELLOW);
    }
    else
    {
        _tft->fillRoundRect(FILL_X, BUTTON_Y, BUTTON_WIDTH, BUTTON_HEIGHT, RADIUS, BUTTON_OFF_COLOR);
        _tft->drawXBitmap(FILL_X + IMAGE_X_OFFSET, BUTTON_Y + IMAGE_Y_OFFSET, water_bits, WATER_WIDTH, WATER_HEIGHT, TFT_WHITE);
    }

    if (relays->IsLockOn())
    {

        _tft->fillRoundRect(LOCK_X, BUTTON_Y, BUTTON_WIDTH, BUTTON_HEIGHT, RADIUS, BUTTON_ON_COLOR);
        _tft->drawXBitmap(LOCK_X + IMAGE_X_OFFSET, BUTTON_Y + IMAGE_Y_OFFSET, lock_bits, LOCK_WIDTH, LOCK_HEIGHT, TFT_YELLOW);
    }
    else
    {
        _tft->fillRoundRect(LOCK_X, BUTTON_Y, BUTTON_WIDTH, BUTTON_HEIGHT, RADIUS, BUTTON_OFF_COLOR);
        _tft->drawXBitmap(LOCK_X + IMAGE_X_OFFSET, BUTTON_Y + IMAGE_Y_OFFSET, lock_bits, LOCK_WIDTH, LOCK_HEIGHT, TFT_WHITE);
    }
    drawSlider();
}

/**
 * @brief Draw the fill-level slider at the bottom of the screen.
 */
void TabCoffee::drawSlider()
{
    slide_t param;
    param.slotWidth = _tft->width() - 70;
    param.slotHeight = 10;
    param.slotColor = TFT_BLUE;
    param.slotBgColor = bgColor;
    param.title = "Fill Level (cups)";
    param.knobWidth = 15;
    param.knobHeight = 22;
    param.knobRadius = 5;
    param.knobColor = TFT_WHITE;
    param.knobLineColor = TFT_RED;
    param.sliderLT = 3 * 4;
    param.sliderRB = 12 * 4;
    param.startPosition = _s1->getSliderPosition();
    param.sliderDelay = 0;
    _s1->drawSlider(5, SLIDER_Y, param);
}

/**
 * @brief Get the configured fill time in milliseconds.
 * @return Fill time in milliseconds.
 */
uint16_t TabCoffee::getFillTime(void)
{
    return (uint16_t)(714.3 * (float)_s1->getSliderPosition());
}

/**
 * @brief Handle touch input on the Coffee tab.
 *
 * Detects which button (lights, fill, or lock) was pressed based on
 * touch coordinates and toggles the corresponding relay.
 *
 * @param x Touch x coordinate.
 * @param y Touch y coordinate.
 * @param lastClick Milliseconds since the last touch event.
 */
void TabCoffee::handle(uint16_t x, uint16_t y, uint32_t lastClick)
{
    // Slider responds without debounce for smooth dragging
    if (y >= SLIDER_Y)
    {
        _s1->checkTouch(x, y);
        return;
    }

    if (lastClick > 500)
    {
        //! buttons are on left
        if (y > BUTTON_Y && y < BUTTON_Y + BUTTON_HEIGHT)
        {
            quickBeep();
            if (x < FILL_X - ICON_SPACING / 2)
            {
                relays->LightsToggle();
                draw();
            }
            else if (x < LOCK_X - ICON_SPACING / 2)
            {
                relays->FillToggle();
                draw();
            }
            else
            {
                relays->LockToggle();
                draw();
            }
        }
        else
            Report.printf("Nothing x: %d y: %d\n", x, y);
    }
}

/**
 * @brief Draw a progress bar outline, label, and tick marks at the given Y position.
 */
void TabCoffee::drawBarFrame(int16_t y, const char *label)
{
    _tft->setFreeFont(NULL);
    _tft->setTextSize(1);
    _tft->setTextColor(TFT_BLACK);
    _tft->setTextDatum(BL_DATUM);
    _tft->drawString(label, BAR_X, y - 2);
    _tft->drawRect(BAR_X, y, BAR_W, BAR_H, TFT_BLACK);
    _tft->setTextDatum(TC_DATUM);
    for (int i = 0; i <= 10; i++)
    {
        int16_t tx = BAR_X + (BAR_W - 2) * i / 10 + 1;
        _tft->drawFastVLine(tx, y + BAR_H, 4, TFT_BLACK);
        _tft->drawString(String(i * 10), tx, y + BAR_H + 7);
    }
}

/**
 * @brief Update a single progress bar: draw frame if needed, fill, and clear when done.
 */
/**
 * @param grow true = bar grows over time, false = bar shrinks over time
 */
void TabCoffee::updateBar(int16_t y, uint8_t pct, uint8_t &last, bool &drawn, bool grow, const char *label)
{
    if (pct != last)
    {
        if (pct > 0 && pct <= 100)
        {
            if (!drawn)
            {
                drawBarFrame(y, label);
                drawn = true;
            }
            _tft->fillRect(BAR_X + 1, y + 1, BAR_W - 2, BAR_H - 2, bgColor);
            int16_t fillW = (BAR_W - 2) * (grow ? (100 - pct) : pct) / 100;
            _tft->fillRect(BAR_X + 1, y + 1, fillW, BAR_H - 2, TFT_BLUE);
        }
        else if (drawn)
        {
            _tft->fillRect(BAR_X, y - BAR_LABEL_H, BAR_W, BAR_TOTAL_H, bgColor);
            drawn = false;
        }
        last = pct;
    }
}

/**
 * @brief Per-loop updates for the Coffee tab.
 *
 * Runs relay housekeeping, redraws the UI when state changes, and
 * updates the fill and lights progress bars on screen.
 */
void TabCoffee::loop()
{
    relays->loop();

    // Check fill completion before draw() resets state
    if (filling && !relays->IsFillOn())
    {
        filling = false;
        buzz(0, 0);
        startShotReminder();
    }

    if (changed)
        draw();

    // Fill bar with sound
    uint8_t pct = relays->getPercentFill();
    if (pct != lastPct)
    {
        if (pct > 0 && pct <= 100)
        {
            uint16_t freq = 300 + (100 - pct) * 9;
            buzz(freq, 5000);
            filling = true;
        }
    }
    updateBar(FILL_BAR_Y, pct, lastPct, barDrawn, true, "Fill");

    // Lights bar (no sound, shrinking)
    uint8_t lPct = relays->getPercentLights();
    updateBar(LIGHT_BAR_Y, lPct, lastLightPct, lightBarDrawn, false, "Lights");
}
#endif
