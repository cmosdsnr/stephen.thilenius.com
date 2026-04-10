# Wordle Solver / Assistant

A Wordle solving assistant that tracks your guesses, colors, and progressively narrows down the answer. Supports **Wordle** (1 word), **Quordle** (4 words), and **Octordle** (8 words) variants.

This tool does not play Wordle for you — you play on an external site and enter the same guesses and color results here. The tool tells you the statistically best next word to guess based on what you've entered so far.

---

## How to Use

1. Select a game mode (Wordle / Quordle / Octordle) at the top.
2. The starting word (**RAISE**) is pre-loaded as the first guess.
3. Enter **RAISE** as your first guess on the Wordle site. Color the letters here to match what you got:
   - **Left-click** a letter → yellow (letter is in the word, wrong position)
   - **Right-click** a letter → green (letter is in the correct position)
   - **Click again** to cycle back to white (letter is not in the word)
4. Press **Go** to compute the best next word.
5. Enter that word on the Wordle site, copy the results back here, press **Go** again.
6. Repeat until solved.

You can also type directly in the **Edit Word** box to override the suggested word at any time. The word must be a valid 5-letter word (a green checkmark confirms it).

---

## Game Modes

| Mode      | Words | numberWords |
|-----------|-------|-------------|
| Wordle    | 1     | 1           |
| Quordle   | 4     | 4           |
| Octordle  | 8     | 8           |

In Quordle/Octordle, each word column is solved independently. The tool finds a single guess that is optimal across all unsolved words simultaneously.

---

## Evaluation Algorithm

### The Core Problem

Given a set of possible answers, which guess word produces the most information (i.e., narrows down the remaining possibilities the most)?

### Accuracy Patterns and Bins

Every guess/answer pair produces an **accuracy pattern**: an array of 5 values, each 0 (gray), 1 (yellow), or 2 (green). There are 3^5 = **243 possible patterns** (bins 0–242).

The bin number for a pattern is computed as:
```
bin = accuracy[0]×3⁴ + accuracy[1]×3³ + accuracy[2]×3² + accuracy[3]×3¹ + accuracy[4]×3⁰
```

### Standard Deviation Scoring

For a candidate guess word, we simulate it against every word in the possible-answer list and count how many answers land in each of the 243 bins. A **low standard deviation** across those bin counts means the guess spreads the answers evenly — giving more information on average.

- **When `possibleWordList.length > 243`**: std uses the ideal mean of `n / 243` per bin.
- **When `possibleWordList.length ≤ 243`**: the ideal spread is 1 word per occupied bin. Std penalizes both overcrowded bins and unused bins.

The word with the lowest std wins.

### Letter Scoring (Tiebreaker)

When two words have equal std, the one with **higher-frequency letters** (based on position-weighted letter counts across all 11,435 words) wins. Letter frequencies are stored in `Frequencies.tsx` and computed into a 5×26 matrix (`letterValue`) per game step.

### Parallel Evaluation with Web Workers

Computing std for every candidate word against thousands of possible answers is expensive. The work is split across **all available CPU cores** using Web Workers:

```
allWords (11,435) ÷ hardwareConcurrency → N workers, each handling a slice
Each worker → evaluate(possibleWordList, mySlice, letterValue) → Stats
Main thread → merge results, sort by std, pick best
```

Workers report progress updates so the `ProgressBar` can animate.

---

## Word Lists

Three word lists are stored in `txt/`:

| File           | Count  | Purpose                                      |
|----------------|--------|----------------------------------------------|
| `words2309.txt`| 2,309  | Short list — common Wordle solutions (default)|
| `words8916.txt`| 8,916  | Long list — extended solution set             |
| `words11435.txt`| 11,435| All words — used as candidate guesses         |

The **solution list** (`allowedSolutions`) is what we try to narrow down. The **all-words list** (`allWords`) is what workers evaluate as potential guesses. You can toggle between short/long solution lists with the **Long list** checkbox.

---

## State Architecture

### `GameStep` — the core data structure

Each time you press **Go**, a new `GameStep` is pushed onto the `gameData` array. A `GameStep` captures the complete state at one point in the game:

```typescript
GameStep {
  word            // The guess for this step (e.g. "RAISE")
  accuracies      // [numberWords][5] — 0/1/2 per letter per word
  inputLists      // [numberWords][] — possible answers coming INTO this step
  outputLists     // [numberWords][] — possible answers AFTER filtering by accuracies
  combinedList    // Union of all outputLists (used for multi-word best guess)
  matched         // Letters confirmed in the word (yellow or green)
  unmatched       // Letters confirmed NOT in the word (gray)
  exactMatched    // Letters confirmed at a specific position (green)
  usedLetters     // All letters guessed so far (to zero out their letterValue weight)
  bestGuess       // The recommended next word
  individualBestGuess  // Best guess per word (Quordle/Octordle)
  finished        // Which words are solved
  letterValue     // 5×26 matrix — letter frequency weights for tiebreaking
}
```

### State Flow on **Go**

```
User clicks Go
  → nextWord() in useGameState
  → nextWordFramework(): copy last GameStep, update matched/unmatched/exactMatched
  → getNextBestWord(c, i) for each unsolved word  ← Web Workers run here
  → getNextBestWord(c, -1) for the combined list  ← picks the single best cross-word guess
  → setNextWord(): set c.word = c.bestGuess, pre-color known letters, run updateNextList
  → setGameData([...gameData, c])                 ← pushes new step, re-renders UI
  → setTopRanked(...)                             ← Top 20 Words table populates
```

### State Flow on **Letter Click**

