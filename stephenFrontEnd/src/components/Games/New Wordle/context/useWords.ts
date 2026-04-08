import { useState } from "react";
import { useQuery } from "react-query";
import shortWordListFile from "../txt/words2309.txt";
import longWordListFile from "../txt/words8916.txt";
import optionWords from "../txt/words11435.txt";

/**
 * Tracks frequency and distribution stats for letters across word lists.
 */
export interface LetterCounts {
  /** Letter counts at each of the 5 positions */
  positionCounts: number[][];
  /** Total letter frequency regardless of position */
  totalCounts: number[];
  /** Normalized percentages per position */
  percentages: number[][];
}

/**
 * Custom hook for loading word lists and computing letter statistics.
 * @returns Object containing allWords, allowedSolutions, letterCounts, and list loaders.
 */
export function useWords() {
  /**
   * Full word list used for evaluating guesses (from optionWords).
   */
  const [isWord, setIsWord] = useState<boolean>(true);

  /**
   * Allowed solutions that can be selected as the target word.
   * Initially uses the short list (overridden by loadShortList/loadLongList).
   */
  const [allowedSolutions, setAllowedSolutions] = useState<string[]>([]);

  /**
   * Statistical data about letter usage and frequency.
   */
  const [letterCounts, setLetterCounts] = useState<LetterCounts>({} as LetterCounts);

  // Load full guess list (allWords) via React Query; also drives calcLetterCounts
  const { data: allWords = [], isLoading: allWordsLoading, error: allWordsError } = useQuery<string[]>(
    ["wordle-new-allWords"],
    async () => {
      const x: string[] = [];
      const s = await fetch(optionWords);
      const t = await s.text();
      t.split("\n").forEach((line) => line.split(" ").forEach((word) => x.push(word.toUpperCase())));
      return x;
    },
    {
      staleTime: Infinity,
      onSuccess: (x) => {
        calcLetterCounts(x);
      },
    }
  );

  // Load short solution list (allowedSolutions default) via React Query
  const { isLoading: shortListLoading, error: shortListError } = useQuery<string[]>(
    ["wordle-new-shortList"],
    async () => {
      const w: string[] = [];
      const r = await fetch(shortWordListFile);
      const text = await r.text();
      text.split("\n").forEach((line) => line.split(" ").forEach((word) => w.push(word.toUpperCase())));
      return w;
    },
    {
      staleTime: Infinity,
      onSuccess: (w) => {
        setAllowedSolutions(w);
      },
    }
  );

  /**
   * Calculate letter counts and percentages from word list.
   * @param words Word list to analyze
   */
  const calcLetterCounts = (words: string[]) => {
    const counts: LetterCounts = {
      positionCounts: Array(5)
        .fill(null)
        .map(() => Array(26).fill(0)),
      totalCounts: Array(26).fill(0),
      percentages: Array(5)
        .fill(null)
        .map(() => Array(26).fill(0)),
    };

    if (words.length > 0) {
      // Count letter occurrences at each position
      words.forEach((word) => {
        word.split("").forEach((v, i) => {
          counts.positionCounts[i][v.charCodeAt(0) - 65] += 1;
        });
      });

      // Sum totals per letter
      counts.positionCounts.forEach((v, i) => {
        if (i < 5) {
          v.forEach((w, j) => {
            counts.totalCounts[j] += w;
          });
        }
      });

      // Normalize percentages
      let sum = words.length;
      counts.positionCounts.forEach((v, i) => {
        v.forEach((w, j) => {
          counts.percentages[i][j] = Math.round((10000 * w) / sum) / 100;
        });
      });

      setLetterCounts(counts);
    }
  };

  /**
   * Load a word list by file name and set it as the allowed solution list.
   * @param listName File path to fetch words from
   */
  const loadList = async (listName: string) => {
    const w: string[] = [];
    const text = await (await fetch(listName)).text();
    text.split("\n").forEach((line) => line.split(" ").forEach((word) => w.push(word.toUpperCase())));
    setAllowedSolutions(w);
  };

  /**
   * Switch to using the long solution list.
   */
  const loadLongList = async () => {
    loadList(longWordListFile);
  };

  /**
   * Switch to using the short solution list.
   */
  const loadShortList = async () => {
    loadList(shortWordListFile);
  };

  /**
   * check if word is in allWords and set isWord.
   */
  const checkWord = (word: string): boolean => {
    if (word.length !== 5) return false;

    let low = 0;
    let high = allWords.length - 1;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const cmp = word.localeCompare(allWords[mid]);

      if (cmp === 0) {
        setIsWord(true);
        return true;
      }
      if (cmp < 0) high = mid - 1;
      else low = mid + 1;
    }

    setIsWord(false);
    return false;
  };

  const isLoading = allWordsLoading || shortListLoading;
  const error = allWordsError || shortListError;

  // Return state and utilities
  return { allWords, allowedSolutions, letterCounts, isWord, isLoading, error, checkWord, loadShortList, loadLongList };
}
