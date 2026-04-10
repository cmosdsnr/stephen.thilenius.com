/**
 * @file Guesses.tsx
 * @description Pre-computed optimal first and second guesses for the Wordle solver.
 *
 * These values were computed offline by running the full evaluation algorithm against
 * the short word list (2,309 common Wordle solutions) using letter-frequency tiebreaking.
 *
 * Using pre-computed guesses avoids the expensive web-worker evaluation for the first
 * two steps, since the first guess is always the same and the second guess depends only
 * on the 243 possible accuracy patterns returned by the first guess.
 */

/**
 * The optimal first word to guess at the start of every game.
 * Chosen because it minimises the standard deviation of remaining-word counts
 * across all 243 possible accuracy patterns when evaluated against the short word list.
 *
 * @type {string}
 */
export const firstGuess = "RAISE"

/** Lookup type: maps a bin number (accuracy pattern, 0–242) to the best second guess. */
type NextGuessType = { [key: string]: string }

/**
 * Pre-computed optimal second guess for each possible outcome of the first guess.
 *
 * The key is the bin number of the first guess's accuracy pattern, encoded as a
 * base-3 number: `bin = acc[0]×81 + acc[1]×27 + acc[2]×9 + acc[3]×3 + acc[4]`.
 * Missing keys represent accuracy patterns that cannot occur with the chosen first guess.
 *
 * Example: if "RAISE" returns [0,0,0,0,0] (all gray), the bin is 0, and `nextGuess["0"]`
 * gives the best second guess for that outcome.
 *
 * @type {NextGuessType}
 */
export const nextGuess: NextGuessType = {
    "0": "NOBLY", "1": "TOLED", "2": "CLOUT", "3": "SLOTH", "4": "TOLED", "5": "PUNTO", "6": "LUSTY", "7": "HELOT",
    "8": "CLOUT", "9": "LINTY", "10": "LINED", "11": "LINGO", "12": "LINTS", "13": "TINED", "14": "SMELT", "15": "COMPT",
    "18": "COUNT", "19": "HEDGY", "20": "CLOWN", "21": "SNOTS", "22": "PELTS", "23": "PLANT", "24": "WORTH", "25": "DEATH",
    "26": "JUPON", "27": "CLOUT", "28": "DELTA", "29": "PLANT", "30": "SLANT", "31": "LEANT", "32": "SLOTH", "33": "SHALT",
    "34": "SLATY", "35": "BELCH", "36": "COLIN", "37": "TIDAL", "38": "LIANE", "39": "PINTS", "40": "AIDES", "41": "AISLE",
    "42": "AALII", "45": "ANGLO", "46": "ALIEN", "47": "BLAND", "48": "ACOLD", "49": "BUTLE", "50": "ASIDE", "51": "GEMOT",
    "53": "ANISE", "54": "PYLON", "55": "LYNCH", "56": "GULCH", "57": "LUNTS", "58": "SMOLT", "59": "BUTCH", "60": "STONY",
    "62": "MUSTH", "63": "MULCT", "64": "AAHED", "65": "MAVIE", "66": "DEBTS", "69": "BASSI", "72": "LIGHT", "74": "BLAWN",
    "75": "KNELT", "77": "AAHED", "78": "ADMIT", "80": "GYVES", "81": "COUNT", "82": "OUTED", "83": "COUNT", "84": "TURDS",
    "85": "SORED", "86": "POUCH", "87": "THUGS", "88": "ADEPT", "89": "POUCH", "90": "TONIC", "91": "TILED", "92": "LIROT",
    "93": "DINGO", "94": "STREW", "95": "AAHED", "96": "ABAFT", "98": "BIRSE", "99": "CRYPT", "100": "DRAFT", "101": "PUNTO",
    "102": "GROTS", "103": "POWER", "104": "AAHED", "105": "GAWPS", "107": "FRISE", "108": "GROAT", "109": "TREAD", "110": "BRACT",
    "111": "PRATS", "112": "PEELS", "113": "CHANT", "114": "BAHTS", "115": "AAHED", "116": "AMPUL", "117": "CLAIM", "118": "FIRED",
    "119": "AAHED", "120": "AIRTS", "121": "AAHED", "126": "BLOAT", "127": "ARIEL", "128": "AFIRE", "129": "ARILS", "134": "ARISE",
    "135": "CYMOL", "136": "CLEPT", "137": "CLAPT", "138": "DOCKS", "139": "LAWNS", "140": "AARGH", "141": "ABMHO", "143": "CALMS",
    "144": "ACRID", "147": "SNAPS", "150": "AAHED", "153": "DUCHY", "155": "GYVES", "156": "FLUMP", "162": "MUTON", "163": "TOLED",
    "164": "DEBUT", "165": "KNOUT", "166": "OUTED", "167": "AAHED", "168": "ABODE", "169": "BUTLE", "170": "DUOMI", "171": "TIGON",
    "172": "CONED", "173": "AALII", "174": "KNOTS", "175": "DELTS", "179": "AAHED", "180": "AARGH", "181": "ABOON", "182": "DUMPY",
    "183": "AALII", "184": "ABAFT", "189": "MORAY", "190": "PLANT", "191": "AARGH", "192": "DAMAN", "193": "DEALT", "195": "AAHED",
    "198": "ABAYA", "199": "AAHED", "201": "AAHED", "216": "ONLAY", "217": "VELDT", "218": "GENET", "219": "PUNTY", "220": "CALKS",
    "225": "BOVID", "227": "AAHED", "228": "HANGS", "234": "ABACA", "237": "ADMAN", "242": "AAHED"
}
