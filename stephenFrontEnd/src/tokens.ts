/**
 * Design tokens — single source of truth for colors and spacing used in TSX.
 * CSS files will be consolidated separately (ToDo #10).
 */

// ---------------------------------------------------------------------------
// Chart series colors
// ---------------------------------------------------------------------------

/** Multi-channel palette used by PowerMeter (Google Charts palette) */
export const chartPalette = [
    '#3366CC', '#DC3912', '#FF9900', '#109618', '#990099',
    '#0099C6', '#DD4477', '#66AA00', '#B82E2E', '#316395',
];

/** Teal — primary series color for SolarEdge and Ultimeter wind speed */
export const chartTeal = {
    solid: 'rgba(75,192,192,1)',
    fill:  'rgba(75,192,192,0.2)',
};

/** Red — secondary series color for Ultimeter wind direction */
export const chartRed = {
    solid: 'rgba(192,75,75,1)',
    fill:  'rgba(192,75,75,0.2)',
};

/** Bootstrap primary blue — used for scan/DFT charts in PowerMeter */
export const chartBlue = {
    solid: '#007bff',
    fill:  'rgba(0,123,255,0.1)',
};

// ---------------------------------------------------------------------------
// Admin UI
// ---------------------------------------------------------------------------

/** Light yellow background behind chart rows in PowerMeter */
export const chartBg = '#FFFFE0';

/** Card / waveform background in PowerMeter staggered plots */
export const cardBg = '#ffffff';

// ---------------------------------------------------------------------------
// Sprinkler
// ---------------------------------------------------------------------------

/** Per-channel background colors for the sprinkler schedule grid */
export const sprinklerChannelColors = [
    'rgb(255, 200, 200)',
    'rgb(200, 225, 255)',
    'rgb(200, 255, 210)',
    'rgb(255, 235, 170)',
    'rgb(230, 200, 255)',
    'rgb(255, 255, 185)',
    'rgb(175, 255, 235)',
    'rgb(255, 200, 235)',
];

/** Week-cycle day backgrounds: blue for cycle 1, orange for cycle 2 */
export const sprinklerCycle = {
    first:  'rgb(200, 230, 255)',
    second: 'rgb(255, 230, 200)',
};

/** Highlighted (selected) day cell */
export const sprinklerSelected = '#e5e491';

// ---------------------------------------------------------------------------
// Semantic UI
// ---------------------------------------------------------------------------

/** Inline error banners */
export const errorBanner = {
    bg:     '#ffcccc',
    border: 'red',
    text:   '#900',
};

/** Inline warning banners */
export const warningBanner = {
    bg:     '#ffe0e0',
    border: 'red',
    text:   'red',
};

/** Muted / caption text */
export const textMuted = '#666';

/** Separator / table border */
export const borderMuted = '#999';
