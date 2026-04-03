
/**
 * @file devkit_32_pins.h
 * @brief ESP32 DevKitC pin mapping notes.
 */

/****************************************************/
/****************************************************/
/*** https://www.studiopieters.nl/esp32-pinout ******/
/****************************************************/
/****************************************************/

//**** !!!!!!!   38Pin Module ***********/
#define GPIO13_A1_4_T4 13   // no pullup
#define GPIO12_A1_5_T5 12   //
#define GPIO14_A1_6_T6 14   // pullup
#define GPIO27_A1_7_T7 27   // no pullup
#define GPIO26_A1_9_DAC2 26 // no pullup
#define GPIO25_A1_8_DAC1 25 // no pullup
#define GPIO33_A0_5_T8 33   // no pullup
#define GPIO32_A0_4_T9 32   // no pullup
#define GPIO35_A0_7 35      // input only
#define GPIO34_A0_6 34      // input only
#define GPIO39_A0_3_VN 39   // input only
#define GPIO36_A0_0_VP 36   // input only

#define GPIO23_MOSI 23    // pullup, SPI
#define GPIO22_SCL 22     // pullup, I2C
#define GPIO01_TX 1       //
#define GPIO03_RX 3       //
#define GPIO21_SDA 21     // pullup, I2C
#define GPIO19_MISO 19    // pullup, SPI
#define GPIO18_CLK 18     // pullup, SPI
#define GPIO05_CS 5       //         SPI
#define GPIO17_TX2 17     // pullup
#define GPIO16_RX2 16     // pullup
#define GPIO04_A1_0_T0 4  //
#define GPIO00_A1_1_T1 0  //
#define GPIO02_A1_2_T2 2  // LED
#define GPIO15_A1_3_T3 15 //

// used pins DEFINED in platformio.ini
#define USED_MOSI GPIO23_MOSI // pullup, SPI
#define USED_MISO GPIO19_MISO // pullup, SPI
#define USED_SCLK GPIO18_CLK  // pullup, SPI
#define USED_CS_SD GPIO27_A1_7_T7
#define USED_CS_TCH GPIO14_A1_6_T6
#define USED_CS_TFT GPIO15_A1_3_T3

// used pins
#define SCL GPIO22_SCL // pullup, I2C
#define SDA GPIO21_SDA // pullup, I2C

#define VA1_PIN GPIO33_A0_5_T8
#define VA2_PIN GPIO32_A0_4_T9
#define VA3_PIN GPIO35_A0_7
#define VA4_PIN GPIO34_A0_6
#define VA5_PIN GPIO39_A0_3_VN
#define VA6_PIN GPIO36_A0_0_VP

#define buzzerA GPIO00_A1_1_T1 // Buzzer pin
#define buzzerB GPIO16_RX2     // Buzzer pin

