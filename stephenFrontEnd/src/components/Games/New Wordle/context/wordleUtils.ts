import { GameStep } from "./types";

/**
 * Updates the output list and accuracy values for a specific word index based on the current guess.
 * @param c - The current game step
 * @param wordNumber - The index of the word being evaluated
 */
export const updateNextList = (c: GameStep, wordNumber: number): void => {
  // Filter words based on exact matches
  const letterAtPos = (position: number, words: string[]) => {
    const letter = c.word[position];
    return words.filter((word) => word[position] === letter);
  };

  // Filter words based on letter presence and position
  const letterInWord = (position: number, words: string[], accuracy: number) => {
    const letter = c.word[position];
    return words.filter((word) => {
      if (accuracy === 1) return word.includes(letter) && word[position] !== letter;
      if (accuracy === 0) return !word.includes(letter);
      return true;
    });
  };

  let nextList = [...c.inputLists[wordNumber]];
  const accuracy = c.accuracies[wordNumber];

  if (nextList.length > 0) {
    // filter by exact matches first
    for (let i = 0; i < 5; i++) {
      if (accuracy[i] === 2) {
        nextList = letterAtPos(i, nextList);
      }
    }
    // then handle inexact (yellow/gray) matches
    for (let i = 0; i < 5; i++) {
      if (accuracy[i] !== 2) {
        nextList = letterInWord(i, nextList, accuracy[i]);
      }
    }

    c.outputLists[wordNumber] = nextList;
    c.accuracies[wordNumber] = accuracy;

    // build combined list from all non-trivial outputLists
    const combined = new Set<string>();
    c.outputLists.forEach((list: string[]) => {
      if (list.length > 1) {
        list.forEach((word: string) => combined.add(word));
      }
    });
    c.combinedList = Array.from(combined);
  }
};

/**
 * Clears and recalculates accuracy markers based on exact, matched, and unmatched letters.
 * @param gameData The full game history array
 * @param gameDataIndex Index of the game step to update
 * @param wordIndex Index of the specific word in the multi-word game
 * @param position Position of the letter in the word to update
 * @param value The new accuracy value (0=gray, 1=yellow, 2=green)
 */
export const updateAllAccuracy = (
  gameData: GameStep[],
  gameDataIndex: number,
  wordIndex: number,
  position: number,
  value: number
): GameStep[] => {
  const s = [...gameData];
  let c = { ...s[gameDataIndex] };
  const letters = c.word.split("");
  if (position >= 0) c.accuracies[wordIndex][position] = value;

  // Adjust duplicate letters
  for (let j = 0; j < letters.length; j++) {
    if (value > 0 && j !== position && letters[j] === letters[position] && c.accuracies[wordIndex][j] === 0) {
      c.accuracies[wordIndex][j] = 1;
    }
    if (value === 0 && letters[j] === letters[position]) {
      c.accuracies[wordIndex][j] = 0;
    }
  }

  // Reset and recalculate matched states
  c.exactMatched[wordIndex] = Array(5).fill("");
  c.matched[wordIndex] = [];
  c.unmatched[wordIndex] = [];
  for (let j = 0; j < letters.length; j++) {
    if (c.accuracies[wordIndex][j] === 2) c.exactMatched[wordIndex][j] = letters[j];
    else if (c.accuracies[wordIndex][j] === 1) c.matched[wordIndex].push(letters[j]);
    else c.unmatched[wordIndex].push(letters[j]);
  }

  updateNextList(c, wordIndex);
  s[gameDataIndex] = c;
  return s;
};

// //update accuracy at position i with v of currentIndex
// const updateAllAccuracy = (gameDataIndex: number, wordIndex: number, position: number, value: number) => {
//     let s = [...gameData]
//     let c = { ...s[gameDataIndex] }
//     let letters = c.word.split('')

//     // try setting it to the new value
//     if (position >= 0) c.accuracies[wordIndex][position] = value
//     for (let j = 0; j < letters.length; j++) {
//         if (value > 0 && j !== position && letters[j] === letters[position] && c.accuracies[wordIndex][j] === 0) {
//             c.accuracies[wordIndex][j] = 1
//         }
//         if (value === 0 && letters[j] === letters[position]) {
//             c.accuracies[wordIndex][j] = 0
//         }
//     }

