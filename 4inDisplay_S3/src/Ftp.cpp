#include <Arduino.h>
#include <FS.h>
#include <LittleFS.h>

#define DEFAULT_STORAGE_TYPE_ESP32 STORAGE_LITTLEFS
#include <SimpleFTPServer.h>

/**
 * @file Ftp.cpp
 * @brief FTP server implementation.
 */

/// @brief Global instance of the FTP server.
FtpServer ftpSrv;

/**
 * @brief Callback function for general FTP operations.
 *
 * Handles events such as connect, disconnect, and free space change.
 *
 * @param ftpOperation The type of FTP operation (e.g., connect, disconnect).
 * @param freeSpace The amount of free space available (in bytes).
 * @param totalSpace The total storage space (in bytes).
 */
void _callback(FtpOperation ftpOperation, unsigned int freeSpace, unsigned int totalSpace)
{
    switch (ftpOperation)
    {
    case FTP_CONNECT:
        Serial0.print(F("FTP: Connected!\n"));
        break;
    case FTP_DISCONNECT:
        Serial0.print(F("FTP: Disconnected!\n"));
        break;
    case FTP_FREE_SPACE_CHANGE:
        printf("FTP: Free space change, free %u of %u!\n", freeSpace, totalSpace);
        break;
    default:
        break;
    }
}

/**
 * @brief Callback function for FTP transfer events.
 *
 * Provides feedback on upload progress, completion, or errors.
 *
 * @param ftpOperation The type of transfer operation (start, upload, stop, error).
 * @param name Name of the file being transferred.
 * @param transferredSize Number of bytes transferred so far.
 */
void _transferCallback(FtpTransferOperation ftpOperation, const char *name, unsigned int transferredSize)
{
    switch (ftpOperation)
    {
    case FTP_UPLOAD_START:
        Serial0.print(F("FTP: Upload start!\n"));
        break;
    case FTP_UPLOAD:
        printf("FTP: Upload of file %s byte %u\n", name, transferredSize);
        break;
    case FTP_TRANSFER_STOP:
        Serial0.print(F("FTP: Finish transfer!\n"));
        break;
    case FTP_TRANSFER_ERROR:
        Serial0.print(F("FTP: Transfer error!\n"));
        break;
    default:
        break;
    }
}

/**
 * @brief Initializes the FTP server and sets up callbacks.
 *
 * Sets the username and password and starts the FTP server.
 */
void setupFtp()
{
    //! Ensure LittleFS is mounted
    if (!LittleFS.begin(false))
    {
        Serial0.print(F("FTP: Failed to mount LittleFS\n"));
        return;
    }

    ftpSrv.setCallback(_callback);
    ftpSrv.setTransferCallback(_transferCallback);

    //! Some SimpleFTPServer versions accept FS object in begin
    //! If not, it relies on DEFAULT_STORAGE_TYPE_ESP32
    ftpSrv.begin("cmosdsnr", "qwe123");
}

/**
 * @brief Handles incoming FTP server activity.
 *
 * Call this regularly in the main loop to process FTP requests.
 */
void loopFtp()
{
    ftpSrv.handleFTP();
}
