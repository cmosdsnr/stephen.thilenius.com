/**
 * @file SocketCodes.h
 * @brief Sprinkler websocket command codes.
 */

#ifndef SPRINKLER_SOCKET_CODES_H
#define SPRINKLER_SOCKET_CODES_H

#ifdef SPRINKLER
// For updateChannel()
#define DURATION 0
#define ENABLED 1
#define ACTIVE 2
#define START_TIME 3
#define DAY 4

#define NUM_VARS 5

// specific variables
#define BOUNDARY 2
#define DAYS_SINCE_BOUNDARY 3
#define DAY_START 4

/**
 * @brief Sprinkler websocket extension codes.
 * @details These codes are sent from the ESP32 to the client to indicate specific updates or events.
 */
typedef enum
{
    SEND_ITEMS = 100,     //!< update server copy of channel property (duration, enabled, active, start time) for a specific channel and day
    UPDATE_VARIABLES,     //!< update all project variables
    UPDATE_EVENT,         //!< send an event
    UPDATE_NEXT_WATERING, //!< update next watering time text
    ALL_DATA,             //!< response to request for all data
    ACKNOWLEDGE_RULES,    //!< acknowledge that rules were updated
    ACKNOWLEDGE_SUSPEND,  //!< acknowledge suspend update, echoes current suspend list
    ON_OFF,               //!< update on/off status of a channel
} SendSocketCodes;

/**
 * @brief Sprinkler websocket extension codes.
 * @details These codes are received from the client to indicate specific actions or updates.
 */
typedef enum
{
    UPDATE_ITEMS = 100, //!< update properties (duration, enabled, active, start time) for a specific channel and day
    REQUEST_ALL_DATA,   //!< request all channel data
    UPDATE_RULES,       //!< update watering rules
    UPDATE_SUSPEND,     //!< add/remove a suspension entry, or reset the list
} ReceiveSocketCodes;

#define NUM_EVENT_HEADERS 3
#endif
#endif