```
User clicks a letter cell
  → WordCell.handleClick(i) or handleRightClick(i)
  → context.updateAllAccuracy(rowIndex, wordIndex, i, newValue)
  → wordleUtils.updateAllAccuracy(): pure function, returns new gameData array
      - Sets accuracies[wordIndex][position] = newValue
      - Handles duplicate letters (auto-yellows matching letters)
      - Recalculates matched / unmatched / exactMatched
      - Calls updateNextList() → refilters outputLists
  → setGameData(updated), setCurrent(updated[last])  ← re-renders UI
  → InputWordPopover useEffect fires → recomputes sorted word list (up to 500 words)
```

### State Flow on **Row Click** (Top 20 table)

```
User clicks a word in Top 20 table
  → replaceWord(word) in WordleContext
  → Deep-copies last GameStep (JSON.parse/stringify)
  → Sets c.word = word
  → Resets accuracies, re-applies matched/exactMatched from previous steps
  → Runs updateNextList() for each word
  → setGameData(s), setCurrent(c) ← re-renders UI
```

---

## Component Tree

```
Wordle                          ← mode selector (Wordle/Quordle/Octordle/Blossom)
└── WordleProvider              ← React context (all game state)
    └── WordleCore              ← controls: Edit Word, Go button, Long list toggle
        └── Quord               ← game board + Back/New Game + Top 20 table
            ├── WordGame        ← renders one column per word
            │   ├── WordColumn  ← stacks WordCell rows for one word
            │   │   └── WordCell       ← one row of 5 LetterCells
            │   │       └── LetterCell ← single colored letter box
            │   ├── InputWordPopover   ← "Possible Words BEFORE" with heatmap
            │   └── WordListPopover    ← "Possible Words AFTER" best guess
            └── TopWordsTable   ← ranked top-20 candidate words after Go
```

---

## Context / Hook Architecture

All game state is managed in a single React context (`WordleProvider`) backed by three custom hooks:

```
WordleProvider
├── useWords()          → loads word lists, computes letter frequency stats
├── useWordEvaluator()  → manages Web Workers, topRanked state, progress
│   └── getNextBestWord() → spawns workers, merges results
└── useGameState(getNextBestWord)
    → gameData[], current, nextWord(), recalculateWord(), replaceWord()
```

**Important**: `useWordEvaluator` is instantiated **once** in `WordleProvider`. `getNextBestWord` is passed down to `useGameState` so that `setTopRanked` updates the same state the context exposes — avoiding stale-closure bugs from multiple hook instances.

---

## File Structure

```
Wordle/
├── README.md
├── context/
│   ├── types.ts            ← TypeScript types: GameStep, RankedGuess, Stats, LetterCounts
│   ├── WordleContext.tsx   ← React context provider + useWordle() hook
│   ├── useGameState.tsx    ← game step management: nextWord, recalculate, back, reset
│   ├── useWordEvaluator.ts ← web worker orchestration, topRanked state
│   ├── useWords.ts         ← word list loading, letter frequency calculation
│   └── wordleUtils.ts      ← pure functions: updateNextList, updateAllAccuracy
├── src/
│   ├── Wordle.tsx          ← top-level: mode selector, wraps WordleProvider
│   ├── Quord.tsx           ← game board layout, Back/New Game, TopWordsTable
│   ├── WordGame.tsx        ← per-word columns with popovers and progress bar
│   ├── Cells.tsx           ← LetterCell, WordCell, WordColumn components
│   ├── DisplayWord.tsx     ← alternative: renders historical rows (not in main flow)
│   ├── WordListPopover.tsx ← InputWordPopover (before) and WordListPopover (after)
│   ├── TopWordsTable.tsx   ← top-20 ranked words table after Go
│   ├── ProgressBar.tsx     ← web worker progress indicator
│   ├── BarGraph.tsx        ← bin distribution chart (currently disabled)
│   ├── Dictionary.tsx      ← standalone evaluate() used for single-word deviation
│   ├── Guesses.tsx         ← hardcoded firstGuess ("RAISE") and nextGuess lookup
│   ├── Frequencies.tsx     ← word frequency map for letter scoring tiebreaker
│   ├── ResizableBox.tsx    ← optional resizable wrapper (used by BarGraph)
│   ├── Sandbox.tsx         ← error placeholder
│   └── Wordle.css          ← component styles
├── txt/
│   ├── words2309.txt       ← short solution list
│   ├── words8916.txt       ← long solution list
│   └── words11435.txt      ← full candidate word list
└── workers/
    ├── evaluate.tsx        ← evaluate() function (runs in both main thread and workers)
    └── worker.js           ← Web Worker entry point — receives message, calls evaluate()
```

---

## Key Design Decisions

**Why separate `inputLists` and `outputLists`?**
`inputLists` is the possible-answer set *entering* a step. `outputLists` is what remains *after* filtering by this step's accuracy colors. When you go back a step, the next step's `inputLists` comes from the previous step's `outputLists` — so editing earlier steps cascades forward correctly.

**Why `JSON.parse(JSON.stringify(...))` for deep copies?**
`GameStep` has deeply nested arrays (`accuracies[][]`, `inputLists[][]`, etc.). Shallow spread (`{...step}`) shares those arrays, so mutations in `updateNextList` would corrupt the originals and React would not detect the change. Full deep copy avoids both bugs.

**Why is `firstGuess` hardcoded as "RAISE"?**
"RAISE" was computed as the optimal starting word against the short word list (2,309 words). The `nextGuess` lookup table provides pre-computed optimal second guesses for each of the 243 possible first-step accuracy patterns — avoiding the need to run workers on step 2.

**Why `splice(rankWeHaveNotYetBeat, 0, entry)` not `+1`?**
After the while-loop finds the first rank the new word does NOT beat, we insert the new word *at* that position (shifting it to the front of its equal group). Adding 1 would insert it one position too late, leaving the original Infinity placeholder at index 0 permanently.
