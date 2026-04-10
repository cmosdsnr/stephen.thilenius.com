/**
 * @file types.ts
 * @description Core TypeScript type definitions shared across the Wordle solver.
 *
 * The central type is {@link GameStep}, which captures the complete state at one
 * point in the game (one guess row). An array of GameSteps forms the full game
 * history managed by {@link useGameState}.
 */

/**
 * Represents the full state of a single guess step in the Wordle game.
 *
 * A new GameStep is pushed onto `gameData` every time the user presses Go.
 * It records what word was guessed, what colors the user assigned, which answer
 * words are still possible for each target word, and what the best next guess is.
 *
 * @example
 * // After entering "RAISE" with no matches (all gray):
 * step.word = "RAISE"
 * step.accuracies[0] = [0, 0, 0, 0, 0]
 * step.outputLists[0]  // narrowed down from ~2309 words
 */
export type GameStep = {
    /**
     * Possible-answer lists entering this step — one per target word.
     * Copied from the previous step's `outputLists`. In Wordle mode only
     * index 0 is used; Quordle uses 0–3; Octordle uses 0–7.
     */
    inputLists: string[][];

    /**
     * Possible-answer lists after filtering by this step's accuracy colors.
     * Built by `updateNextList()` for each word index.
     */
    outputLists: string[][];

    /**
     * Union of all non-trivial outputLists across all target words.
     * Used as the candidate pool when finding the best cross-word guess
     * in Quordle/Octordle (passed to `getNextBestWord` with idx = -1).
     */
    combinedList: string[];

    /**
     * Best guess word for each individual target word, computed by web workers.
     * Wordle mode uses only index 0.
     */
    individualBestGuess: string[];

    /**
     * Standard deviation score for each word in `individualBestGuess`.
     * Lower is better — a smaller spread across accuracy bins means more information.
     */
    individualBestGuessStd: number[];

    /**
     * The single recommended guess for this step, optimal across all target words.
     * Equals `individualBestGuess[0]` in Wordle mode. In Quordle/Octordle it is
     * computed against `combinedList`.
     */
    bestGuess: string;

    /**
     * Whether each target word has been fully solved (all 5 letters green).
     * Solved words are excluded from subsequent evaluations.
     */
    finished: boolean[];

    /**
     * Whether a target word is "greyed out" due to an inconsistent color selection
     * (e.g. the same letter marked both green and absent in different positions).
     */
    greyed: boolean[];

    /**
     * Set to true when only one possible answer remains for a target word.
     * That word is marked `finished` on the NEXT step.
     */
    nextFinished: boolean[];

    /**
     * Accuracy colors assigned by the user for each letter of each target word.
     * Shape: [numberWords][5]. Values: 0 = gray, 1 = yellow, 2 = green.
     */
    accuracies: number[][];

    /** The guess word for this step (e.g. "RAISE"). */
    word: string;

    /**
     * Letters confirmed present in each target word (yellow or green), accumulated
     * across all previous steps.
     */
    matched: string[][];

    /**
     * Letters confirmed absent from each target word (gray), accumulated
     * across all previous steps.
     */
    unmatched: string[][];

    /**
     * Every letter that has appeared in any guess so far. Used to zero out those
     * letters in `letterValue` so they don't bias future recommendations.
     */
    usedLetters: string[];

    /**
     * Letters confirmed at a specific position (green) for each target word.
     * Shape: [numberWords][5]. Empty string = no confirmed letter at that position.
     */
    exactMatched: string[][];

    /**
     * Words already identified as the answer for a target word.
     * Prevents the same answer being suggested again in multi-word modes.
     */
    solvedWords: string[];

    /**
     * Letter frequency weight matrix used as a tiebreaker when two candidate guesses
     * have equal std. Shape: [5][26] — one weight per (position, letter).
     * Derived from `letterCounts.percentages`; weights for `usedLetters` are zeroed out.
     */
    letterValue: number[][];
};

/**
 * Letter usage statistics computed from the full 11,435-word list.
 * Used to weight candidate guesses by how common each letter is at each position.
 */
export interface LetterCounts {
    /**
     * Raw occurrence count of each letter at each of the 5 word positions.
     * Shape: [5][26] where index 0 = 'A', 25 = 'Z'.
     */
    positionCounts: number[][];

    /**
     * Total occurrence count of each letter summed across all 5 positions.
     * Shape: [26].
     */
    totalCounts: number[];

    /**
     * Normalized percentage (0–100) of each letter at each position relative to
     * the total word count. Copied directly into `GameStep.letterValue` at game start.
     * Shape: [5][26].
     */
    percentages: number[][];
}

/**
 * A candidate guess word and its evaluation score.
 * Returned by the web workers after `evaluate()` runs; populates the Top 20 Words table.
 */
export interface RankedGuess {
    /** The candidate word (e.g. "CRANE"). */
    word: string;

    /**
     * Standard deviation of bin counts when this word is used as a guess against
     * the current possible-answer list. Lower = more informative guess.
     */
    std: number;

    /**
     * Sum of position-weighted letter frequencies for this word.
     * Used as a tiebreaker when two words have identical std.
     */
    letterScore?: number;

    /**
     * Rank group: 1 = best tier, 2 = second-best, etc.
     * Words with identical std share a rank.
     */
    rank?: number;

    /**
     * Per-bin answer counts produced when this word is the guess.
     * Array of 243 values (one per possible 5-letter accuracy pattern).
     */
    binCounts?: number[];

    /**
     * True if this word appears in the current possible-answer list.
     * In-list words are preferred over equal-scoring out-of-list words.
     */
    inList?: boolean;
}

/**
 * Aggregated evaluation results from one web worker run.
 * The main thread merges Stats objects from all workers after `Promise.all()`.
 */
export interface Stats {
    /**
     * Top 20 candidate guesses sorted by ascending std (best first).
     * Initialized with 20 Infinity placeholders; real entries displace them
     * as the worker processes each candidate word.
     */
    topRanked: RankedGuess[];

    /** The worst-performing candidate found during this worker's evaluation run. */
    worst: RankedGuess;

    /**
     * Std score for every word evaluated by this worker, in evaluation order.
     * Used to build the bin-distribution chart.
     */
    distribution: number[];
}
