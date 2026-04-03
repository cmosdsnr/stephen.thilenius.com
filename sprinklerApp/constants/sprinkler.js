export const SERVER_URL = 'https://stephen.thilenius.com';
export const WSS_URL = 'wss://stephen.thilenius.com';

export const NUM_CHANNELS = 7;
export const NUM_DAYS = 14;

export const CHANNEL_LABELS = ['PUMP', 'CH1', 'CH2', 'CH3', 'CH4', 'CH5', 'CH6'];
export const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const FULL_DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const RULE_COLORS = [
    '#4e79a7', '#f28e2b', '#e15759', '#76b7b2',
    '#59a14f', '#edc948', '#b07aa1', '#ff9da7',
];

// Codes received FROM the ESP (via backend relay)
export const Codes = {
    UPDATE_ITEMS: 100,
    UPDATE_VARIABLES: 101,
    UPDATE_EVENT: 102,
    UPDATE_NEXT_WATERING: 103,
    ALL_DATA: 104,
    ACKNOWLEDGE_RULES: 105,
    ACKNOWLEDGE_SUSPEND: 106,
    ON_OFF: 107,
};

// Codes sent TO the ESP (via backend relay)
export const SendCodes = {
    UPDATE_ITEMS: 100,
    REQUEST_ALL_DATA: 101,
    UPDATE_RULES: 102,
    UPDATE_SUSPEND: 103,
};
