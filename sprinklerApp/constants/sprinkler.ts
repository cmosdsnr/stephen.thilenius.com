/**
 * @module constants/sprinkler
 * @description Core configuration constants for the sprinkler system.
 *
 * The schedule model uses a repeating **14-day cycle** (two weeks) across
 * **7 channels** (1 pump + 6 watering zones). Communication uses two code
 * namespaces: {@link Codes} for messages received from the ESP via the backend
 * relay, and {@link SendCodes} for messages sent to the ESP.
 */

/** Base URL for HTTP API calls (schedule load, etc.). */
export const SERVER_URL = 'https://stephen.stephen-c19.workers.dev';

/** WebSocket endpoint URL for real-time device communication. */
export const WSS_URL = 'wss://stephen.stephen-c19.workers.dev';

/** Total number of channels (1 pump + 6 watering zones). */
export const NUM_CHANNELS = 7;

/** Length of the repeating schedule cycle in days (2 weeks). */
export const NUM_DAYS = 14;

/**
 * Human-readable labels for each channel, indexed by channel number.
 * Index 0 is the pump; indices 1–6 are watering zones.
 */
export const CHANNEL_LABELS: string[] = ['PUMP', 'CH1', 'CH2', 'CH3', 'CH4', 'CH5', 'CH6'];

/** Short day-of-week labels (Sun–Sat), used for both week 1 and week 2 display. */
export const DAY_LABELS: string[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Full day-of-week names, indexed the same as {@link DAY_LABELS}. */
export const FULL_DAY_LABELS: string[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Ordered palette of colors used to visually distinguish watering rules on the
 * calendar view. Colors repeat if more than 8 rules are active.
 */
export const RULE_COLORS: string[] = [
    '#4e79a7', '#f28e2b', '#e15759', '#76b7b2',
    '#59a14f', '#edc948', '#b07aa1', '#ff9da7',
];

/**
 * Message codes received **from** the ESP device (relayed via the backend
 * WebSocket server on the `sprinkler` topic).
 */
export const Codes = {
    /** A specific schedule item was updated on the device. */
    UPDATE_ITEMS: 100,
    /** One or more system variables changed (time, epoch, etc.). */
    UPDATE_VARIABLES: 101,
    /** A scheduled watering event fired or completed. */
    UPDATE_EVENT: 102,
    /** The next upcoming watering time was recalculated. */
    UPDATE_NEXT_WATERING: 103,
    /** Full data snapshot sent on initial connection. */
    ALL_DATA: 104,
    /** The device acknowledged a {@link SendCodes.UPDATE_RULES} message. */
    ACKNOWLEDGE_RULES: 105,
    /** The device acknowledged a {@link SendCodes.UPDATE_SUSPEND} message. */
    ACKNOWLEDGE_SUSPEND: 106,
    /** A channel was turned on or off (manual or scheduled). */
    ON_OFF: 107,
} as const;

export type Code = typeof Codes[keyof typeof Codes];

/**
 * Message codes sent **to** the ESP device (via the backend WebSocket relay).
 */
export const SendCodes = {
    /** Update one or more specific schedule items. */
    UPDATE_ITEMS: 100,
    /** Request a full data snapshot from the device. */
    REQUEST_ALL_DATA: 101,
    /** Replace the full rules list on the device. */
    UPDATE_RULES: 102,
    /** Add or remove a suspension for a specific schedule entry. */
    UPDATE_SUSPEND: 103,
} as const;

export type SendCode = typeof SendCodes[keyof typeof SendCodes];
