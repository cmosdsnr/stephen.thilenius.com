import { useState } from "react";
import { GameStep, RankedGuess, Stats } from "./types";
import { evaluate } from "../workers/evaluate";
import Worker from "../workers/worker.js?worker";
import { useWords } from "./useWords";
import { frequencies } from "../src/Frequencies";

/**
 * Hook to evaluate words and manage best guess logic in Wordle.
 */
export function useWordEvaluator() {
  const [progress, setProgress] = useState(100); // progress bar
  const [distribution, setDistribution] = useState<number[]>([]); // distribution of words
  const [topRanked, setTopRanked] = useState<RankedGuess[]>([]);
  const { allWords, letterCounts } = useWords();

  /**
   * Evaluate a word and return its ranking based on current game state.
   */
  const getWordDeviation = (w: string, list: string[], valueMap: number[][]): RankedGuess => {
    let stats: Stats = evaluate(list, [w], valueMap);
    return stats.topRanked[0];
  };

  const getBestStartWord = async () => {
    const t = await runInParallel(Object.keys(frequencies), letterCounts.percentages);
    console.log("best word: ", t);
  };

  /**
   * Asynchronously evaluate and return the best word using web workers.
   */
  const getNextBestWord = async (c: GameStep, idx: number): Promise<RankedGuess> => {
    const statsAry = await runInParallel(idx >= 0 ? c.inputLists[idx] : c.combinedList, c.letterValue);

    let topRanked: RankedGuess[] = statsAry
      .flatMap((s) => s.topRanked)
      .sort((a, b) => (a.std === b.std ? b.letterScore! - a.letterScore! : a.std - b.std))
      .slice(0, 20);
    topRanked.forEach((e) => (e.letterScore = Math.round(e.letterScore! * 100) / 100));

    let distribution = statsAry.flatMap((s) => s.distribution).sort((a, b) => a - b);
    setTopRanked(topRanked);
    setDistribution(distribution);

    return topRanked[0];
  };

  const runInParallel = async (list: string[], percentages: number[][]) => {
    // at least 200 for each worker
    const maxWorkers = Math.max(1, Math.round(allWords.length / 200));
    // can't have more than navigator.hardwareConcurrency workers
    const numWorkers = Math.min(navigator.hardwareConcurrency, maxWorkers);
    // words per worker
    const perWorker = Math.round(allWords.length / numWorkers);

    const statsAry: Stats[] = [];
    let completed = 0;
    const promises: Promise<void>[] = [];

    for (let j = 0; j < numWorkers; j++) {
      promises.push(
        new Promise((resolve) => {
          const myWorker = new Worker();
          myWorker.addEventListener("message", (e) => {
            if (e.data.type === "update") {
              completed += e.data.status;
              setProgress(Math.floor((100 * completed) / allWords.length));
            }
            if (e.data.type === "complete") {
              statsAry.push(e.data.stats);
              resolve();
            }
          });

          myWorker.postMessage([
            list,
            j === numWorkers - 1
              ? allWords.slice(j * perWorker)
              : allWords.slice(j * perWorker, (j + 1) * perWorker - 1),
            percentages,
          ]);
        })
      );
    }

    await Promise.all(promises);
    setProgress(100);
    return statsAry;
  };

  return {
    progress,
    distribution,
    topRanked,
    getWordDeviation,
    getNextBestWord,
    getBestStartWord,
  };
}

// const getWordDeviation = (w: string, i?: number): RankedGuess => {
//     let stats: Stats = {
//         topRanked: [],
//         worst: { std: 0, word: "" },
//         distribution: []
//     }
//     //if getWordDeviation is called from getBestStartWord, 'i' is not defined
//     if (i === undefined)
//         evaluate(stats, allWords, [w], letterCounts.percentages)
//     //if it's called from listing words it does
//     else
//         if (i >= 0)
//             evaluate(stats, gameData[gameData.length - 1].inputLists[i], [w], gameData[gameData.length - 1].letterValue)
//         else
//             evaluate(stats, gameData[gameData.length - 1].combinedList, [w], gameData[gameData.length - 1].letterValue)
//     return stats.topRanked[0]
// }

