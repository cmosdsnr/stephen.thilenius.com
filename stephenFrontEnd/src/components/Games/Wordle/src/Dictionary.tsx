/**
 * Dictionary.jsx (Refactored)
 * Provides scoring and evaluation logic for determining best guesses in Wordle-style games.
 */


/**
 * Calculates the accuracy pattern between a guess and a target word.
 * Returns an array of integers (0: incorrect, 1: wrong position, 2: correct).
 * @param {string} guess
 * @param {string} actual
 * @returns {number[]}
 */
export const getAccuracyPattern = (guess, actual) => {
    const pattern = Array(5).fill(0);
    const used = Array(5).fill(false);

    // Pass 1: exact matches
    for (let i = 0; i < 5; i++) {
        if (guess[i] === actual[i]) {
            pattern[i] = 2;
            used[i] = true;
        }
    }

    // Pass 2: wrong-position matches
    for (let i = 0; i < 5; i++) {
        if (pattern[i] === 0) {
            for (let j = 0; j < 5; j++) {
                if (!used[j] && guess[i] === actual[j]) {
                    pattern[i] = 1;
                    used[j] = true;
                    break;
                }
            }
        }
    }
    return pattern;
};

/**
 * Converts an array of accuracy digits (base 3) into a single number for binning.
 * @param {number[]} pattern - Array of 5 digits (0-2)
 * @returns {number} - A unique number (0-242)
 */
export const accuracyToBin = (pattern) => {
    return pattern.reduce((acc, val, idx) => acc + val * Math.pow(3, 4 - idx), 0);
};


/**
 * Evaluates all candidate guess words against possible answers.
 * Finds the guess with the smallest standard deviation in resulting accuracy bins.
 *
 * @param {Object} best - Output object to be mutated.
 * @param {string[]} possibleWordList - Actual candidate answers.
 * @param {string[]} wordList - Words to evaluate as guesses.
 */
export const evaluate = (best, possibleWordList, wordList) => {
    best = {};
    for (const guess of wordList) {
        const binCounts = Array(243).fill(0);
        for (const answer of possibleWordList) {
            const pattern = getAccuracyPattern(guess, answer);
            const bin = accuracyToBin(pattern);
            binCounts[bin]++;
        }

        // Expected remaining candidates: Σ(binCount²) / N
        // See evaluate.tsx for full derivation and explanation.
        const N = possibleWordList.length;
        const score = binCounts.reduce((sum, count) => sum + count * count, 0) / N;

        if (!best.v || score < best.v) {
            best.v = score;
            best.word = guess;
            best.acc = [...binCounts];
        }
    }
};

// w = list of all possible matching words
// l = word to analyze (split into array of 5 letters)
// i = recursive position (0 - 4)
//
const splitOnLetters = (possibleWordList, letters, i) => {
    // a = array of possible words that have 
    // the same letter as word to analyze at position i
    // b = words that don't
    var a = [], b = []
    possibleWordList.forEach(word => {
        if (word.match(letters[i])) a.push(word)
        else b.push(word)
    })
    if (i < 4) {
        if (a.length > 0) a = splitOnLetters(a, letters, i + 1)
        if (b.length > 0) b = splitOnLetters(b, letters, i + 1)
    }
    return [[a, b]]
}
