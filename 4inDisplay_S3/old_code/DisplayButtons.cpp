#include "FS.h"
#include <SPI.h>
#include <TFT_eSPI.h>
#include "Display.h"

// This is the file name used to store the calibration data
// You can change this to create new calibration files.
// The SPIFFS file name must start with "/".
#define CALIBRATION_FILE "/TouchCalData1"

// Set REPEAT_CAL to true instead of false to run calibration
// again, otherwise it will only be done once.
// Repeat calibration if you change the screen rotation.
#define REPEAT_CAL false

// Keypad start position, key sizes and spacing
#define KEY_X 80 // Centre of key
#define KEY_Y 50
#define KEY_W 110 // Width and height
#define KEY_H 75
#define KEY_SPACING_X 10 // X and Y gap
#define KEY_SPACING_Y 5
#define KEY_TEXTSIZE 1 // Font size multiplier
#define NUM_KEYS 6

TFT_eSPI_Button key[2][NUM_KEYS];

void drawButtons();

void buttonsSetup()
{
    tft.fillScreen(TFT_BLACK);
    tft.setFreeFont(&FreeMono9pt7b);
    drawButtons();
}

void buttonsLoop()
{
    uint16_t t_x = 0, t_y = 0; // To store the touch coordinates

    // Get current touch state and coordinates
    bool pressed = tft.getTouch(&t_x, &t_y);

    // Adjust press state of each key appropriately
    for (uint8_t b = 0; b < NUM_KEYS; b++)
    {
        for (int j = 0; j < 2; j++)
        {
            if (pressed && key[j][b].contains(t_x, t_y))
                key[j][b].press(true); // tell the button it is pressed
            else
                key[j][b].press(false); // tell the button it is NOT pressed
        }
    }

    // Check if any key has changed state
    for (uint8_t b = 0; b < NUM_KEYS; b++)
    {
        // If button was just pressed, redraw inverted button
        if (key[0][b].justPressed())
        {
            Serial.println("Row " + (String)b + " ON pressed");
            key[0][b].drawButton(true, "ML_DATUM + " + (String)(b * 10) + "px");
        }

        // If button was just released, redraw normal color button
        if (key[0][b].justReleased())
        {
            Serial.println("Button " + (String)b + " released");
            key[0][b].drawButton(false, "ML_DATUM + " + (String)(b * 10) + "px");
        }
    }
}

void drawButtons()
{
    // Generate buttons with different size X deltas
    for (int i = 0; i < NUM_KEYS; i++)
    {
        for (int j = 0; j < 2; j++)
        {
            key[j][i].initButton(&tft,
                                 KEY_X + j * (KEY_W + KEY_SPACING_X),
                                 KEY_Y + i * (KEY_H + KEY_SPACING_Y), // x, y, w, h, outline, fill, text
                                 KEY_W,
                                 KEY_H,
                                 TFT_BLACK,  // Outline
                                 TFT_CYAN,   // Fill
                                 TFT_BLACK,  // Text
                                 (char *)"", // 10 Byte Label
                                 KEY_TEXTSIZE);

            // Adjust button label X delta according to array position
            // setLabelDatum(uint16_t x_delta, uint16_t y_delta, uint8_t datum)
            key[j][i].setLabelDatum((KEY_W / 2), 0, ML_DATUM);

            // Draw button and specify label string
            // Specifying label string here will allow more than the default 10 byte label
            key[j][i].drawButton(false, j == 0 ? "ON" : "OFF");
        }
    }
}
