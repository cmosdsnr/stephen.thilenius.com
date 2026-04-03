// there are missing bins because there are no words that match the missing accuracy value


// USED ALL WORDS TO CALCULATE
// export const firstGuessX = "LARES"
// export const nextGuessX =
// {
//     '0': 'TONIC', '1': 'HOIST', '2': 'KNOUT', '3': 'TONIC', '4': 'POINT', '5': 'NETOP', '6': 'DICOT', '7': 'DONUT',
//     '8': 'POINT', '9': 'COUNT', '10': 'SHOUT', '11': 'GROUT', '12': 'DROIT', '13': 'POISE', '14': 'WEIRD', '15': 'DICOT',
//     '16': 'SWITH', '17': 'BRUIT', '18': 'CYTON', '19': 'GUYOT', '20': 'TONDI', '21': 'MEINY', '22': 'VOGUE', '23': 'KOMBU',
//     '24': 'DICOT', '25': 'DOWIE', '26': 'COMFY', '27': 'TONIC', '28': 'SNATH', '29': 'STOAI', '30': 'MEANT', '31': 'STAPH',
//     '32': 'MEANT', '33': 'CNIDA', '34': 'DEPTH', '35': 'ASDIC', '36': 'BRANT', '37': 'CHANT', '38': 'GRIPT', '39': 'TREAD',
//     '40': 'SWIPE', '41': 'SHARP', '42': 'TUMID', '43': 'ADAPT', '44': 'BRAES', '45': 'BIOTA', '46': 'SPUTA', '47': 'ORBIT',
//     '48': 'ADMIT', '49': 'AALII', '50': 'AAHED', '51': 'AUDIO', '53': 'CAMPI', '54': 'MINTY', '55': 'SYNTH', '56': 'TUNIC',
//     '57': 'CUMIN', '58': 'THUMP', '59': 'CASTE', '60': 'TOWNY', '61': 'DUSTY', '62': 'COMPT', '63': 'ROBIN', '64': 'AMBRY',
//     '65': 'RUTIN', '66': 'CHIRP', '67': 'AALII', '69': 'RIGHT', '70': 'BOSKY', '71': 'EJECT', '72': 'TYPIC', '73': 'SKIMO',
//     '74': 'BUNDT', '75': 'BEGAT', '76': 'CAMPI', '77': 'AAHED', '78': 'DUTCH', '79': 'AAHED', '80': 'BATCH', '81': 'COLIN',
//     '82': 'THIOL', '83': 'POULT', '84': 'TOILE', '85': 'SPELT', '86': 'DWELT', '87': 'DOUBT', '88': 'SITUP', '89': 'PILOT',
//     '90': 'DROIT', '91': 'BLINK', '92': 'BILLS', '93': 'FOLIC', '95': 'DUOMI', '96': 'FLUOR', '97': 'BUTTY', '98': 'EOSIN',
//     '99': 'BIRCH', '100': 'AAHED', '101': 'BUTCH', '102': 'ANILE', '104': 'AAHED', '105': 'ABAMP', '106': 'BUTLE', '108': 'ALOIN',
//     '109': 'STALL', '110': 'CLANG', '111': 'PLATE', '112': 'SHALT', '113': 'SLEPT', '114': 'BILGE', '116': 'ABMHO', '117': 'GLIAL',
//     '118': 'AALII', '119': 'ARYLS', '120': 'REGAL', '122': 'AAHED', '123': 'ALTER', '125': 'ARLES', '126': 'AMIGO', '127': 'AAHED',
//     '129': 'FERAL', '130': 'BUTLE', '135': 'HILLY', '136': 'STOAI', '137': 'BUILT', '138': 'BELCH', '139': 'ABOVE', '140': 'DUMPY',
//     '141': 'BANDA', '142': 'BUTYL', '143': 'BIGHT', '144': 'MYLAR', '146': 'AAHED', '150': 'ROWTH', '152': 'BUTLE', '153': 'ABAMP',
//     '155': 'CHAFE', '156': 'APACE', '158': 'AAHED', '162': 'CYTON', '163': 'ABOUT', '164': 'PINOT', '165': 'TOGUE', '166': 'ADOWN',
//     '167': 'UNWIT', '168': 'BOVID', '169': 'AAHED', '170': 'BOSUN', '171': 'AALII', '173': 'AAHED', '174': 'DUSTY', '176': 'AHING',
//     '177': 'BEGIN', '178': 'AAHED', '180': 'ACHOO', '182': 'ABIDE', '186': 'ADDAX', '188': 'ABOUT', '189': 'TOMAN', '190': 'AAHED',
//     '191': 'DONUT', '192': 'THANE', '193': 'BERTH', '194': 'DINKY', '195': 'ABACA', '198': 'TODAY', '200': 'DUMPY', '201': 'ABAYA',
//     '203': 'AAHED', '207': 'DUNAM', '209': 'DUMPY', '216': 'MINTY', '217': 'AALII', '218': 'MUNCH', '219': 'CHETH', '220': 'AAHED',
//     '222': 'WYTED', '223': 'BUTLE', '224': 'ACNED', '225': 'BAIZA', '227': 'AAHED', '231': 'CADGY', '232': 'AAHED', '234': 'BUCKO',
//     '236': 'ABIDE', '237': 'AAHED', '240': 'DUMPY', '242': 'AAHED'
// }


// USED FREQUENT WORDS TO CALCULATE

/**
 * First guess to use at start of game (used in reset).
 * @type {string}
 */
export const firstGuess = "RAISE"

/**
 * Second guess to use at step 2.
 * @type {Object}
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
