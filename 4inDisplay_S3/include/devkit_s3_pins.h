/**
 * @file devkit_s3_pins.h
 * @brief ESP32-S3 pin mappings and project pin assignments.
 */

// See Readme.md for more info
//**** !!!!!!!   44Pin Module ***********/
#define GPIO04_A3_T4 4    // Weak pull up on reset
#define GPIO05_A4_T5 5    //
#define GPIO06_A5_T6 6    //
#define GPIO07_A6_T7 7    //
#define GPIO15_U0RST 15   //
#define GPIO16_U0CST 16   //
#define GPIO17_U1TXD 17   //
#define GPIO18_U1RXD 18   //
#define GPIO08_A7_U1RXD 8 // default SDA
#define GPIO03_A2_U1RXD 3 //
// #define GPIO46_LOG 46        // OUTPUT ONLY, TFT_RST
#define GPIO09_A9_T9 9 // default SCL
// #define GPIO10_A8_T10 10   // SPI0_CS0
// #define GPIO11_T11 11   // SPI0_MOSI
// #define GPIO12_T12 12   // SPI0_SCK
// #define GPIO13_T13 13   // SPI0_MISO
#define GPIO14_T14 14 //

// #define GPIO19_USB_N 19 // DO NOT USE
// #define GPIO20_USB_P 20 // DO NOT USE
// #define GPIO21 21          // TFT_CS
#define GPIO47_SPICLK_P 47 //
#define GPIO48_SPICLK_N 48 // LED PIN
#define GPIO45_VSPI 45     // OUTPUT ONLY
// #define GPIO35_MISC 35     // USED FOR PSRAM
// #define GPIO36_MISC 36     // USED FOR PSRAM
// #define GPIO37_MISC 37     // USED FOR PSRAM
// #define GPIO38_MISC 38     // USED FOR PSRAM
#define GPIO39_MTCK 39 //
#define GPIO40_MTDO 40 //
// #define GPIO41_MTDI 41     // TFT_DC
// #define GPIO42_MTMS 42     // SD_CS
#define GPIO02_A1_T2 2 //
#define GPIO01_A0_T1 1 //
// #define GPIO44_U0RXD 44  // DO NOT USE
// #define GPIO43_U0TXD 43  // DO NOT USE

// USED IN platfornio.ini
//	-D TFT_RST=46

//	-D TOUCH_CS=10
//	-D TFT_MOSI=11
//	-D TFT_SCLK=12
//	-D TFT_MISO=13
//	-D TFT_CS=21
//	-D TFT_DC=41
//	-D SD_CS=42

//--------------------------------------------------
// I2C used pins (these can be moved without penalty)

// #define SCL_PIN GPIO47_SPICLK_P
// #define SDA_PIN GPIO48_SPICLK_N

// #define SDA_PIN GPIO18_U1RXD
// #define SCL_PIN GPIO17_U1TXD

#define SDA_PIN GPIO08_A7_U1RXD
#define SCL_PIN GPIO09_A9_T9

//--------------------------------------------------

// #define VA1_PIN GPIO04_A3_T4
// #define VA2_PIN GPIO05_A4_T5
// #define VA3_PIN GPIO06_A5_T6
// #define VA4_PIN GPIO07_A6_T7
// #define VA5_PIN GPIO08_A7_U1RXD
// #define VA6_PIN GPIO03_A2_U1RXD

#define LED_PIN GPIO48_SPICLK_N
#define BUZZER_PIN GPIO45_VSPI // Buzzer pin

// Gliderport pins
#ifdef GLIDERPORT
#define SPEED_PIN GPIO14_T14
#define DIRECTION_PIN GPIO16_U0CST
#define DHT_PIN GPIO03_A2_U1RXD
#endif

// Garage
#ifdef GARAGE
#define MOTION_PIN GPIO01_A0_T1
#define LIGHTS_PIN GPIO41_MTDI
#define POWER_PIN GPIO42_MTMS
#define DOOR_PIN GPIO40_MTDO
#endif

#ifdef COFFEE
#define LIGHTS_PIN GPIO47_SPICLK_P // Light relay (output)
#define FILL_PIN GPIO06_A5_T6      // Fill relay (output)
#define LOCKH_PIN GPIO07_A6_T7     // Lock hold control (output)
#define LOCK_PIN GPIO15_U0RST      // Lock control (output)
#define MOTION_PIN GPIO39_MTCK     // motion sensor (input)

#define PHVR_PIN GPIO01_A0_T1 // photovoltaic Resistor (analog input)
#define LEVL_PIN GPIO02_A1_T2 // Water level sensor (input)
#define ECHO_PIN GPIO04_A3_T4 // Ultrasonic echo (input)
#define TRIG_PIN GPIO05_A4_T5 // Ultrasonic trigger (output)
#endif

#ifdef DESK
#define SPEED_PIN GPIO14_T14
#define DIRECTION_PIN GPIO16_U0CST
#define DAVIS_SPD GPIO02_A1_T2
#define DAVIS_DIR GPIO01_A0_T1
#endif

#ifdef SPRINKLER
#define PUMP_PIN GPIO15_U0RST
#define CH1_PIN GPIO06_A5_T6
#define CH2_PIN GPIO07_A6_T7
#define CH3_PIN GPIO05_A4_T5
#define CH4_PIN GPIO04_A3_T4
#define NC_PIN GPIO16_U0CST
#endif

#ifdef SPRINKLER_NEW
#define PUMP_PIN GPIO15_U0RST
#define CH1_PIN GPIO06_A5_T6
#define CH2_PIN GPIO07_A6_T7
#define CH3_PIN GPIO05_A4_T5
#define CH4_PIN GPIO04_A3_T4
#define NC_PIN GPIO16_U0CST
#endif

#ifdef POWERMETER
#define ALERT0_PIN GPIO39_MTCK
#define ALERT1_PIN GPIO40_MTDO
#endif