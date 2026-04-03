/**
 * @file TabSprinkler.cpp
 * @brief Sprinkler control tab implementation.
 */

#ifdef SPRINKLER
#include <TFT_eWidget.h> //!< Widget library
#include "bmp.h"
#include "Tabs.h"
#include "Sprinkler/TabSprinkler.h"
#include "Report.h"
#include "Buzzer.h"
#include "Slider.h"
#include "devkit_pins.h"

#define LINEH 36
#define TIME_LIGHTS 180 //!< seconds
#define SEVEN_CUPS 20   //!< seconds

#define lineWidth 5

#define BUTTON_WIDTH 110
#define BUTTON_HEIGHT 82
#define BMP_WIDTH 64
#define BMP_HEIGHT 64
#define INDENT 10
#define ICON_SPACING (480 - 3 * BUTTON_WIDTH - 2 * INDENT) / 2
#define BUTTON_Y TAB_H + 10
#define IMAGE_X_OFFSET (BUTTON_WIDTH - BMP_WIDTH) / 2
#define IMAGE_Y_OFFSET (BUTTON_HEIGHT - BMP_HEIGHT) / 2

#define LIGHT_X INDENT
#define FILL_X LIGHT_X + ICON_SPACING + BUTTON_WIDTH
#define LOCK_X FILL_X + ICON_SPACING + BUTTON_WIDTH

#define BUTTON_ON_COLOR 0x421a //!< BLUE
#define BUTTON_OFF_COLOR TFT_LIGHTGREY
#define RADIUS 7

#define lockColor 0x5ae4

/**
 * @brief Construct a new Tab Sprinkler object.
 *
 * @param tft Display driver
 */
TabSprinkler::TabSprinkler(TFT_eSPI *tft) : Tab()
{
    name = "Sprinkler";
    bgColor = 0xd7ff;
    _tft = tft;
    nameWidth = _tft->textWidth(name.c_str());
    changed = true;
}

/**
 * @brief Draws the Sprinkler tab interface.
 */
void TabSprinkler::draw()
{
    changed = false;
    _tft->fillRect(0, TAB_H - CORNER_RADIUS, _tft->width(), _tft->height() - TAB_H + CORNER_RADIUS, bgColor);

    //! Button dimensions and spacing
    int buttonSpacing = 10;
    int buttonWidth = (480 - 4 * buttonSpacing) / 3; //!< 3 buttons per row with spacing
    int buttonHeight = 60;
    int startY = TAB_H + 20;
    int rowSpacing = 20;

    //! Draw 6 buttons in 2 rows of 3
    for (int i = 0; i < 6; i++)
    {
        int row = i / 3; //!< 0 for first row, 1 for second row
        int col = i % 3; //!< 0, 1, 2 for column position

        int x = buttonSpacing + col * (buttonWidth + buttonSpacing);
        int y = startY + row * (buttonHeight + rowSpacing);

        //! Check if pin is HIGH (on) or LOW (off) and set color accordingly
        uint16_t buttonColor = digitalRead(buttonPins[i]) ? TFT_BLUE : TFT_RED;

        //! Draw button with rounded corners - green if on, red if off
        _tft->fillRoundRect(x, y, buttonWidth, buttonHeight, RADIUS, buttonColor);

        //! Draw white text centered on button
        _tft->setTextColor(TFT_WHITE);
        int textWidth = _tft->textWidth(buttonLabels[i]);
        int textX = x + (buttonWidth - textWidth) / 2;
        int textY = y + (buttonHeight - 16) / 2; //!< 16 is approximate font height for size 2
        _tft->drawString(buttonLabels[i], textX, textY, 2);
    }

    _tft->setTextColor(TFT_BLACK); //!< Reset
}

void TabSprinkler::handle(uint16_t x, uint16_t y, uint32_t lastClick)
{
    if (lastClick > 500)
    {

        //! Button dimensions and spacing (same as draw())
        int buttonSpacing = 10;
        int buttonWidth = (480 - 4 * buttonSpacing) / 3;
        int buttonHeight = 60;
        int startY = TAB_H + 20;
        int rowSpacing = 20;

        //! Check if touch is within button area
        for (int i = 0; i < 6; i++)
        {
            int row = i / 3; //!< 0 for first row, 1 for second row
            int col = i % 3; //!< 0, 1, 2 for column position

            int buttonX = buttonSpacing + col * (buttonWidth + buttonSpacing);
            int buttonY = startY + row * (buttonHeight + rowSpacing);

            //! Check if touch is within this button's bounds
            if (x >= buttonX && x <= buttonX + buttonWidth &&
                y >= buttonY && y <= buttonY + buttonHeight)
            {
                quickBeep();

                //! Turn off all other pins off first
                for (int j = 0; j < 6; j++)
                {
                    if (j != i)
                        digitalWrite(buttonPins[j], LOW);
                }

                //! Toggle the pin state
                digitalWrite(buttonPins[i], !digitalRead(buttonPins[i]));

                Report.printf("Toggled %s (pin %d) to %s\n",
                              buttonLabels[i],
                              buttonPins[i],
                              digitalRead(buttonPins[i]) ? "ON" : "OFF");

                //! Redraw to update button colors
                draw();
                return;
            }
        }

        Report.printf("Touch outside buttons x: %d y: %d\n", x, y);
    }
}
static uint8_t lastPct = 101;

void TabSprinkler::loop()
{
    if (changed)
        draw();
}
#endif
