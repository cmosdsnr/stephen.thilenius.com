import { useEffect, useState } from 'react';
import { GameStep, RankedGuess } from './types';
import { firstGuess } from '../src/Guesses';
import { updateNextList } from './wordleUtils';
import { useWords } from './useWords';

// starting template for current game situation
// the filled in template is saved onto 'gameData' after every guess and can be retrieved with 'backOneStep'
// a copy is made of the template and the copy is modified

const template: GameStep = {
    inputLists: Array(8).fill([]),                               // list of possible words for previous steps 'outputLists' as we enter this round
    outputLists: Array(8).fill([]),                              // list of possible words with the current rounds selections/matches
    combinedList: [],                                            // combined list of all unique words in 'outputLists' (updated when 'outputLists' is updated)
    individualBestGuess: Array(8).fill(""),                      // best guess for each word
    individualBestGuessScore: Array(8).fill(0),                   // best guess' expected-remaining-candidates score for each word
    bestGuess: "",                                               // best guess for all words combined
    finished: Array(8).fill(false),                              // all five match: word is solved, or was solved previously
    greyed: Array(8).fill(false),                                // changed something earlier, making tis step not valid
    nextFinished: Array(8).fill(false),                          // Only one possibility left for this word, so mark it solved on the next round

    // this steps correct choices
    accuracies: Array(8).fill(0).map(() => Array(5).fill(0)),    // accuracies of each letter in the word, 0-2 (0=not in word, 1=wrong position, 2=correct position)
    word: "",                                                    // current word/guess

    // sum of previous accuracies
    matched: Array(8).fill([]),                                  // list of matching letters for each word
    unmatched: Array(8).fill([]),                                // list of non-matching letters 
    usedLetters: [],                                             // list of letters used in the current game

    exactMatched: Array(8).fill(0).map(() => Array(5).fill("")), // list of letters that are in the correct position
    solvedWords: [],                                             // list of solved words. When we step back we need to 'forget' as necessary
    letterValue: Array.from({ length: 5 }, () => Array(26).fill(0)),                                    // 5x26 percentages
}

/**
 * Hook to manage Wordle game state: tracking steps, resetting, and backtracking.
 */
