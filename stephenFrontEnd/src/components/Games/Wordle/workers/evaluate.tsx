/**
 * Calculates the accuracy pattern between a guess and a target word.
 * Returns an array of integers (0: incorrect, 1: wrong position, 2: correct).
 */
export const getAccuracyPattern = (guess: string, actual: string): number[] => {
    const pattern: number[] = Array(5).fill(0);
    const used: boolean[] = Array(5).fill(false);

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
 */
export const accuracyToBin = (pattern: number[]): number => {
    return pattern.reduce((acc, val, idx) => acc + val * Math.pow(3, 4 - idx), 0);
};

/**
 * Evaluates all guess words in `wordList` against `possibleWordList` to find the best guess.
 * If it is called with just 1 word in `wordList`, it will return the results in worst, and topRanked[0]
 */
export const evaluate = (
    possibleWordList: string[],
    wordList: string[],
    letterValue: number[][]
): Stats => {
    // Initialize the topRanked array with placeholder entries, each having a high std value
    let stats: Stats = {
        topRanked: Array(20).fill(0).map(() => ({ std: Infinity, word: "" })),
        worst: { std: 0, word: "" },
        distribution: []
    };

    for (let i = 0; i < wordList.length; i++) {
        const dictionaryWordToAnalyze = wordList[i];
        // Periodically send progress updates back to the main thread for UI responsiveness
        if (i > 0 && i % 20 === 0) self.postMessage({ type: "update", status: 20 });

        const binCounts = Array(243).fill(0);
        possibleWordList.forEach((possibleWord) => {
            const pattern = getAccuracyPattern(dictionaryWordToAnalyze, possibleWord);
            const bin = accuracyToBin(pattern);
            binCounts[bin]++;
        });

        let std = 0;

        if (possibleWordList.length > 243) {
            const mean = possibleWordList.length / 243;
            std = Math.sqrt(
                binCounts.reduce((sum, count) => sum + Math.pow(count - mean, 2), 0) / 243
            );
        } else {
            std = binCounts.reduce((sum, count) => sum + (count > 0 ? Math.pow(count - 1, 2) : 0), 0);
            const nonZeroCount = binCounts.filter(count => count > 0).length;
            std += possibleWordList.length - nonZeroCount;
            std = Math.sqrt(std / possibleWordList.length);
        }
        stats.distribution.push(std);

        // Start from the lowest rank (worst of the top 20) and work backwards to find where the current guess fits
        if (std <= stats.topRanked[19].std) {
            let rankWeHaveNotYetBeat = 19;
            let letterScore = 0;
            dictionaryWordToAnalyze.split('').forEach((letter, i) => {
                if (Array.isArray(letterValue[i])) {
                    letterScore += letterValue[i][letter.charCodeAt(0) - 65];
                } else {
                    console.log("error: ", JSON.stringify(letterValue));
                }
            });
            let inList = possibleWordList.indexOf(dictionaryWordToAnalyze) > -1;
            if (std === stats.topRanked[0].std && !stats.topRanked[rankWeHaveNotYetBeat].inList && inList) {
                stats.topRanked.unshift({
                    std,
                    word: dictionaryWordToAnalyze,
                    letterScore,
                    binCounts: [...binCounts],
                    inList: true
                });
                stats.topRanked.pop();
            } else {
                // Find the rank we have not yet beaten
                while (rankWeHaveNotYetBeat >= 0 && std < stats.topRanked[rankWeHaveNotYetBeat].std) rankWeHaveNotYetBeat--;
                rankWeHaveNotYetBeat++;

                // if we've tied the ranks, but we have a better letter score, keep going
                while (rankWeHaveNotYetBeat >= 1 &&
                    std === stats.topRanked[rankWeHaveNotYetBeat - 1].std &&
                    letterScore > stats.topRanked[rankWeHaveNotYetBeat - 1].letterScore!)
                    rankWeHaveNotYetBeat--;


                stats.topRanked.splice(rankWeHaveNotYetBeat, 0, {
                    std,
                    word: dictionaryWordToAnalyze,
                    letterScore,
                    binCounts: [...binCounts],
                    inList
                });
                stats.topRanked.pop();
            }


            if (i === 0 || std > stats.worst.std) {
                stats.worst = {
                    std,
                    word: dictionaryWordToAnalyze,
                    binCounts: [...binCounts],
                };
            }
        }
    }
    return stats;
}