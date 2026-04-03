// response codes

// codes I receive from the ESP32
export enum Codes {
    UPDATE_ITEMS = 100,   //!< update server copy of channel property (duration, enabled, active, start time) for a specific channel and day
    UPDATE_VARIABLES,     //!< update all project variables
    UPDATE_EVENT,         //!< send an event
    UPDATE_NEXT_WATERING, //!< update next watering time text
    ALL_DATA,             //!< response to request for all data
    ACKNOWLEDGE_RULES,    //!< acknowledge receipt of rules sent to the ESP
    ACKNOWLEDGE_SUSPEND,  //!< acknowledge receipt of suspend list sent to the ESP
    ON_OFF,               //!< channel on/off
};

// codes I send to the ESP32
export enum SendSocketCodes {
    UPDATE_ITEMS = 100,   //!< update properties (duration, enabled, active, start time) for a specific channel and day
    REQUEST_ALL_DATA,     //!< request all channel data
    UPDATE_RULES,         //!< send all rules to the ESP
    UPDATE_SUSPEND,       //!< send suspend list to the ESP
}

// export const gs = {
//     individual: 0,
//     enabled: 1,
//     disabled: 2,
// };

export const NUM_CHANNELS = 7
export const NUM_DAYS = 14
// export const NUM_DAYS = 14
// export const NUM_SUSPENDS = 3



export const dataPoint = {
    DURATION: 0,
    ENABLED: 1,
    ACTIVE: 2,
    STARTTIME: 3
};


export enum itemNames {
    DURATION = 0,
    ENABLED,
    ACTIVE,
    STARTTIME,
    DAY,
    SUSPEND0,
    SUSPEND1,
    SUSPEND2,
    TODAY,
    MANUAL,
};