/**
 * @file worker.js
 * @description Web Worker entry point for parallel Wordle guess evaluation.
 *
 * This file is loaded as a separate browser thread via:
 *   import Worker from '../workers/worker.js?worker';
 *   const myWorker = new Worker();
 *
 * The main thread slices `allWords` into N chunks (one per CPU core) and posts
 * each chunk to a separate worker. Each worker evaluates its slice of candidate
 * words against the possible-answer list, then posts back a {@link Stats} object
 * and closes itself.
 *
 * Message protocol:
 *   Incoming (e.data):  [possibleWordList: string[], wordListSlice: string[], letterValue: number[][]]
 *   Outgoing progress:  { type: "update", status: number }   — sent every 20 words
 *   Outgoing complete:  { type: "complete", stats: Stats }   — sent when done
 */

import { evaluate } from './evaluate';

/**
 * Handles the incoming message from the main thread.
 *
 * @param {MessageEvent} e - The message event containing evaluation inputs.
 * @param {string[]}     e.data[0] - possibleWordList: the answers we're narrowing down.
 * @param {string[]}     e.data[1] - wordListSlice: this worker's subset of candidate guesses.
 * @param {number[][]}   e.data[2] - letterValue: 5×26 letter frequency weights for tiebreaking.
 */
self.addEventListener('message', function (e) {
    const stats = evaluate(e.data[0], e.data[1], e.data[2]);
    self.postMessage({ type: "complete", stats });
    self.close();
}, false);
