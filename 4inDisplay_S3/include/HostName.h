/**
 * @brief Hostname Configuration Selector
 *
 * The active project's HostName.h is included via ProjectConfig.h.
 * SERVER_HOST and REPORT_NAME are shared across all projects and defined here.
 */

#include "ProjectConfig.h"

// PROJECT_HOST and VERSION are defined in each project's HostName.h (via ProjectConfig.h above)
#define SERVER_HOST  "stephen.thilenius.com"
#define REPORT_NAME  HOST_NAME "-V" VERSION