#define SPEED_PIN GPIO12_A1_5_T5
#define DIRECTION_PIN GPIO13_A1_4_T4
#define TEMP_PIN GPIO35_A0_7
#define TREF_PIN GPIO34_A0_6
/*
ESP32 Peripherals Features
18 Analog-to-Digital Converter (ADC) channels
10 Capacitive sensing GPIOs
3 UART interfaces
3 SPI interfaces
2 I2C interfaces
16 PWM output channels
2 Digital-to-Analog Converters (DAC)
2 I2S interfaces
GPIO Pins
ESP32 Wroom32 DevKit has total 25 GPIOs out of that few pins are Input only Pins,

Input Only Pins

GPIO 34
GPIO 35
GPIO 36
GPIO 39
Not all pins have input pullup, you need external pullup on these pins when using as input pullup.

Pins with internal pull up INPUT_PULLUP

GPIO14
GPIO16
GPIO17
GPIO18
GPIO19
GPIO21
GPIO22
GPIO23
Pins without internal pull up

GPIO13
GPIO25
GPIO26
GPIO27
GPIO32
GPIO33
In arduino to use these pins you can simply use common commands

Example: To make GPIO22 as input and GPIO23 as output

pinMode(22,INPUT_PULLUP);

pinMode(23,OUTPUT);

digitalWrite(23,HIGH);

Analog Input Pins
Note that only a subset of ADC pins and functions are exposed. First, the supplied drivers expose only ADC1. The board layout of the ESP32-DevKitC only exposes some of the pins. Specifically, the following are exposed: ADC1_CH0 , ADC1_CH3 , ADC1_CH4 , ADC1_CH5 , ADC1_CH6 and ADC1_CH7 .

see ESP32 Analog Read Example

Analog to digital conversion is the ability to read a voltage level found on a pin between 0 and some maximum value and convert that analog value into a digital representation. Varying the voltage applied to the pin will change the value read. The ESP32 has an analog to digital converter built into it with a resolution of up to 12 bits which is 4096 distinct values. What that means is that 0 volts will produce a digital value of 0 while the maximum voltage will produce a digital value of 4095 and voltage ranges between these will produce a correspondingly scaled digital value.
One of the properties on the analog to digital converter channels is attenuation. This is a voltage scaling factor. Normally the input range is 0-1V but with different attenuations we can scale the input voltage into this range. The available scales beyond the 0-1V include 0-1.34V, 0-2V and 0-3.6V.

Capacitive touch GPIOs
ESP32 Capacitive Touch Example Code

The ESP32 has 10 internal capacitive touch sensors. These can sense variations in anything that holds an electrical charge, like the human skin. So they can detect variations induced when touching the GPIOs with a finger. These pins can be easily integrated into capacitive pads, and replace mechanical buttons. The capacitive touch pins can also be used to wake up the ESP32 from deep sleep.

Those internal touch sensors are connected to these GPIOs:

T0 (GPIO 4)
T1 (GPIO 0)
T2 (GPIO 2)
T3 (GPIO 15)
T4 (GPIO 13)
T5 (GPIO 12)
T6 (GPIO 14)
T7 (GPIO 27)
T8 (GPIO 33)
T9 (GPIO 32)
Digital to Analog Converter (DAC)
Example code is available here

There are 2 x 8 bits DAC channels on the ESP32 to convert digital signals into analog voltage signal outputs. These are the DAC channels:

DAC1 (GPIO25)
DAC2 (GPIO26)
RTC GPIOs
There is RTC GPIO support on the ESP32. The GPIOs routed to the RTC low-power subsystem can be used when the ESP32 is in deep sleep. These RTC GPIOs can be used to wake up the ESP32 from deep sleep when the Ultra Low Power (ULP) co-processor is running. The following GPIOs can be used as an external wake up source.

RTC_GPIO0 (GPIO36)
RTC_GPIO3 (GPIO39)
RTC_GPIO4 (GPIO34)
RTC_GPIO5 (GPIO35)
RTC_GPIO6 (GPIO25)
RTC_GPIO7 (GPIO26)
RTC_GPIO8 (GPIO33)
RTC_GPIO9 (GPIO32)
RTC_GPIO10 (GPIO4)
RTC_GPIO11 (GPIO0)
RTC_GPIO12 (GPIO2)
RTC_GPIO13 (GPIO15)
RTC_GPIO14 (GPIO13)
RTC_GPIO15 (GPIO12)
RTC_GPIO16 (GPIO14)
RTC_GPIO17 (GPIO27)
PWM
PWM Example Code is here

The ESP32 LED PWM controller has 16 independent channels that can be configured to generate PWM signals with different properties. All pins that can act as outputs can be used as PWM pins (Input only pin GPIOs 34 to 39 can’t generate PWM).

To set a PWM signal, you need to define these parameters in the code:

Signal’s frequency;
Duty cycle;
PWM channel;
GPIO where you want to output the signal.
Serial
Hardware Serial2 Example Code

ESP32 has three serial ports

First Serial RX0, TX0 is used for programming,

GPIO3 (U0RXD)
GPIO1(U0TXD)
Another Serial port is available on

GPIO16 (U2RXD).
GIIO17 (U2TXD).
When programming it is named as Serial2.

I2C
When using the ESP32 with the Arduino IDE, you should use the ESP32 I2C default pins (supported by the Wire library):

GPIO 21 (SDA)
GPIO 22 (SCL)
SPI
By default, the pin mapping for SPI is:

SPI	MOSI	MISO	CLK	CS
VSPI	GPIO 23	GPIO 19	GPIO 18	GPIO 5
HSPI	GPIO 13	GPIO 12	GPIO 14	GPIO 15
Interrupts
All GPIOs can be configured as interrupts.

Enable (EN)
Enable (EN) is the 3.3V regulator’s enable pin. It’s pulled up, so connect to ground to disable the 3.3V regulator. This means that you can use this pin connected to a pushbutton to restart your ESP32.

 */