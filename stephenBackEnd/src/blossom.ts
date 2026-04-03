// import other from './sevenValid.json' assert { type: "json" };
// import words from "../words/websterLongWordsPlus.json" assert { type: "json" };
import express from "express";
import { words } from "./blossomWords";
// const response = await fetch(new URL("../words/websterLongWordsPlus.json", import.meta.url));
// const words = await response.json();

/**
 * Blossom word game module.
 * Provides API endpoints for generating word lists based on letter constraints.
 * Implements scoring system and word validation for the Blossom puzzle game.
 *
 * @module blossom
 */

/** Dictionary of words and their definitions for the Blossom game */
const myWords: any = words;

/**
 * Generate a list of valid words for the Blossom puzzle game.
 * Finds words that contain a required letter and use only available letters.
 * Returns words organized by letter groups with scores and definitions.
 *
 * @param body - Request body containing game constraints
 * @param body.must - Required letter that must appear in all words
 * @param body.available - Array of 6 available letters for word formation
 * @returns Object containing categorized word lists or error message
 * @example
 * ```typescript
 * const result = getBlossomWordList({
 *   must: 'a',
 *   available: ['a', 'b', 'c', 'd', 'e', 'f']
 * });
 * // Returns arrays of words grouped by available letters plus bonus words
 * ```
 */
const getBlossomWordList = (body: any) => {
  /**
   * Calculate the score for a word based on length, letter usage, and bonuses.
   *
   * @param word - The word to score
   * @param y - Letter to check for bonus points (5 points per occurrence)
   * @param available - Array of available letters (7 bonus points if all used)
   * @returns Calculated score for the word
   */
  const score = (word: string, y: string, available: string[]) => {
    let score;
    if (word.length > 6) score = 12 + 3 * (word.length - 7);
    else if (word.length == 6) score = 6;
    else if (word.length == 5) score = 4;
    else score = 2;
    let all = true;
    for (let i = 0; i < available.length; i++)
      if (word.indexOf(available[i]) == -1) {
        all = false;
        break;
      }
    if (all) score += 7;
    for (let i = 0; i < word.length; i++) if (word.charAt(i) == y) score += 5;
    return score;
  };

  if (body.must === undefined) {
    return { error: "no letter given" };
  }
  if (body.available === undefined) {
    return { error: "no available given" };
  }
  if (body.available.length != 6) {
    return { error: "available is not 6 letters" };
  }
  const must = body.must;
  const available = body.available;

  /** Array of word lists organized by available letters */
  let local: any[][] = [];
  let i;
  for (let index = 0; index < available.length; index++) local.push([]);
  Object.keys(words).forEach((word) => {
    if (word.includes(must) && !word.includes("-")) {
      let charCode;
      for (charCode = 97; charCode <= 122; charCode++) {
        const letter = String.fromCharCode(charCode);
        if (letter != must && available.indexOf(letter) == -1 && word.includes(letter)) {
          break;
        }
      }
      if (charCode == 123)
        available.forEach((l: string, j: number) =>
          local[j].push({ word, score: score(word, l, available), definition: myWords[word] })
        );
    }
  });

  /** Array of bonus words that use all available letters */
  let tmp: any[] = [];
  local[0].forEach((w) => {
    let all = true;
    for (let j = 0; j < available.length; j++) {
      if (!w.word.includes(available[j])) {
        all = false;
        break;
      }
    }
    if (all) tmp.push(w);
  });
  tmp = tmp.sort(function (a, b) {
    return b.score - a.score;
  });
  local.forEach(
    (l, i) =>
      (local[i] = l
        .sort(function (a, b) {
          return b.score - a.score;
        })
        .slice(0, 25))
  );
  local.push(tmp);
  return local;
};

/**
 * Creates an Express router for handling Blossom word game operations.
 *
 * Provides the following routes:
 * - POST /getWordList - Generate word lists based on letter constraints
 *
 * @returns An Express Router with Blossom game endpoints
 * @example
 * ```typescript
 * const app = express();
 * app.use('/api/blossom', blossomRoutes());
 * ```
 */
export const blossomRoutes = (): express.Router => {
  const router = express.Router();

  /**
   * POST /getWordList
   * Generate valid words for Blossom puzzle based on required and available letters.
   */
  router.post("/getWordList", (req, res) => res.json(getBlossomWordList(req.body)));
  return router;
};
