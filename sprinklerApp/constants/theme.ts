/**
 * @module constants/theme
 * @description UI theme tokens: colors, font names, size scale, and shadow presets.
 * Import from the barrel (`constants/index.ts`) rather than directly.
 */

/**
 * Application color palette.
 *
 * @property {string} primary      - Deep purple used for headers and primary actions (#312651).
 * @property {string} secondary    - Muted purple for secondary text (#444262).
 * @property {string} tertiary     - Coral/orange accent for buttons and highlights (#FF7754).
 * @property {string} tertiaryLight - Pale coral for softer accent use (#FFC7A4).
 * @property {string} gray         - Mid gray for labels and icons (#83829A).
 * @property {string} gray2        - Light gray for dividers and placeholders (#C1C0C8).
 * @property {string} white        - Off-white page background (#F3F4F8).
 * @property {string} lightWhite   - Near-white for card/surface backgrounds (#FAFAFC).
 */
const COLORS = {
    primary: "#312651",
    secondary: "#444262",
    tertiary: "#FF7754",
    tertiaryLight: "#FFC7A4",

    gray: "#83829A",
    gray2: "#C1C0C8",

    white: "#F3F4F8",
    lightWhite: "#FAFAFC",
};

/**
 * Font family name constants.
 * These reference the DM Sans typeface variants loaded via Expo's font system.
 *
 * @property {string} regular - DMRegular (400 weight).
 * @property {string} medium  - DMMedium (500 weight).
 * @property {string} bold    - DMBold (700 weight).
 */
const FONT = {
    regular: "DMRegular",
    medium: "DMMedium",
    bold: "DMBold",
};

/**
 * Numeric size scale in points used for `fontSize` and `padding` values.
 *
 * @property {number} xSmall  - 10pt
 * @property {number} small   - 12pt
 * @property {number} medium  - 16pt
 * @property {number} large   - 20pt
 * @property {number} xLarge  - 24pt
 * @property {number} xxLarge - 32pt
 */
const SIZES = {
    xSmall: 10,
    small: 12,
    medium: 16,
    large: 20,
    xLarge: 24,
    xxLarge: 32,
};

/**
 * Pre-built React Native shadow style objects for iOS and Android elevation.
 *
 * @property {object} small  - Subtle shadow (elevation 2).
 * @property {object} medium - Moderate shadow (elevation 5).
 */
const SHADOWS = {
    small: {
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 2,
    },
    medium: {
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 5.84,
        elevation: 5,
    },
};

export { COLORS, FONT, SIZES, SHADOWS };
