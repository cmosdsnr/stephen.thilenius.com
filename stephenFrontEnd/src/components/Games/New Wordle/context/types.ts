/**
 * Represents the state of a single step in the Wordle game.
 */
export type GameStep = {
  /** Input word lists before this guess */
  inputLists: string[][];
  /** Filtered word lists after evaluating this guess */
  outputLists: string[][];
  /** Combined list of all unique words from outputLists */
  combinedList: string[];
  /** Best guess for each word individually */
  individualBestGuess: string[];
  /** Standard deviation of best guess values */
  individualBestGuessStd: number[];
  /** Best guess across all words */
  bestGuess: string;
  /** Which words are completely solved */
  finished: boolean[];
  /** Which words are marked as "greyed out" */
  greyed: boolean[];
  /** Words that are assumed to be solved next round */
  nextFinished: boolean[];
  /** Accuracy values for each word's guess (0=gray, 1=yellow, 2=green) */
  accuracies: number[][];
  /** Current guess word */
  word: string;
  /** Matching letters in each guess */
  matched: string[][];
  /** Non-matching letters */
  unmatched: string[][];
  /** Letters used so far in all guesses */
  usedLetters: string[];
  /** Exact matched letters per position */
  exactMatched: string[][];
  /** List of solved words */
  solvedWords: string[];
  /** Letter weights matrix (5x26) */
  letterValue: number[][];
};

/**
 * Letter usage statistics.
 */
export interface LetterCounts {
  positionCounts: number[][];
  totalCounts: number[];
  percentages: number[][];
}

/**
 * Ranked guess with standard deviation and optional scoring.
 */
export interface RankedGuess {
  word: string;
  std: number;
  letterScore?: number;
  rank?: number;
}

/**
 * Structure used for evaluating guesses across workers.
 */
export interface Stats {
  topRanked: RankedGuess[];
  worst: RankedGuess;
  distribution: number[];
}