// const getNextBestWordWebWorker = async (possibleWordList: string[], letterValue: number[][]): Promise<RankedGuess> => {
//     const maxWorkers = Math.round(allWords.length / 200) < 1 ? 1 : Math.round(allWords.length / 200);
//     const numWorkers = navigator.hardwareConcurrency < maxWorkers ? navigator.hardwareConcurrency : maxWorkers;
//     const perWorker = Math.round(allWords.length / numWorkers);
//     console.log("number of workers: ", numWorkers, " maxWorkers: ", maxWorkers, " perWorker: ", perWorker);

//     var statsAry: Stats[] = [];
//     var completed = 0;
//     let promises: Promise<void>[] = [];
//     for (let j = 0; j < numWorkers; j++) {
//         promises.push(new Promise(resolve => {
//             let myWorker = new Worker();
//             // let myWorker = new Worker('/worker.js');
//             myWorker.addEventListener('message', function (e) {
//                 if (e.data.type === "update") {
//                     completed += e.data.status
//                     setProgress(Math.floor(100 * completed / allWords.length))
//                 }
//                 if (e.data.type === "complete") {
//                     statsAry.push(e.data)
//                     console.log('worker done: ', j)
//                     resolve()
//                 }
//             }, false)
//             myWorker.postMessage([
//                 {},
//                 possibleWordList,
//                 (j === numWorkers - 1) ?
//                     allWords.slice(j * perWorker) :
//                     allWords.slice(j * perWorker, (j + 1) * perWorker - 1),
//                 letterValue
//             ]);
//         }))
//     }
//     await Promise.all(promises)
//     setProgress(100)

//     let worst: RankedGuess = { ...statsAry[0].worst }
//     for (let j = 1; j < statsAry.length; j++) {
//         // if it beats the worst, it becomes the worst
//         if (statsAry[j].worst.std > worst.std) {
//             worst = { ...statsAry[j].worst }
//         }
//     }

//     //merge the topRanked lists
//     let topRanked = [...statsAry[0].topRanked]
//     for (let j = 1; j < statsAry.length; j++) {
//         topRanked = [...topRanked, ...statsAry[j].topRanked]
//     }
//     //sort by letterScore if std's are the same
//     topRanked = topRanked.sort((a, b) => (a.std - b.std == 0) ? b.letterScore! - a.letterScore! : a.std - b.std);
//     topRanked = topRanked.slice(0, 20);
//     topRanked.forEach((e, i) => topRanked[i].letterScore = Math.round(e.letterScore! * 100) / 100);
//     //pick the best of the best
//     let best = { ...topRanked[0] }

//     //merge the distribution list (list of all std)
//     let distribution = [...statsAry[0].distribution]
//     for (let j = 1; j < statsAry.length; j++) {
//         distribution = [...distribution, ...statsAry[j].distribution]
//     }
//     distribution = distribution.sort((a, b) => a - b);

//     // add a grouping to topRanked fo equivalent sts's
//     let std = topRanked[0].std
//     let rank = 1;
//     let bestRankCount;
//     for (let k = 0; k < topRanked.length; k++) {
//         if (std == topRanked[k].std) topRanked[k].rank = rank;
//         else {
//             if (rank == 1) bestRankCount = k
//             std = topRanked[k].std
//             rank++
//             topRanked[k].rank = rank
//         }
//         if (k > 0 && rank == 1 && possibleWordList.indexOf(topRanked[k].word as string) != -1) {
//             //switch k an 0 elements
//             let t = topRanked[0]
//             topRanked[0] = topRanked[k]
//             topRanked[k] = t
//         }
//     }

//     setTopRanked(topRanked);
//     setDistribution(distribution);
//     console.log(best)
//     return new Promise(resolve => {
//         resolve(best)
//     })

// }
