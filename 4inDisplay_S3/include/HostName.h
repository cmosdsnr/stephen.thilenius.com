/**
 * @brief Hostname Configuration Selector
 *
 * Includes the appropriate HostName.h file based on the
 * defined project macro (GLIDERPORT, GARAGE, etc.).
 */

#ifdef GLIDERPORT
#include "Gliderport/HostName.h"
#endif

#ifdef GARAGE
#include "Garage/HostName.h"
#endif

#ifdef COFFEE
#include "Coffee/HostName.h"
#endif

#ifdef DESK
#include "Desk/HostName.h"
#endif

#ifdef SPRINKLER
#include "Sprinkler/HostName.h"
#endif

#ifdef POWERMETER
#include "Power/HostName.h"
#endif