//     c = { ...s[0] }
//     letters = c.word.split('')
//     c.exactMatched[wordIndex] = Array(5).fill("")
//     c.matched[wordIndex] = []
//     c.unmatched[wordIndex] = []
//     for (let j = 0; j < letters.length; j++) {
//         if (c.accuracies[wordIndex][j] == 2) c.exactMatched[wordIndex][j] = letters[j]
//         else if (c.accuracies[wordIndex][j] == 1) c.matched[wordIndex].push(letters[j])
//         else if (c.accuracies[wordIndex][j] == 0) c.unmatched[wordIndex].push(letters[j])
//     }
//     updateNextList(c, wordIndex)
//     if (c.outputLists[wordIndex].length >= 1)
//         c.greyed[wordIndex] = false
//     if (gameData.length > 1) {
//         if (c.outputLists[wordIndex].length === 0 || c.greyed[wordIndex]) {
//             s[1].inputLists[wordIndex] = [...c.inputLists[wordIndex]]
//             console.log("adding greyed to " + (1))
//             s[1].greyed[wordIndex] = true

//         } else {
//             s[1].inputLists[wordIndex] = [...c.outputLists[wordIndex]]
//             console.log("remove greyed from " + (1))
//             s[1].greyed[wordIndex] = false
//         }
//         s[1].matched[wordIndex] = [...c.matched[wordIndex]]
//         s[1].unmatched[wordIndex] = [...c.unmatched[wordIndex]]
//         s[1].exactMatched[wordIndex] = [...c.exactMatched[wordIndex]]
//     }

//     for (let index = 1; index < gameData.length; index++) {
//         c = { ...s[index] }
//         letters = c.word.split('')
//         for (let j = 0; j < letters.length; j++) {

//             //fix any that are wrong
//             if (c.exactMatched[wordIndex][j] === letters[j]) c.accuracies[wordIndex][j] = 2
//             else if ((c.matched[wordIndex].includes(letters[j]) || c.exactMatched[wordIndex].includes(letters[j])) && c.accuracies[wordIndex][j] == 0) c.accuracies[wordIndex][j] = 1
//             else if (c.unmatched[wordIndex].includes(letters[j])) c.accuracies[wordIndex][j] = 0

//             //update lists
//             if (c.accuracies[wordIndex][j] === 2) {
//                 if (c.exactMatched[wordIndex][j] == "")
//                     c.exactMatched[wordIndex][j] = letters[j]
//                 else if (c.exactMatched[wordIndex][j] != letters[j])
//                     c.accuracies[wordIndex][j] = 0
//                 // check previous for this letter in this position, but not exact match
//                 for (let k = 0; k < index; k++)
//                     if (s[k].word.split('')[j] == letters[j] && s[k].accuracies[wordIndex][j] != 2) {
//                         c.accuracies[wordIndex][j] = 1
//                         break
//                     }
//             }
//             if (c.accuracies[wordIndex][j] == 1) {
//                 if (!c.matched[wordIndex].includes(letters[j])) c.matched[wordIndex].push(letters[j])
//                 const index = c.unmatched[wordIndex].indexOf(letters[j])
//                 if (index > -1) {
//                     c.unmatched[wordIndex].splice(index, 1);
//                 }
//             }
//             if (c.accuracies[wordIndex][j] == 0) {
//                 if (!c.unmatched[wordIndex].includes(letters[j])) c.unmatched[wordIndex].push(letters[j])
//                 const index = c.matched[wordIndex].indexOf(letters[j])
//                 if (index > -1) {
//                     c.matched[wordIndex].splice(index, 1);
//                 }
//             }
//         }
//         updateNextList(c, wordIndex)  // uses just accuracies to update outputLists

//         if (c.outputLists[wordIndex].length >= 1)
//             c.greyed[wordIndex] = false
//         if (index < gameData.length - 1) {
//             if (c.outputLists[wordIndex].length === 0 || c.greyed[wordIndex]) {
//                 s[index + 1].inputLists[wordIndex] = [...c.inputLists[wordIndex]]
//                 console.log("adding greyed to " + (index + 1))
//                 s[index + 1].greyed[wordIndex] = true

//             } else {
//                 s[index + 1].inputLists[wordIndex] = [...c.outputLists[wordIndex]]
//                 console.log("remove greyed from " + (index + 1))
//                 s[index + 1].greyed[wordIndex] = false
//             }
//             s[index + 1].matched[wordIndex] = [...c.matched[wordIndex]]
//             s[index + 1].unmatched[wordIndex] = [...c.unmatched[wordIndex]]
//             s[index + 1].exactMatched[wordIndex] = [...c.exactMatched[wordIndex]]
//         }

//         console.log(
//             "index: " + index +
//             " accuracies: " + JSON.stringify(s[index].accuracies[wordIndex]) +
//             " matched: " + JSON.stringify(s[index].matched[wordIndex]) +
//             " unmatched: " + JSON.stringify(s[index].unmatched[wordIndex])
//         )
//     }
//     setGameData(s)
//     setCurrent(s[s.length - 1])
// }

