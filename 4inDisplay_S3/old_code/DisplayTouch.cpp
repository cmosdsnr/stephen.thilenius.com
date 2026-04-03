#include <SPI.h>
#include <TFT_eSPI.h>
#include "Display.h"
#include "Buzzer.h"

bool SwitchOn = false;

// Comment out to stop drawing black spots
// #define BLACK_SPOT

#define BUTTON_W 75
#define BUTTON_H 65
#define SPACING 12
#define CORNER_RADIUS 15

#define FRAME_W 2 * BUTTON_W + SPACING
#define FRAME_H BUTTON_H
#define FRAME_X 320 - 2 * (BUTTON_W + SPACING)
#define FRAME_Y SPACING + 100

// Red button position
#define RED_BUTTON_X FRAME_X
#define RED_BUTTON_Y FRAME_Y

// Green button position
#define GREEN_BUTTON_X (RED_BUTTON_X + BUTTON_W + SPACING)
#define GREEN_BUTTON_Y FRAME_Y

uint8_t off_offset = 0;
uint8_t on_offset = 0;
void touch_calibrate();
void drawFrame();
void redBtn();
void greenBtn();

//------------------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------
void touchSetup(void)
{
    // clear screen
    // tft.fillScreen(TFT_BLACK);
    // tft.setTextSize(2);
    tft.setTextColor(TFT_WHITE);
    tft.setCursor(SPACING, 100 + SPACING + (BUTTON_H - tft.textsize * 16 + 2) / 2);
    tft.setTextDatum(TL_DATUM);
    tft.println("Power");
    tft.setCursor(SPACING, 100 + SPACING + (BUTTON_H - tft.textsize * 16 + 2) / 2 + tft.textsize * 8 + 2);
    tft.println("Switch");
    off_offset = (BUTTON_W - tft.textWidth("OFF")) / 2;
    on_offset = (BUTTON_W - tft.textWidth("ON")) / 2;
    // tft.drawRect(0, 0, 319, 479, TFT_WHITE);
    // tft.fillRoundRect(10, 120, 320-20, 480-120-10, CORNER_RADIUS, TFT_GREEN);
    // Draw button (this example does not use library Button class)
    redBtn();
}
//------------------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------
void touchLoop()
{
    uint16_t x, y;

    // See if there's any touch data for us
    if (tft.getTouch(&x, &y))
    {
// Draw a block spot to show where touch was calculated to be
#ifdef BLACK_SPOT
        tft.fillCircle(x, y, 2, TFT_BLACK);
#endif

        if (SwitchOn)
        {
            if ((x > RED_BUTTON_X) && (x < (RED_BUTTON_X + BUTTON_W)))
            {
                if ((y > RED_BUTTON_Y) && (y <= (RED_BUTTON_Y + BUTTON_H)))
                {
                    Serial.println("Red btn hit");
                    redBtn();
                    // buzz();
                }
            }
        }
        else // Record is off (SwitchOn == false)
        {
            if ((x > GREEN_BUTTON_X) && (x < (GREEN_BUTTON_X + BUTTON_W)))
            {
                if ((y > GREEN_BUTTON_Y) && (y <= (GREEN_BUTTON_Y + BUTTON_H)))
                {
                    Serial.println("Green btn hit");
                    greenBtn();
                    // buzz();
                }
            }
        }

        Serial.println(SwitchOn);
    }
}

void drawFrame()
{
    tft.drawRect(FRAME_X, FRAME_Y, FRAME_W, FRAME_H, TFT_BLACK);
}

// Draw a red button
void redBtn()
{
    tft.fillRoundRect(RED_BUTTON_X, RED_BUTTON_Y, BUTTON_W, BUTTON_H, CORNER_RADIUS, TFT_RED);
    tft.fillRoundRect(GREEN_BUTTON_X, GREEN_BUTTON_Y, BUTTON_W, BUTTON_H, CORNER_RADIUS, TFT_DARKGREY);
    drawFrame();
    tft.setTextColor(TFT_WHITE);
    tft.setTextSize(2);
    tft.setTextDatum(CL_DATUM);
    tft.drawString("ON", on_offset + GREEN_BUTTON_X, GREEN_BUTTON_Y + (BUTTON_H / 2));
    tft.setTextColor(TFT_BLACK);
    tft.drawString("OFF", off_offset + RED_BUTTON_X, RED_BUTTON_Y + (BUTTON_H / 2));
    SwitchOn = false;
}

// Draw a green button
void greenBtn()
{
    tft.fillRoundRect(GREEN_BUTTON_X, GREEN_BUTTON_Y, BUTTON_W, BUTTON_H, CORNER_RADIUS, TFT_GREEN);
    tft.fillRoundRect(RED_BUTTON_X, RED_BUTTON_Y, BUTTON_W, BUTTON_H, CORNER_RADIUS, TFT_DARKGREY);
    drawFrame();
    tft.setTextColor(TFT_WHITE);
    tft.setTextSize(2);
    tft.setTextDatum(CL_DATUM);
    tft.drawString("OFF", off_offset + RED_BUTTON_X, RED_BUTTON_Y + (BUTTON_H / 2));
    tft.setTextColor(TFT_BLACK);
    tft.drawString("ON", on_offset + GREEN_BUTTON_X, GREEN_BUTTON_Y + (BUTTON_H / 2));
    SwitchOn = true;
}
