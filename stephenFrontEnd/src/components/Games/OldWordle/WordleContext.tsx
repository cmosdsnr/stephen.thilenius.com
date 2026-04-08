import { useQuery } from 'react-query';
import React, { useState, useEffect, useContext } from 'react'
import toast from 'react-hot-toast';
import { evaluate, firstGuess, nextGuess, frequencies } from './Dictionary'
import PocketBase from 'pocketbase';
import { useData } from '../../../contexts/DataContext';

import wordListFile from './words2309.txt';
import optionWords from './words11435.txt';
import longWordListFile from './words8916.txt';



// words that can be solutions to Wordle (short list)
import level0words from './level_0_words.txt';

// extra words that can be solutions to Octordle (long list)
import level1words from './level_1_words.txt';

// additional words that can be used as guesses (option list)
import level2words from './level_2_words.txt';



/*******************************************/
/*******************************************/
/*******************************************/
// const loadList = async (list) => {
//     const w = [];
//     const r = await fetch(list);
//     const text = await r.text();
//     text.split("\n").forEach((line) => line.split(" ").forEach((word) => w.push(word.slice(0, 5).toUpperCase())));
//     return w;
// };

// words that can be solutions to Wordle (short list)
// export const a = await loadList(wordListFile);

// extra words that can be solutions to Octordle (long list)
// export const b = await loadList(longWordListFile);

// additional words that can be used as guesses (option list)
// export const c = await loadList(optionWords);


// search for words in 'a' that are not in 'b'
// const mw0 = a.filter((word) => !b.includes(word));
// console.log("Words in short list not in medium list: ", mw0.length);

// const mw1 = b.filter((word) => !a.includes(word));
// console.log("Words in medium list not in short list: ", mw1.length);

// const mw2 = b.filter((word) => !c.includes(word));
// console.log("Words in medium list not in long list: ", mw2.length);

// const mw3 = c.filter((word) => !b.includes(word));
// console.log("Words in long list not in medium list: ", mw3.length);

// write mw1 to the console, 20 words per line (space separated)
// if (mw3.length > 0) {
//     console.log("Words list:");
//     for (let i = 0; i < mw3.length; i += 20) {
//         console.log(mw3.slice(i, i + 20).join(" "));
//     }
// }

// console.log(
//     `Loaded Old Wordle lists: ${a.length}, ${b.length}, ${c.length} words.`
// );
/*******************************************/
/*******************************************/
/*******************************************/
/*******************************************/




const ung = false;   // use the stores second guesses

// eslint-disable-next-line no-extend-native
String.prototype.replaceAt = function (index, char) {
    var a = this.split("");
    a[index] = char;
    return a.join("");
}

const WordleContext = React.createContext()

export function useWordle() {
    return useContext(WordleContext)
}