// given a current (c) and the word number, return a current with accuracyValues, outputLists and accuracies updated
// const updateNextList = (c: GameStep, wordNumber: number) => {

//     const letterAtPos = (position: number, words: string[]) => {
//         var newWords = []
//         const letter = c.word.split('')[position]

//         for (let i = 0; i < words.length; i++) {
//             if (words[i].slice(position, position + 1) === letter) {
//                 newWords.push(words[i])
//             }

//         }
//         return (newWords)
//     }

//     const letterInWord = (position: number, words: string[], accuracy: number) => {
//         var newWords = []
//         const letter = c.word.split('')[position]

//         for (let i = 0; i < words.length; i++) {
//             //letter in word but NOT at pos
//             if (accuracy === 1 && words[i].match(letter) && words[i].slice(position, position + 1) !== letter) {
//                 newWords.push(words[i])
//             }
//             // letter not in word and not supposed to be
//             if (accuracy === 0 && !words[i].match(letter)) {
//                 newWords.push(words[i])
//             }
//         }
//         return newWords
//     }

//     let nextList = [...c.inputLists[wordNumber]]
//     let accuracy = c.accuracies[wordNumber]
//     // create new lists with the new accuracy information
//     if (nextList.length > 0) {
//         //with word/letters, fill in other accuracies that are double letters
//         const letters = c.word.split('')

//         for (let i = 0; i < letters.length; i++) {
//             if (accuracy[i] === 2) {
//                 nextList = letterAtPos(i, nextList)
//             }
//         }
//         for (let i = 0; i < letters.length; i++) {
//             if (accuracy[i] !== 2) {
//                 nextList = letterInWord(i, nextList, accuracy[i])

//             }
//         }
//         c.accuracyValues[wordNumber] = 3 * (3 * (3 * (3 * accuracy[0] + accuracy[1]) + accuracy[2]) + accuracy[3]) + accuracy[4]
//         c.outputLists[wordNumber] = nextList
//         c.accuracies[wordNumber] = accuracy

//         // merge the lists
//         c.combinedList = []
//         for (let j = 0; j < c.outputLists.length; j++) {
//             if (c.outputLists[j].length > 1) {
//                 const tList = c.outputLists[j];
//                 for (let k = 0; k < tList.length; k++) {
//                     const word = tList[k];
//                     if (!c.combinedList.includes(word)) c.combinedList.push(word)
//                 }
//             }
//         }
//     }
// }

// const recalculateWord = async () => {
//     const s = [...gameData]
//     const c = { ...gameData[gameData.length - 1] };
//     c.bestGuess = ""

//     //look for newly found solutions where only 1 word is possible
//     for (let i = 0; i < numberWords; i++) {
//         if (!c.finished[i] && c.inputLists[i].length === 1) {
//             if (!c.solvedWords.includes(c.inputLists[i][0])) {
//                 for (let j = 0; j < numberWords; j++) c.individualBestGuess[j] = c.inputLists[i][0]
//                 c.solvedWords.push(c.inputLists[i][0])
//                 c.bestGuess = c.inputLists[i][0]
//                 c.accuracies[i] = [2, 2, 2, 2, 2]
//                 c.outputLists[i] = [...c.inputLists[i]]
//                 c.nextFinished[i] = true
//                 break
//             }
//         }
//     }
//     if (c.bestGuess === "") {
//         for (let i = 0; i < numberWords; i++) {
//             if (c.inputLists[i].length > 2) {
//                 setWorking(i)
//                 c.individualBestGuess[i] = (await getNextBestWordWebWorker(c.inputLists[i], c.letterValue)).word;
//             }
//             else if (c.inputLists[i].length > 0)
//                 c.individualBestGuess[i] = c.inputLists[i][0]
//         }
//         c.bestGuess = numberWords === 1 ? c.individualBestGuess[0] : (await getNextBestWordWebWorker(c.combinedList, c.letterValue)).word;
//     }
//     c.word = c.bestGuess;
//     for (let i = 0; i < numberWords; i++) {
//         c.word.split('').forEach((v, j) => {
//             if (c.matched[i].includes(v) || c.exactMatched[i].includes(v)) c.accuracies[i][j] = 1
//             if (c.exactMatched[i][j] === v) c.accuracies[i][j] = 2
//         })
//         updateNextList(c, i)
//         c.greyed[i] = false
//     }

//     s[s.length - 1] = c
//     setGameData(s)
//     setCurrent(c)
// }
