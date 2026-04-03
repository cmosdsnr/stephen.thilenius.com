#include <esp_system.h>
#include <esp_spi_flash.h>

/**
 * @file espChipInfo.cpp
 * @brief ESP32 chip info implementation.
 */

/**
 * @brief Prints detailed information about the ESP32 chip.
 *
 * This function retrieves and prints various properties of the ESP32 chip,
 * including model type, core count, features (e.g., WiFi, BLE), silicon revision,
 * and flash memory size. Useful for debugging or system introspection.
 *
 * Output is printed to the default system console (via `printf`).
 */
void espChipInfo()
{
    esp_chip_info_t chip_info;
    esp_chip_info(&chip_info);

    printf("ESP32 Chip Information:\n");
    printf("-----------------------\n");

    //! Model
    switch (chip_info.model)
    {
    case CHIP_ESP32:
        printf("Model: ESP32\n");
        break;
    case CHIP_ESP32S2:
        printf("Model: ESP32-S2\n");
        break;
    case CHIP_ESP32S3:
        printf("Model: ESP32-S3\n");
        break;
    case CHIP_ESP32C3:
        printf("Model: ESP32-C3\n");
        break;
    case CHIP_ESP32H2:
        printf("Model: ESP32-H2\n");
        break;
    default:
        printf("Model: unknown\n");
        break;
    }

    //! Number of CPU cores
    printf("Cores: %d\n", chip_info.cores);

    //! Features
    printf("Features:\n");
    if (chip_info.features & CHIP_FEATURE_EMB_FLASH)
    {
        printf("  - Embedded Flash\n");
    }
    if (chip_info.features & CHIP_FEATURE_WIFI_BGN)
    {
        printf("  - WiFi (802.11b/g/n)\n");
    }
    if (chip_info.features & CHIP_FEATURE_BLE)
    {
        printf("  - Bluetooth Low Energy (BLE)\n");
    }
    if (chip_info.features & CHIP_FEATURE_BT)
    {
        printf("  - Bluetooth Classic\n");
    }

    //! Revision number
    printf("Silicon Revision: %d\n", chip_info.revision);

    //! Flash size (in MB)
    printf("Flash size: %dMB\n", spi_flash_get_chip_size() / (1024 * 1024));
}
