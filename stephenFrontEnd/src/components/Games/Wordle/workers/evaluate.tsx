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
    // Initialize the topRanked array with placeholder entries.
    // score starts at Infinity so every real word will displace them.
    let stats: Stats = {
        topRanked: Array(20).fill(0).map(() => ({ score: Infinity, word: "" })),
        worst: { score: 0, word: "" },
        distribution: [],
        // perfectInList is populated below if any in-list word scores 1.0.
        // It is tracked outside topRanked because out-of-list words with score 1.0
        // but higher letter scores can push the in-list word out of the top-20.
        perfectInList: undefined,
    };

    for (let i = 0; i < wordList.length; i++) {
        const dictionaryWordToAnalyze = wordList[i];
        // Periodically send progress updates back to the main thread for UI responsiveness
        if (i > 0 && i % 20 === 0) self.postMessage({ type: "update", status: 20 });

        // Simulate every possible answer and record which feedback bin it would land in.
        // There are 3^5 = 243 possible feedback patterns (gray/yellow/green per position).
        const binCounts = Array(243).fill(0);
        possibleWordList.forEach((possibleWord) => {
            const pattern = getAccuracyPattern(dictionaryWordToAnalyze, possibleWord);
            const bin = accuracyToBin(pattern);
            binCounts[bin]++;
        });

        // ── Expected remaining candidates ──────────────────────────────────────────
        //
        // After this guess resolves, the answer will be revealed to live in exactly
        // one bin.  If the true answer is drawn at random from the N remaining
        // candidates, the probability it falls in bin b is:
        //
        //   P(bin b) = binCounts[b] / N
        //
        // and if it does fall in bin b we will be left with binCounts[b] candidates.
        // The expected number of candidates remaining is therefore:
        //
        //   score = Σ_b  P(bin b) × binCounts[b]
        //         = Σ_b  (binCounts[b] / N) × binCounts[b]
        //         = Σ_b  binCounts[b]² / N
        //
        // Equivalently, thinking in terms of the Outcome Probability table:
        //   each row has a binSize k, numBins bins of that size, and
        //   prob = (k × numBins) / N.
        //   score = Σ_rows  binSize × prob
        //         = Σ_rows  k × (k × numBins) / N
        //         = Σ_rows  k² × numBins / N
        //
        // A score of 1.0 is perfect — every remaining answer lands in its own unique
        // bin, so whichever feedback we get, exactly one candidate survives.
        // Higher scores mean larger groups of candidates survive on average.
        // Lower score = better guess.
        const N = possibleWordList.length;
        const score = binCounts.reduce((sum, count) => sum + count * count, 0) / N;

        stats.distribution.push(score);

        // Start from the lowest rank (worst of the top 20) and work backwards to find where the current guess fits
        if (score <= stats.topRanked[19].score) {
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

            // Track the best in-list perfect-score word separately.
            // Many out-of-list words may also score 1.0 with higher letter scores,
            // which would push this word out of topRanked entirely. Keeping it here
            // ensures it survives the merge and can be promoted in useWordEvaluator.
            if (score === 1 && inList) {
                if (!stats.perfectInList || letterScore > (stats.perfectInList.letterScore ?? 0)) {
                    stats.perfectInList = { score, word: dictionaryWordToAnalyze, letterScore, binCounts: [...binCounts], inList: true };
                }
            }

            if (score === stats.topRanked[0].score && !stats.topRanked[rankWeHaveNotYetBeat].inList && inList) {
                stats.topRanked.unshift({
                    score,
                    word: dictionaryWordToAnalyze,
                    letterScore,
                    binCounts: [...binCounts],
                    inList: true
                });
                stats.topRanked.pop();
            } else {
                // Find the rank we have not yet beaten
                while (rankWeHaveNotYetBeat >= 0 && score < stats.topRanked[rankWeHaveNotYetBeat].score) rankWeHaveNotYetBeat--;
                rankWeHaveNotYetBeat++;

                // if we've tied the ranks, but we have a better letter score, keep going
                while (rankWeHaveNotYetBeat >= 1 &&
                    score === stats.topRanked[rankWeHaveNotYetBeat - 1].score &&
                    letterScore > stats.topRanked[rankWeHaveNotYetBeat - 1].letterScore!)
                    rankWeHaveNotYetBeat--;


                stats.topRanked.splice(rankWeHaveNotYetBeat, 0, {
                    score,
                    word: dictionaryWordToAnalyze,
                    letterScore,
                    binCounts: [...binCounts],
                    inList
                });
                stats.topRanked.pop();
            }


            if (i === 0 || score > stats.worst.score) {
                stats.worst = {
                    score,
                    word: dictionaryWordToAnalyze,
                    binCounts: [...binCounts],
                };
            }
        }
    }
    return stats;
}