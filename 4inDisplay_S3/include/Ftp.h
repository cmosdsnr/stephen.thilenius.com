/**
 * @file Ftp.h
 * @brief FTP server lifecycle helpers.
 */

/**
 * @brief Initializes the FTP server.
 * @return void
 */
extern void setupFtp();

/**
 * @brief Handles FTP server tasks in the main loop.
 * @return void
 */
extern void loopFtp();