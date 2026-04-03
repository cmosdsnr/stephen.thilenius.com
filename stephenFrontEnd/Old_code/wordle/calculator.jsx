
import { nextGuess, words } from '../../src/components/Games/Wordle/Dictionary'

// w = list of all possible matching words
// l = word to analyze (split into array of 5 letters)
// i = recursive position (0 - 4)
//
const splitOnLetters = (possibleWordList, letters, i) => {
    // a = array of possible words that have 
    // the same letter as word to analyze at position i
    // b = words that don't
    var a = [], b = []
    possibleWordList.forEach(word => {
        if (word.match(letters[i])) a.push(word)
        else b.push(word)
    })
    if (i < 4) {
        if (a.length > 0) a = splitOnLetters(a, letters, i + 1)
        if (b.length > 0) b = splitOnLetters(b, letters, i + 1)
    }
    return [[a, b]]
}

const getStdDev = (a, stdSum, mean) => {
    if (Array.isArray(a[0])) {
        stdSum = getStdDev(a[0], stdSum, mean)
        if (a.length > 1) stdSum = getStdDev(a[1], stdSum, mean)
        return stdSum
    } else {
        return stdSum + (a.length - mean) * (a.length - mean)
    }
}

export const getNextBestWord = (possibleWordList, accuracyValue, step) => {
    if (possibleWordList.length === 1) {
        return (possibleWordList[0])

    }
    if (possibleWordList.length === 0) {
        return ("")

    }
    if (step === 0) {
        return (nextGuess[accuracyValue])

    }
    var min = { v: 1000000, w: "" }
    let mean = possibleWordList.length / 32
    words.forEach((word, i) => {
        var letters = word.split('')
        let splitTree = splitOnLetters(possibleWordList, letters, 0)
        let stdSum = getStdDev(splitTree, 0, mean)
        let stdDev = Math.sqrt(stdSum / 32)
        if (stdDev < min.v) {
            min.v = stdDev
            min.w = word
            // console.log(t, " ", mean, " ", stdDev)
        }
    })
    return (min.w)
}