// WordleProvider is the context provider for the Wordle game
// It contains the current game state and the functions to update it
// It also contains the functions to calculate the next best guess
export function WordleProvider({ children }: { children: React.ReactNode }) {

    // starting template for current game situation
    // the filled in template is saved onto 'gameData' after every guess and can be retrieved with 'backOneStep'
    // a copy is made of the template and the copy is modified

    const template = {
        inputLists: Array(8).fill([]),                 // list of possible words for previous steps 'outputLists' as we enter this round
        outputLists: Array(8).fill([]),                // list of possible words with the current rounds selections/matches
        combinedList: [],                             // combined list of all unique words in 'outputLists' (updated when 'outputLists' is updated)
        individualBestGuess: Array(8).fill(""),       // best guess for each word
        individualBestGuessStd: Array(8).fill(0),     // best guess' std for each word
        bestGuess: "",                                // best guess for all words combined
        finished: Array(8).fill(false),               // all five match: word is solved, or was solved previously
        greyed: Array(8).fill(false),          // changed something earlier, making tis step not valid
        nextFinished: Array(8).fill(false),    // Only one possibility left for this word, so mark it solved on the next round
        accuracies: Array(8).fill(0).map(() => Array(5).fill(0)),
        accuracyValues: Array(8).fill(0),                  // accuracy of each word, 0-242 (3^5)
        word: "",                                     // current word/guess
        matched: Array(8).fill([]),                 // list of matching letters for each word
        unmatched: Array(8).fill([]),               // list of non-matching letters
        usedLetters: [],                            // list of letters used in the current game
        exactMatched: Array(8).fill(0).map(() => Array(5).fill("")),
        solvedWords: [],                              // list of solved words. When we step back we need to 'forget' as necessary
    }

    const [current, setCurrent] = useState(template)
    const [gameData, setGameData] = useState([])                 // game situations
    const [numberWords, setNumberWords] = useState(4)            // wordle =1, quordle =4
    const [progress, setProgress] = useState(100)                // progress bar
    const [working, setWorking] = useState(0)                    // progress step (0-5)
    const [distribution, setDistribution] = useState({})         // distribution of words
    const [isAWord, setIsAWord] = useState(true)                 // is the current word a word
    const [clear, setClear] = useState(true)                     // a refresh trigger for others: toggles on reset and nextWord
    const [useNextGuess, setUseNextGuess] = useState(ung)        // wether or not to use stored second guesses or not
    const [words, setWords] = useState([])
    const [wordleWords, setWordleWords] = useState([])
    const [level0Words, setLevel0Words] = useState([])
    const [level1Words, setLevel1Words] = useState([])
    const [loaded, setLoaded] = useState(false)
    const [letterCounts, setLetterCounts] = useState(null)   // array(12)[26]: 1-5: letter counts, 6: total counts, 7-11: percentages

    const { pb } = useData();

    useQuery(
        ['oldWordle-wordLists'],
        async () => {
            const parseWords = async (file: string) => {
                const r = await fetch(file);
                const t = await r.text();
                const w: string[] = [];
                t.split("\n").forEach(line => line.split(" ").forEach(word => w.push(word.slice(0, 5).toUpperCase())));
                return w;
            };
            const level0 = await parseWords(level0words);
            const level1 = await parseWords(level1words);
            let allWords = await parseWords(level2words);
            allWords = [...allWords, ...level1, ...level0].sort();
            const record = await pb.collection('miscellaneous').getOne("000invalidwords");
            if (record?.data?.words) allWords = allWords.filter((w: string) => !record.data.words.includes(w));
            return { level0, level1, allWords };
        },
        {
            staleTime: Infinity,
            onSuccess: ({ level0, level1, allWords }: { level0: string[], level1: string[], allWords: string[] }) => {
                setLevel0Words(level0);
                setWordleWords(level0);
                setLevel1Words(level1);
                setWords(allWords);
            },
            onError: (err: unknown) => { console.error('Failed to load word lists:', err); toast.error('Failed to load word lists'); },
        }
    );

    useEffect(() => {
        if (words.length > 0) {
            let d = [];
            let max = Array(6).fill(0);
            for (let i = 0; i < 6; i++)
                d.push(Array(26).fill(0));
            words.forEach(word => {
                word.split('').forEach((v, i) => d[i][v.charCodeAt(0) - 65] += 1)
            })
            d.forEach((v, i) => {
                if (i < 5)
                    v.forEach((w, j) => {
                        if (w > max[i]) max[i] = w;
                        d[5][j] += w;
                        if (d[5][j] > max[5]) max[5] = d[5][j];
                    })
            })
            let sum = words.length;
            d.forEach((v, i) => {
                let t = [];
                v.forEach((w, j) => {
                    t.push(Math.round(10000 * w / sum) / 100);
                })
                d.push(t);
            })

            setLetterCounts(d);
        }
    }, [words])

    const removeWord = (word) => {
        setWords(prevWords => prevWords.filter(w => w !== word));
    }

    const loadLongList = async () => {
        // var w = [], x = []
        // const r = await fetch(longWordListFile)
        // const text = await r.text()
        // text.split("\n").forEach(line => line.split(" ").forEach(word => w.push(word.slice(0, 5).toUpperCase())))
        setWordleWords([...level0Words, ...level1Words].sort())
    }

    const loadShortList = async () => {
        // var w = [], x = []
        // const r = await fetch(wordListFile)
        // const text = await r.text()
        // text.split("\n").forEach(line => line.split(" ").forEach(word => w.push(word.slice(0, 5).toUpperCase())))
        setWordleWords(level0Words)
    }

    useEffect(() => {
        if (!loaded && words.length > 0) {
            reset();
            setLoaded(true)
        }

    }, [words])

    useEffect(() => {
        //if we changed lists with loadLongWords
        if (loaded) {
            let s = { ...gameData }
            s[0].inputLists = Array(8).fill([...wordleWords])
            setGameData(s)
            for (let i = 0; i < numberWords; i++) updateAllAccuracy(0, i, -1, 0)
        }
    }, [wordleWords])


    const reset = () => {
        let c = { ...template }
        c.inputLists = Array(8).fill([...wordleWords])
        c.word = firstGuess
        updateNextList(c, 0)
        const w = c.outputLists[0]
        c.outputLists = Array(8).fill([...w])
        // c.outputLists = Array(8).fill([...wordleWords])
        setGameData([c])
        setCurrent(c)
        setClear(!clear)
        clearOthers()
    }

    const getWordDeviation = (w, i) => {
        let best = {}
        // debugger
        //if getWordDeviation is called from getBestStartWord is has not 'i'
        if (i === undefined)
            evaluate(best, words.map((word, i) => { return word.toUpperCase() }), [w])
        //if it's called from listing words it does
        else
            if (i >= 0)
                evaluate(best, gameData[gameData.length - 1].inputLists[i], [w])
            else
                evaluate(best, gameData[gameData.length - 1].combinedList, [w])
        // console.log(best)
        return best
    }

    const getBestStartWord = async () => {
        const t = await getNextBestWordWebWorker(Object.keys(frequencies))
        console.log("best word: ", t)
    }
    const getBestSecondWords = async () => {
        let c = { ...template }
        c.inputLists = Array(8).fill(words.map((word, i) => { return word.toUpperCase() }))
        c.word = firstGuess
        setNumberWords(1)

        const secondWords = {}
        for (let i = 0; i < 3 ** 5; i++) {
            c.accuracies[0] = [
                Math.floor(i / 81) % 3,
                Math.floor(i / 27) % 3,
                Math.floor(i / 9) % 3,
                Math.floor(i / 3) % 3,
                i % 3]
            updateNextList(c, 0)
            if (c.outputLists[0].length > 0) {
                const guess = await getNextBestWordWebWorker(c.outputLists[0])
                secondWords[i] = guess
                console.log("best word ", i, " with ", c.outputLists[0].length, " words: ", guess)
            }

        }
        console.log(JSON.stringify(secondWords))
        return (secondWords)

    }

    // const nextWord = () => console.log("numberWords:" + numberWords)
    // called when 'go' is pressed
    const nextWord = async () => {
        let c = { ...template }
        const current = { ...gameData[gameData.length - 1] };
        //add any new letters to usedLetters
        current.word.split('').forEach((v, j) => {
            if (!current.usedLetters.includes(v)) current.usedLetters.push(v)
        })
        //add the remaining unmatched letters to the list of unmatched letters
        for (let i = 0; i < numberWords; i++) {
            current.word.split('').forEach((v, j) => {
                if (current.accuracies[i][j] === 0 && !current.unmatched[i].includes(v)) current.unmatched[i].push(v)
            })
        }
        // let c = JSON.parse(JSON.stringify(current))
        let word = current.word
        //make sure this clones all the way down
        c.finished = [...current.nextFinished]
        c.nextFinished = [...current.nextFinished]
        c.solvedWords = [...current.solvedWords]
        //deeper copy
        for (let i = 0; i < numberWords; i++) {
            c.inputLists[i] = [...current.outputLists[i]]
            c.matched[i] = [...current.matched[i]]
            c.unmatched[i] = [...current.unmatched[i]]
            c.exactMatched[i] = [...current.exactMatched[i]]
            c.usedLetters = [...current.usedLetters]
        }

        for (let i = 0; i < numberWords; i++) {
            // we selected word is done by guess (not just one word left)
            if (!current.nextFinished[i] && current.accuracyValues[i] === 242) {  // [2,2,2,2,2]
                c.solvedWords.push(c.outputLists[i][0])
                c.nextFinished[i] = true
                c.finished[i] = true
            }
        }

        current.accuracies.forEach((v, i) => {
            for (let j = 0; j < v.length; j++) {
                if (v[j] == 0 && !c.unmatched[i].includes(current.word.split('')[j])) c.unmatched[i].push(current.word.split('')[j])
                if (v[j] > 0 && !c.matched[i].includes(current.word.split('')[j])) c.matched[i].push(current.word.split('')[j])
                if (v[j] > 1) c.exactMatched[i][j] = current.word.split('')[j]
            }
        })
        for (let i = 0; i < numberWords; i++) {
            updateNextList(c, i)
        }

        // make used letters worthless
        const letterValue = [...letterCounts.slice(6, 11)]
        letterValue.forEach((v, i) =>
            c.usedLetters.forEach((w, j) => letterValue[i][w.charCodeAt(0) - 65] = 0)
        )

        let accuracyValues = [...current.accuracyValues]
        c.word = "XXXXX"

        // setClear(!clear)
        // setCurrent(c)

        //look for newly found solutions where only 1 word is possible
        for (let i = 0; i < numberWords; i++) {
            if (!c.finished[i] && c.inputLists[i].length === 1) {
                if (!c.solvedWords.includes(c.inputLists[i][0])) {
                    for (let j = 0; j < numberWords; j++) c.individualBestGuess[j] = c.inputLists[i][0]
                    c.solvedWords.push(c.inputLists[i][0])
                    c.bestGuess = c.inputLists[i][0]
                    c.accuracies[i] = [2, 2, 2, 2, 2]
                    c.outputLists[i] = [...c.inputLists[i]]
                    c.nextFinished[i] = true
                    break
                }
            }
        }

        // if we have not preselected
        if (c.bestGuess === "") {
            // if it was the first guess and we used the 'firstGuess' word we can use lookup table
            for (let i = 0; i < numberWords; i++) {
                if (useNextGuess && word === firstGuess) {
                    c.individualBestGuess[i] = nextGuess[accuracyValues[i]];
                    c.individualBestGuessStd[i] = getWordDeviation(c.individualBestGuess[i], i).std;
                }
                else if (c.inputLists[i].length > 2) {
                    setWorking(i);
                    const best = await getNextBestWordWebWorker(c.inputLists[i], letterValue)
                    c.individualBestGuess[i] = best.word;
                    c.individualBestGuessStd[i] = best.std;
                }
                else if (c.inputLists[i].length > 0) {

                    c.individualBestGuess[i] = c.inputLists[i][0];
                    c.individualBestGuessStd[i] = 0;
                }
            }
            setWorking(numberWords);
            if (numberWords === 1) c.bestGuess = c.individualBestGuess[0]
            // else {
            //     const best = await getNextBestWordWebWorker(c.combinedList)
            //     c.bestGuess = best.word;
            // }

            else {
                // const best = await getNextBestMultiWordWebWorker(c.inputLists, c.individualBestGuess, c.individualBestGuessStd, c.combinedList)
                const best = await getNextBestWordWebWorker(c.combinedList, letterValue)
                c.bestGuess = best.word
                // debugger
            }
        }
        c.word = c.bestGuess
        c.inputLists = [...c.outputLists]
        for (let i = 0; i < numberWords; i++) {
            if (c.accuracies[i][0] != 2)
                c.word.split('').forEach((v, j) => {
                    if (c.matched[i].includes(v) || c.exactMatched[i].includes(v)) c.accuracies[i][j] = 1
                    if (c.exactMatched[i][j] === v) c.accuracies[i][j] = 2
                })
            updateNextList(c, i)
        }
        setClear(!clear)
        // const s = [...gameData]
        // s.push(c)
        setGameData([...gameData, c])
        setCurrent(c)
    }

    const recalculateWord = async () => {
        const s = [...gameData]
        const c = { ...gameData[gameData.length - 1] };
        c.bestGuess = ""

        // make used letters worthless
        const letterValue = [...letterCounts.slice(6, 11)]
        letterValue.forEach((v, i) =>
            c.usedLetters.forEach((w, j) => letterValue[i][w.charCodeAt(0) - 65] = 0)
        )

        //look for newly found solutions where only 1 word is possible
        for (let i = 0; i < numberWords; i++) {
            if (!c.finished[i] && c.inputLists[i].length === 1) {
                if (!c.solvedWords.includes(c.inputLists[i][0])) {
                    for (let j = 0; j < numberWords; j++) c.individualBestGuess[j] = c.inputLists[i][0]
                    c.solvedWords.push(c.inputLists[i][0])
                    c.bestGuess = c.inputLists[i][0]
                    c.accuracies[i] = [2, 2, 2, 2, 2]
                    c.outputLists[i] = [...c.inputLists[i]]
                    c.nextFinished[i] = true
                    break
                }
            }
        }
        if (c.bestGuess === "") {
            for (let i = 0; i < numberWords; i++) {
                if (c.inputLists[i].length > 2) {
                    setWorking(i)
                    c.individualBestGuess[i] = await getNextBestWordWebWorker(c.inputLists[i], letterValue)
                }
                else if (c.inputLists[i].length > 0)
                    c.individualBestGuess[i] = c.inputLists[i][0]
            }
            const k = numberWords === 1 ? c.individualBestGuess[0] : await getNextBestWordWebWorker(c.combinedList, letterValue)
            c.bestGuess = k.word;
        }
        c.word = c.bestGuess;
        for (let i = 0; i < numberWords; i++) {
            c.word.split('').forEach((v, j) => {
                if (c.matched[i].includes(v) || c.exactMatched[i].includes(v)) c.accuracies[i][j] = 1
                if (c.exactMatched[i][j] === v) c.accuracies[i][j] = 2
            })
            updateNextList(c, i)
            c.greyed[i] = false
        }

        s[s.length - 1] = c
        setGameData(s)
        setCurrent(c)
        setClear(!clear)
    }

    const clearAccuracies = () => {
        const s = [...gameData]
        let t = [];
        for (let index = 0; index < gameData.length; index++) {
            const c = { ...s[index] }
            c.accuracies = Array(8).fill(0).map(() => Array(5).fill(0))
            c.accuracies.forEach(() => Array(5).fill(0))
            c.accuracyValues = Array(8).fill(0)
            c.finished = Array(8).fill(false)
            c.nextFinished = Array(8).fill(false)
            c.greyed = Array(8).fill(false)
            c.matched = Array(8).fill([])
            c.unmatched = Array(8).fill([])
            c.exactMatched = Array(8).fill(0).map(() => Array(5).fill(""))
            t.push(c)
        }
        setGameData(t)
    }

    //update accuracy at position i with v of currentIndex
    const updateAllAccuracy = (gameDataIndex, wordIndex, position, value) => {
        let s = [...gameData]
        let c = { ...s[gameDataIndex] }
        let letters = c.word.split('')

        // try setting it to the new value
        if (position >= 0) c.accuracies[wordIndex][position] = value
        for (let j = 0; j < letters.length; j++) {
            if (value > 0 && j !== position && letters[j] === letters[position] && c.accuracies[wordIndex][j] === 0) {
                c.accuracies[wordIndex][j] = 1
            }
            if (value === 0 && letters[j] === letters[position]) {
                c.accuracies[wordIndex][j] = 0
            }
        }

        c = { ...s[0] }
        letters = c.word.split('')
        c.exactMatched[wordIndex] = Array(5).fill("")
        c.matched[wordIndex] = []
        c.unmatched[wordIndex] = []
        for (let j = 0; j < letters.length; j++) {
            if (c.accuracies[wordIndex][j] == 2) c.exactMatched[wordIndex][j] = letters[j]
            else if (c.accuracies[wordIndex][j] == 1) c.matched[wordIndex].push(letters[j])
            else if (c.accuracies[wordIndex][j] == 0) c.unmatched[wordIndex].push(letters[j])
        }
        updateNextList(c, wordIndex)
        if (c.outputLists[wordIndex].length >= 1)
            c.greyed[wordIndex] = false
        if (gameData.length > 1) {
            if (c.outputLists[wordIndex].length === 0 || c.greyed[wordIndex]) {
                s[1].inputLists[wordIndex] = [...c.inputLists[wordIndex]]
                console.log("adding greyed to " + (1))
                s[1].greyed[wordIndex] = true

            } else {
                s[1].inputLists[wordIndex] = [...c.outputLists[wordIndex]]
                console.log("remove greyed from " + (1))
                s[1].greyed[wordIndex] = false
            }
            s[1].matched[wordIndex] = [...c.matched[wordIndex]]
            s[1].unmatched[wordIndex] = [...c.unmatched[wordIndex]]
            s[1].exactMatched[wordIndex] = [...c.exactMatched[wordIndex]]
        }

        for (let index = 1; index < gameData.length; index++) {
            c = { ...s[index] }
            letters = c.word.split('')
            for (let j = 0; j < letters.length; j++) {

                //fix any that are wrong
                if (c.exactMatched[wordIndex][j] === letters[j]) c.accuracies[wordIndex][j] = 2
                else if ((c.matched[wordIndex].includes(letters[j]) || c.exactMatched[wordIndex].includes(letters[j])) && c.accuracies[wordIndex][j] == 0) c.accuracies[wordIndex][j] = 1
                else if (c.unmatched[wordIndex].includes(letters[j])) c.accuracies[wordIndex][j] = 0

                //update lists
                if (c.accuracies[wordIndex][j] === 2) {
                    if (c.exactMatched[wordIndex][j] == "")
                        c.exactMatched[wordIndex][j] = letters[j]
                    else if (c.exactMatched[wordIndex][j] != letters[j])
                        c.accuracies[wordIndex][j] = 0
                    // check previous for this letter in this position, but not exact match
                    for (let k = 0; k < index; k++)
                        if (s[k].word.split('')[j] == letters[j] && s[k].accuracies[wordIndex][j] != 2) {
                            c.accuracies[wordIndex][j] = 1
                            break
                        }
                }
                if (c.accuracies[wordIndex][j] == 1) {
                    if (!c.matched[wordIndex].includes(letters[j])) c.matched[wordIndex].push(letters[j])
                    const index = c.unmatched[wordIndex].indexOf(letters[j])
                    if (index > -1) {
                        c.unmatched[wordIndex].splice(index, 1);
                    }
                }
                if (c.accuracies[wordIndex][j] == 0) {
                    if (!c.unmatched[wordIndex].includes(letters[j])) c.unmatched[wordIndex].push(letters[j])
                    const index = c.matched[wordIndex].indexOf(letters[j])
                    if (index > -1) {
                        c.matched[wordIndex].splice(index, 1);
                    }
                }
            }
            updateNextList(c, wordIndex)  // uses just accuracies to update outputLists

            if (c.outputLists[wordIndex].length >= 1)
                c.greyed[wordIndex] = false
            if (index < gameData.length - 1) {
                if (c.outputLists[wordIndex].length === 0 || c.greyed[wordIndex]) {
                    s[index + 1].inputLists[wordIndex] = [...c.inputLists[wordIndex]]
                    console.log("adding greyed to " + (index + 1))
                    s[index + 1].greyed[wordIndex] = true

                } else {
                    s[index + 1].inputLists[wordIndex] = [...c.outputLists[wordIndex]]
                    console.log("remove greyed from " + (index + 1))
                    s[index + 1].greyed[wordIndex] = false
                }
                s[index + 1].matched[wordIndex] = [...c.matched[wordIndex]]
                s[index + 1].unmatched[wordIndex] = [...c.unmatched[wordIndex]]
                s[index + 1].exactMatched[wordIndex] = [...c.exactMatched[wordIndex]]
            }

            console.log(
                "index: " + index +
                " accuracies: " + JSON.stringify(s[index].accuracies[wordIndex]) +
                " matched: " + JSON.stringify(s[index].matched[wordIndex]) +
                " unmatched: " + JSON.stringify(s[index].unmatched[wordIndex])
            )
        }
        setGameData(s)
        setCurrent(s[s.length - 1])
    }

    const updateAccuracy = (wordIndex, position, value) => updateAllAccuracy(gameData.length - 1, wordIndex, position, value)

    // given a current (c) and the word number, return a current with accuracyValues, outputLists and accuracies updated
    const updateNextList = (c, wordNumber) => {

        const letterAtPos = (position, words) => {
            var newWords = []
            const letter = c.word.split('')[position]

            for (let i = 0; i < words.length; i++) {
                if (words[i].slice(position, position + 1) === letter) {
                    newWords.push(words[i])
                }

            }
            return (newWords)
        }

        const letterInWord = (position, words, accuracy) => {
            var newWords = []
            const letter = c.word.split('')[position]

            for (let i = 0; i < words.length; i++) {
                //letter in word but NOT at pos
                if (accuracy === 1 && words[i].match(letter) && words[i].slice(position, position + 1) !== letter) {
                    newWords.push(words[i])
                }
                // letter not in word and not supposed to be
                if (accuracy === 0 && !words[i].match(letter)) {
                    newWords.push(words[i])
                }
            }
            return newWords
        }

        let nextList = [...c.inputLists[wordNumber]]
        let accuracy = c.accuracies[wordNumber]
        // create new lists with the new accuracy information
        if (nextList.length > 0) {
            //with word/letters, fill in other accuracies that are double letters
            const letters = c.word.split('')

            for (let i = 0; i < letters.length; i++) {
                if (accuracy[i] === 2) {
                    nextList = letterAtPos(i, nextList)
                }
            }
            for (let i = 0; i < letters.length; i++) {
                if (accuracy[i] !== 2) {
                    nextList = letterInWord(i, nextList, accuracy[i])

                }
            }
            c.accuracyValues[wordNumber] = 3 * (3 * (3 * (3 * accuracy[0] + accuracy[1]) + accuracy[2]) + accuracy[3]) + accuracy[4]
            c.outputLists[wordNumber] = nextList
            c.accuracies[wordNumber] = accuracy

            // merge the lists
            c.combinedList = []
            for (let j = 0; j < c.outputLists.length; j++) {
                if (c.outputLists[j].length > 1) {
                    const tList = c.outputLists[j];
                    for (let k = 0; k < tList.length; k++) {
                        const word = tList[k];
                        if (!c.combinedList.includes(word)) c.combinedList.push(word)
                    }
                }
            }
        }
    }

    const changeNumberWords = (number) => {
        if (number === 8 || number === 4 || number === 1) {
            setNumberWords(number)
            if (words.length > 0) reset()
        } else alert("tried to change to an illegal number of words")
    }

    const getNextBestWordWebWorker = async (possibleWordList, letterValue) => {
        const NumberBins = possibleWordList.length < 243 ? possibleWordList.length : 243;
        // ideal count per bin if totally uniform
        const idealCount = NumberBins / possibleWordList.length;
        // worst case is all are in 1 bin, none in the others
        const maxDev = Math.sqrt(((possibleWordList.length - idealCount) * (possibleWordList.length - idealCount) + (NumberBins - 1) * idealCount * idealCount) / possibleWordList.length);

        let binSize = maxDev / 9999.9;

        const maxWorkers = Math.round(words.length / 200) < 1 ? 1 : Math.round(words.length / 200);
        const numWorkers = navigator.hardwareConcurrency < maxWorkers ? navigator.hardwareConcurrency : maxWorkers;
        const perWorker = Math.round(words.length / numWorkers);
        console.log("number of workers: ", numWorkers, " maxWorkers: ", maxWorkers, " perWorker: ", perWorker);

        var statsAry = [];
        var completed = 0;
        let promises = [];
        let stats = { best: {}, worst: {}, binSize };  // worst and topRanked will be added
        for (let j = 0; j < numWorkers; j++) {
            promises.push(new Promise(resolve => {
                let myWorker = new Worker('/worker.js');
                myWorker.addEventListener('message', function (e) {
                    if (e.data.type === "update") {
                        completed += e.data.status
                        setProgress(parseInt(100 * completed / words.length))
                    }
                    if (e.data.type === "complete") {
                        statsAry.push(e.data)
                        console.log('worker done: ', j)
                        resolve()
                    }
                }, false)
                myWorker.postMessage([
                    { ...stats },
                    possibleWordList,
                    (j === numWorkers - 1) ?
                        words.slice(j * perWorker) :
                        words.slice(j * perWorker, (j + 1) * perWorker - 1),
                    letterValue
                ]);
            }))
        }
        await Promise.all(promises)
        setProgress(100)

        //pick the best of the best and worst of the worst
        let best = { ...statsAry[0].stats.best }
        let worst = { ...statsAry[0].stats.worst }
        for (let j = 1; j < statsAry.length; j++) {
            // if it beats the best, or if it ties the best, and best is not in the possibleWordList, it becomes the best
            if ((statsAry[j].stats.best.std < best.std) || ((statsAry[j].stats.best.std == best.std) && (possibleWordList.indexOf(best.word) == -1))) {
                best = { ...statsAry[j].stats.best }
            }
            // if it beats the worst, it becomes the worst
            if (statsAry[j].stats.worst.std > worst.std) {
                worst = { ...statsAry[j].stats.worst }
            }
        }

        //merge the topRanked lists
        let topRanked = [...statsAry[0].stats.topRanked]
        for (let j = 1; j < statsAry.length; j++) {
            topRanked = [...topRanked, ...statsAry[j].stats.topRanked]
        }

        //sort by letterScore if std's are the same
        topRanked = topRanked.sort((a, b) => (a.std - b.std == 0) ? b.letterScore - a.letterScore : a.std - b.std);
        topRanked = topRanked.slice(0, 20);
        topRanked.forEach((e, i) => topRanked[i].letterScore = Math.round(e.letterScore * 100) / 100);
        best = topRanked[0];

        // add a grouping to topRanked fo equivalent sts's
        let std = topRanked[0].std
        let rank = 1;
        let bestRankCount;
        for (let k = 0; k < topRanked.length; k++) {
            if (std == topRanked[k].std) topRanked[k].rank = rank;
            else {
                if (rank == 1) bestRankCount = k
                std = topRanked[k].std
                rank++
                topRanked[k].rank = rank
            }
            if (k > 0 && rank == 1 && possibleWordList.indexOf(topRanked[k].word) != -1) {
                //switch k an 0 elements
                let t = topRanked[0]
                topRanked[0] = topRanked[k]
                topRanked[k] = t
            }
        }

        //let's look at the top rank (1) and look at the order
        //find words with most common letters that have no been used yet
        //useful for the next word in quordle or octordle
        // if (bestRankCount > 1) {
        //     for (let i = 0; i < bestRankCount; i++) {
        //         let score = 0;
        //         topRanked[i].word.split('').forEach((v, j) => {
        //             if (!current.usedLetters.includes(v)) score += letterCounts[11][v.charCodeAt(0) - 65]
        //         })
        //         topRanked[i].score = score;
        //     }
        //     topRanked.sort((a, b) => b.score - a.score);
        // }

        //merge distribution statistics
        let distribution = []
        for (let j = 1; j < statsAry.length; j++) {
            statsAry[j].stats.distribution.forEach((binCount, bin) => {
                if (distribution[bin] === undefined) distribution[bin] = binCount
                else distribution[bin] += binCount
            })
        }

        console.log(best.distribution)
        let firstIndex = -1, maxIndex
        distribution.forEach((e, i) => {
            if (firstIndex === -1) firstIndex = i
            maxIndex = i
        })

        const numberPerBin = maxIndex - firstIndex > 200 ? (maxIndex - firstIndex) / 200 : 1

        console.log("best index ", firstIndex)
        console.log("max index ", maxIndex)
        console.log("best std ", binSize * firstIndex)
        console.log("max std ", binSize * maxIndex)
        console.log("number per bin ", numberPerBin)
        console.log("std bin size ", binSize * numberPerBin)

        const dist = Array(200).fill(0)
        let distX = Array(200).fill(0)
        let binNumber = 0
        distX[0] = Math.round(100 * firstIndex * binSize) / 100
        distribution.forEach((e, i) => {
            if (i > firstIndex + numberPerBin) {
                dist[++binNumber] = e
                firstIndex += numberPerBin
                distX[binNumber] = Math.round(100 * firstIndex * binSize) / 100
            } else {
                dist[binNumber] += e
            }
        });


        // fill in for X axis
        let accX = Array(243).fill("")
        accX.forEach((v, i) => {
            let z = i
            for (let j = 0; j < 5; j++) {
                if (z % 3 == 1) accX[i] = 'y' + accX[i]
                else if (z % 3 == 2) accX[i] = 'g' + accX[i]
                else accX[i] = '-' + accX[i]
                z = parseInt(z / 3)
            }
        })

        console.log("dist ", dist)

        setDistribution({
            accX,
            distX,
            dist: dist,
            maxY: Math.max(...dist),
            bestX: distX[0],
            maxX: binSize * maxIndex,
            guess: best.word,
            worst: worst.word,
            l: possibleWordList.length,
            acc: best.binCounts,
            maxAcc: Math.max(...best.binCounts),
            maxDev: maxDev,
            dev: best.std,
            topRanked,
        })

        console.log(best)
        return new Promise(resolve => {
            resolve(best)
        })

    }


    const getNextBestMultiWordWebWorker = async (inputLists, individualBestGuessStd, combinedList) => {

        // take all words and split them into workers
        // take partial list and all inputLists and individualBestGuessStd
        // in new evaluate, go through partial list and calc N std's using N inputLists
        // sum the ratios of N std's to individualBestGuessStd ... this is the overall std for a word
        // track and return the best std

        // we can't calculate binSize as we don't know the worst case sum of rations
        let binSize = 1;

        const maxWorkers = Math.round(words.length / 200) < 1 ? 1 : Math.round(words.length / 200);
        const numWorkers = navigator.hardwareConcurrency < maxWorkers ? navigator.hardwareConcurrency : maxWorkers;
        const perWorker = Math.round(words.length / numWorkers);
        console.log("number of workers: ", numWorkers, " maxWorkers: ", maxWorkers, " perWorker: ", perWorker);

        var statsAry = [];
        var completed = 0;
        let promises = [];
        let stats = { best: {}, worst: {}, binSize };  // worst and topRanked will be added
        for (let j = 0; j < numWorkers; j++) {
            promises.push(new Promise(resolve => {
                let myWorker = new Worker('/workerMulti.js');
                myWorker.addEventListener('message', function (e) {
                    if (e.data.type === "update") {
                        completed += e.data.status
                        setProgress(parseInt(100 * completed / words.length))
                    }
                    if (e.data.type === "complete") {
                        statsAry.push(e.data)
                        console.log('worker done: ', j)
                        resolve()
                    }
                }, false)
                myWorker.postMessage([
                    { ...stats },
                    inputLists,
                    individualBestGuessStd,
                    (j === navigator.hardwareConcurrency - 1) ?
                        words.slice(j * perWorker) :
                        words.slice(j * perWorker, (j + 1) * perWorker - 1)
                ]);
            }))
        }
        await Promise.all(promises)
        setProgress(100)

        //pick the best of the best and worst of the worst
        let best = { ...statsAry[0].stats.best }
        let worst = { ...statsAry[0].stats.worst }
        for (let j = 1; j < statsAry.length; j++) {
            // if it beats the best, or if it ties the best, and best is not in the possibleWordList, it becomes the best
            if ((statsAry[j].stats.best.std < best.std) || ((statsAry[j].stats.best.std == best.std) && (combinedList.indexOf(best.word) == -1))) {
                best = { ...statsAry[j].stats.best }
            }
            // if it beats the worst, it becomes the worst
            if (statsAry[j].stats.worst.std > worst.std) {
                worst = { ...statsAry[j].stats.worst }
            }
        }

        //merge the topRanked lists
        let topRanked = [...statsAry[0].stats.topRanked]
        for (let j = 1; j < statsAry.length; j++) {
            for (let k = 0; k < 20; k++) {
                let l = topRanked.length - 1
                while (l >= 0 && statsAry[j].stats.topRanked[k].std < topRanked[l].std) l--
                if (l < 19) {
                    topRanked.splice(l + 1, 0, { std: statsAry[j].stats.topRanked[k].std, word: statsAry[j].stats.topRanked[k].word })
                    topRanked.pop()
                }
            }
        }

        // add a grouping to topRanked fo equivalent sts's
        let std = topRanked[0].std
        let rank = 1;
        for (let k = 0; k < topRanked.length; k++) {
            if (std == topRanked[k].std) topRanked[k].rank = rank;
            else {
                std = topRanked[k].std
                rank++
                topRanked[k].rank = rank
            }
            if (k > 0 && rank == 1 && combinedList.indexOf(topRanked[k].word) != -1) {
                //switch k an 0 elements
                let t = topRanked[0]
                topRanked[0] = topRanked[k]
                topRanked[k] = t
            }
        }

        //merge distribution statistics
        let distribution = []
        for (let j = 1; j < statsAry.length; j++) {
            statsAry[j].stats.distribution.forEach((binCount, bin) => {
                if (distribution[bin] === undefined) distribution[bin] = binCount
                else distribution[bin] += binCount
            })
        }

        console.log(best.distribution)
        let firstIndex = -1, maxIndex
        distribution.forEach((e, i) => {
            if (firstIndex === -1) firstIndex = i
            maxIndex = i
        })

        const numberPerBin = maxIndex - firstIndex > 200 ? (maxIndex - firstIndex) / 200 : 1

        console.log("best index ", firstIndex)
        console.log("max index ", maxIndex)
        console.log("best std ", binSize * firstIndex)
        console.log("max std ", binSize * maxIndex)
        console.log("number per bin ", numberPerBin)
        console.log("std bin size ", binSize * numberPerBin)

        const dist = Array(200).fill(0)
        let distX = Array(200).fill(0)
        let binNumber = 0
        distX[0] = Math.round(100 * firstIndex * binSize) / 100
        distribution.forEach((e, i) => {
            if (i > firstIndex + numberPerBin) {
                dist[++binNumber] = e
                firstIndex += numberPerBin
                distX[binNumber] = Math.round(100 * firstIndex * binSize) / 100
            } else {
                dist[binNumber] += e
            }
        });


        // fill in for X axis
        let accX = Array(243).fill("")
        accX.forEach((v, i) => {
            let z = i
            for (let j = 0; j < 5; j++) {
                if (z % 3 == 1) accX[i] = 'y' + accX[i]
                else if (z % 3 == 2) accX[i] = 'g' + accX[i]
                else accX[i] = '-' + accX[i]
                z = parseInt(z / 3)
            }
        })

        console.log("dist ", dist)

        setDistribution({
            accX,
            distX,
            dist: dist,
            maxY: Math.max(...dist),
            bestX: distX[0],
            maxX: binSize * maxIndex,
            guess: best.word,
            worst: worst.word,
            l: combinedList.length,
            acc: best.binCounts,
            maxAcc: Math.max(...best.binCounts),
            maxDev: 20,
            dev: best.std,
            topRanked,
        })

        console.log(best)
        return new Promise(resolve => {
            resolve(best)
        })

    }


    const checkWord = (word) => {
        if (word.length === 5) {
            let low = 0
            let high = words.length - 1
            let index = parseInt(words.length / 2)
            while (1) {
                const i = word.localeCompare(words[index])
                if (i === 0) {
                    return true
                } else if (i < 0) {
                    high = index
                    index = parseInt((low + index) / 2)
                } else {
                    low = index
                    index = parseInt((high + index) / 2)
                }
                if ((high - low) <= 1) {
                    return false
                }
            }
        }
    }

    const replaceLetter = (index, letter) => {

        const s = [...gameData]
        const c = s[s.length - 1]
        c.word = c.word.replaceAt(index, letter)
        setIsAWord(checkWord(c.word))
        setGameData(s)
        setCurrent(s[s.length - 1])
    }

    const replaceWord = (word) => {
        if (!word) {
            console.error("no word provided in replaceWord");
            return;
        }
        console.log("replaceWord called with ", word);
        const s = [...gameData]
        const c = s[s.length - 1]
        //set the new word
        c.word = word
        //reset the accuracies
        c.accuracies = Array(8).fill(0).map(() => Array(5).fill(0))
        c.accuracyValues = Array(8).fill(0)
        //reset the previously matched letters in accuracies
        for (let i = 0; i < 4; i++) {
            c.word.split('').forEach((v, j) => {
                if (c.matched[i].includes(v)) c.accuracies[i][j] = 1
                if (c.exactMatched[i][j] === v) c.accuracies[i][j] = 2
            })
            updateNextList(c, i)
        }
        setGameData(s)
        setCurrent(s[s.length - 1])
    }

    const backOneStep = () => {
        const s = [...gameData]
        if (s.length > 1) {
            s.pop()
            setGameData(s)
            setCurrent(s[s.length - 1])
        }
    }

    const clearOthers = () => {
        const d = { ...distribution }
        d.others = []
        setDistribution(d)
    }

    const value = {
        current,
        gameData,
        clearAccuracies,
        nextWord,
        recalculateWord,
        updateAccuracy,
        updateAllAccuracy,
        numberWords,
        changeNumberWords,
        progress,
        working,
        distribution,
        replaceLetter,
        replaceWord,
        checkWord,
        isAWord,
        clear,
        backOneStep,
        getBestStartWord,
        getWordDeviation,
        getBestSecondWords,
        reset,
        clearOthers,
        loadLongList,
        loadShortList,
        letterCounts,
        removeWord
    }

    return (
        <WordleContext.Provider value={value}>
            {children}
        </WordleContext.Provider>
    )
}
