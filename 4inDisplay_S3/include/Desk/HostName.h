#ifndef HOST_NAME_H
#define HOST_NAME_H

/**
 * @file HostName.h
 * @brief Defines the Desk host name and version strings.
 */

/** @brief Base host name string for this build. */
#define HOST_NAME "ESP32-DESK"
/** @brief Version string for this build. */
#define VERSION "1.00"
/** @brief Combined report name used in logs/UI. */
#define REPORT_NAME HOST_NAME "-V" VERSION
/** @brief Server host for API calls. */
#define SERVER_HOST "stephen.thilenius.com"

#endif