export function useGameState(getNextBestWord: (c: GameStep, idx: number) => Promise<RankedGuess>) {
    const [current, setCurrent] = useState<GameStep>({ ...template });
    const [gameData, setGameData] = useState<GameStep[]>([]);
    const [numberWords, setNumberWords] = useState(4);
    const [working, setWorking] = useState(0); // progress step (0-5)

    const { letterCounts, allowedSolutions } = useWords();

    let c: GameStep = { ...template };

    useEffect(() => {
        if (allowedSolutions.length > 0) {
            reset();
        }
    }, [allowedSolutions]);

    // reset the game to the initial state
    const reset = () => {
        const t: GameStep = {
            ...template,
            accuracies: Array(8).fill(0).map(() => Array(5).fill(0)),
            exactMatched: Array(8).fill(0).map(() => Array(5).fill("")),
            matched: Array(8).fill(null).map(() => []),
            unmatched: Array(8).fill(null).map(() => []),
            finished: Array(8).fill(false),
            greyed: Array(8).fill(false),
            nextFinished: Array(8).fill(false),
            usedLetters: [],
            solvedWords: [],
            outputLists: Array(8).fill([]),
            combinedList: [],
        };
        t.inputLists = Array(8).fill([...allowedSolutions]);
        t.word = firstGuess;
        updateNextList(t, 0); // will do it based on accuracies are unset at this point
        const w = t.outputLists[0];
        t.outputLists = Array(8).fill([...w]);
        setCurrent(t);
        setGameData([t]);
    };


    const changeNumberWords = (n: number) => {
        if (n === 8 || n === 4 || n === 1) {
            setNumberWords(n)
            if (allowedSolutions.length > 0) reset();
        } else alert("tried to change to an illegal number of words")
    }

    // this is called when the user clicks on the back button
    // it removes the last game step from the gameData array and sets the current game step to the last one
    // it also sets the current game step to the last one
    const backOneStep = () => {
        const s = [...gameData];
        if (s.length > 1) {
            s.pop();
            setGameData(s);
            setCurrent(s[s.length - 1]);
        }
    };

    // construct a new game step based on the last game step
    // this is called when the user clicks on the next word button
    // it creates a new game step based on the last game step 
    // saves current and gameData
    const nextWordFramework = () => {
        // create a copy of the last game step
        let c: GameStep = JSON.parse(JSON.stringify(gameData[gameData.length - 1]));

        //add any new letters to usedLetters
        c.word.split('').forEach((v, j) => {
            if (!c.usedLetters.includes(v)) c.usedLetters.push(v)
        })
        // make used letters worthless
        c.letterValue = [...letterCounts.percentages]
        c.letterValue.forEach((percentages: number[], i: number) =>
            c.usedLetters.forEach((letter: string, j: number) => c.letterValue[i][letter.charCodeAt(0) - 65] = 0)
        )

        c.bestGuess = "";
        c.accuracies = Array(8).fill(0).map(() => Array(5).fill(0));

        // update matched, unmatched and exactMatched 
        const letters = c.word.split('');
        c.accuracies.forEach((word, i) => {
            word.forEach((letterAccuracy, j) => {
                if (letterAccuracy === 0 && !c.unmatched[i].includes(letters[j])) c.unmatched[i].push(letters[j])
                if (letterAccuracy > 0 && !c.matched[i].includes(letters[j])) c.matched[i].push(letters[j])
                if (letterAccuracy > 1) c.exactMatched[i][j] = letters[j]
            })
        })


        // we are finished if the last step says we were going to be
        c.finished = [...c.nextFinished]

        // the user set the word to 5 greens
        for (let i = 0; i < numberWords; i++) {
            // check if all 5 values in accuracies are 2
            if (!c.nextFinished[i] && c.accuracies[i].every((v) => v === 2)) { // [2,2,2,2,2]
                c.solvedWords.push(c.word);
                c.nextFinished[i] = true;
                c.finished[i] = true;
                c.outputLists[i] = [];
                c.accuracies[i] = [2, 2, 2, 2, 2];
            }
        }

        // there is only one word left in the list for this word
        for (let i = 0; i < numberWords; i++) {
            if (!c.finished[i] && c.inputLists[i].length === 1 && !c.solvedWords.includes(c.inputLists[i][0])) {
                for (let j = 0; j < numberWords; j++) c.individualBestGuess[j] = c.inputLists[i][0];
                c.solvedWords.push(c.inputLists[i][0]);
                c.bestGuess = c.inputLists[i][0];
                c.accuracies[i] = [2, 2, 2, 2, 2];
                c.outputLists[i] = [...c.inputLists[i]];
                c.nextFinished[i] = true;
                return c;
            }
        }

        // move the last steps outputLists to this steps inputLists
        // new outputLists will get set when we define a word. 
        c.inputLists = JSON.parse(JSON.stringify(c.outputLists));


        return c;
    }

    // necessary operations to change the word of this step
    const setNextWord = () => {
        c.word = c.bestGuess;
        //set accuracies for this word
        for (let i = 0; i < numberWords; i++) {
            c.word.split('').forEach((v, j) => {
                if (c.matched[i].includes(v)) c.accuracies[i][j] = 1
                if (c.exactMatched[i][j] === v) c.accuracies[i][j] = 2
            })
            updateNextList(c, i)
        }

    }

    const nextWord = async () => {
        c = nextWordFramework();
        // if we have not decided on an next word yet, let's get one
        if (c.bestGuess === "") {
            for (let i = 0; i < numberWords; i++) {
                if (c.inputLists[i].length > 0) {
                    // Always call getNextBestWord regardless of list size.
                    // The old threshold (> 2) skipped evaluation for 1–2 word lists,
                    // which left the Top 20 table frozen at the previous step's values
                    // and prevented score-1 in-list promotion from being reflected.
                    setWorking(i);
                    const best: RankedGuess = await getNextBestWord(c, i)
                    c.individualBestGuess[i] = best.word;
                    c.individualBestGuessScore[i] = best.score;
                }
            }
            setWorking(-1);
            if (numberWords === 1) c.bestGuess = c.individualBestGuess[0]
            else {
                const best = await getNextBestWord(c, -1)
                c.bestGuess = best.word
            }
        }
        setNextWord();
        setGameData([...gameData, c])
        setCurrent(c)
    }


    const recalculateWord = async () => {
        c = { ...gameData[gameData.length - 1] }
        for (let i = 0; i < numberWords; i++) {
            if (c.inputLists[i].length > 0) {
                // Same fix as nextWord: always evaluate so the Top 20 table
                // reflects the current state even for 1–2 word lists.
                setWorking(i);
                const best: RankedGuess = await getNextBestWord(c, i)
                c.individualBestGuess[i] = best.word;
                c.individualBestGuessScore[i] = best.score;
            }
        }
        setWorking(-1);
        if (numberWords === 1) c.bestGuess = c.individualBestGuess[0]
        else {
            const best = await getNextBestWord(c, -1)
            c.bestGuess = best.word
        }

        setNextWord();
        // Replace the last step in-place rather than appending.
        // recalculateWord() starts from a copy of the last step and updates it with
        // the computed best word — it should overwrite that same slot, not push a new one.
        // Appending was causing the game to start one step ahead with a blank selection.
        setGameData([...gameData.slice(0, -1), c])
        setCurrent(c)
    }

    const getGameStepTemplate = (): GameStep => {
        return { ...template };
    }

    return {
        current,
        gameData,
        setGameData,
        setCurrent,
        reset,
        backOneStep,
        numberWords,
        changeNumberWords,
        nextWord,
        recalculateWord,
        getGameStepTemplate,
        working,
    };
}
