
import { firstGuess } from '../../src/components/Games/Wordle/Dictionary'

const pruneInLetter = (letter, position, branch) => {
    let newTree = {}

    const assembleWord = (branch, level, word) => {
        if (level !== 4) {
            for (const key in branch) {
                assembleWord(branch[key], level + 1, word + key)
            }
        }
        else {
            for (const key in branch) {
                const w = word + key
                if (w.match(letter) && w.slice(position, position + 1) !== letter) {
                    let p = newTree
                    for (let i = 0; i < 5; i++) {
                        const l = w.slice(i, i + 1)
                        if (!p[l]) p[l] = {}
                        p = p[l]
                    }
                }
            }
        }
    }

    assembleWord(branch, 0, "")
    return newTree
}

const pruneAtPosition = (letter, position, branch, level) => {
    if (!level) level = 0
    if (position === level) {
        //remove everything except 'letter'                    
        for (const key in branch) {
            if (key !== letter) delete (branch[key])
        }
    } else {
        //branch down to next level           
        for (const key in branch) {
            pruneAtPosition(letter, position, branch[key], level + 1)
            if (level < 4 && Object.keys(branch[key]).length === 0) delete (branch[key])
        }
    }
}

const pruneOutLetter = (letter, branch, level) => {
    if (!level) level = 0
    if (branch[letter]) { delete (branch[letter]) }
    for (const key in branch) {
        pruneOutLetter(letter, branch[key], level + 1)
        if (level < 4 && Object.keys(branch[key]).length === 0) delete (branch[key])
    }
}

const getFirstWord = (branch) => {
    let b = branch
    let a = ""
    for (let i = 0; i < 5; i++) {
        a += Object.keys(b)[0]
        b = b[Object.keys(b)[0]]
    }
    return words.findIndex((e) => e === a)
}

const pruneTree = (list, word, accuracy) => {
    const letters = word.split('')
    for (let i = 0; i < letters.length; i++) {
        let l = letters[i]
        // letter is not in word
        if (accuracy[i] === 0) {
            pruneOutLetter(l, list)
        }
        //letter is somewhere in word, but not at i
        else if (accuracy[i] === 1) {
            list = pruneInLetter(l, i, list)
        }
        //letter is at this position
        else {
            pruneAtPosition(l, i, list)
        }
    }
    return list
}


const getAccuracyStd = (branch, word) => {

    let acc = Array(243).fill(0)  // 3^5 = 9*9*3

    // create histogram of number of list entries per accuracy bin
    // calculate the std and return it
    const getAccuracyAry = (branch, word, accuracy, level) => {
        if (accuracy === undefined) accuracy = 0
        if (level === undefined) level = 0
        accuracy *= 3

        for (const key in branch) {
            let a = accuracy
            if (word.charAt(level) === key) a += 2
            else if (word.match(key)) a += 1
            if (level < 4) { getAccuracyAry(branch[key], word, a, level + 1) }
            else { acc[a]++ }
        }
    }

    getAccuracyAry(branch, word)

    let sum = 0
    for (let i = 0; i < acc.length; i++) {
        sum += acc[i]
    }
    // calculate mean of array
    let mean = sum / acc.length
    // calc std of array
    let std = 0
    acc.forEach((a, k) => {
        std += (a - mean) * (a - mean)
    })
    std = Math.sqrt(std / 243)
    return { std, acc }


}

const printTree = (branch, word, level) => {
    if (branch === undefined) branch = hash
    if (word === undefined) word = ""
    if (level === undefined) level = 0
    if (level !== 4) {
        for (const key in branch) {
            printTree(branch[key], word + key, level + 1)
        }
    }
    else {
        for (const key in branch) {
            word = word + key
            console.log(word)
        }

    }
}

const countTree = (branch, level) => {
    if (branch === undefined) branch = hash
    if (level === undefined) level = 0
    // debugger
    if (level !== 4) {
        let count = 0
        for (const key in branch) {
            count += countTree(branch[key], level + 1)
        }
        return count
    }
    else {
        return Object.keys(branch).length
    }
}


const makeHash = (words) => {
    let h = {}
    // let nodeCount = 1;
    words.forEach((word, i) => {
        let j = h
        const letters = word.split('')
        const l = letters.length
        for (let i = 0; i < l; i++) {
            if (!j[letters[i]]) {
                j[letters[i]] = {}
                // nodeCount++ ~17,000
            }
            j = j[letters[i]]
        }
    });
    setHash(h)
    return h
}

const testGetAccuracyStd = (hash) => {
    let min = {}
    var startTime = performance.now()
    for (let i = 0; i < words.length; i++) {
        const word = words[i];
        const { std, acc } = getAccuracyStd(hash, word)
        if (i === 0 || std < min.std) {
            min = { std, word, acc }
        }
        if (i % 300 === 0) console.log(i)
    }
    console.log("best word " + min.word + " at " + min.std + " dist " + min.acc)
    var endTime = performance.now()
    console.log(`Call to loop took ${endTime - startTime} milliseconds`)
}

const createList = () => {
    debugger
    let hash = makeHash(words)
    setHash(hash)
    const hashString = JSON.stringify(hash)
    let h = JSON.parse(hashString)
    // console.log(countTree(h))
    // testGetAccuracyStd(h)
    let best = {}
    for (let i = 144; i < 145; i++) { //243
        let accuracy = []
        let a = i
        for (let j = 0; j < 5; j++) {
            const l = parseInt(a / 3)
            accuracy[j] = a - 3 * l
            a = l
        }
        h = JSON.parse(hashString)
        h = pruneTree(h, firstGuess, accuracy)
        const subHashString = JSON.stringify(h)
        const count = countTree(h)
        // console.log(count)
        if (count > 0) {
            let min = {}
            for (let i = 0; i < words.length; i++) {
                const word = words[i];
                const { std, acc } = getAccuracyStd(h, word)
                if (i === 0 || std < min.std) {
                    min = { std, word, acc, i }
                }
            }

            let bestSub = {}
            for (let k = 143; k < 144; k++) {
                // if (k === 29) debugger
                let accuracy = []
                let a = k
                for (let j = 0; j < 5; j++) {
                    const l = parseInt(a / 3)
                    accuracy[j] = a - 3 * l
                    a = l
                }
                let ha = JSON.parse(subHashString)
                ha = pruneTree(ha, min.word, accuracy)
                const count = countTree(ha)
                // console.log(count)
                if (count > 0)
                    if (count <= 2) {
                        const w = getFirstWord(ha)
                        // console.log(w + " " + words[w])
                        bestSub[k] = w
                    } else {
                        let smin = {}
                        for (let i = 0; i < words.length; i++) {
                            const word = words[i];
                            const { std, acc } = getAccuracyStd(ha, word)
                            if (i === 0 || std < smin.std) {
                                smin = { std, word, acc, i }
                            }
                        }
                        bestSub[k] = smin.i
                    }
            }
            // debugger
            best[i] = { w: min.i, s: bestSub }
        }

        const sf = JSON.stringify(best[i])
        console.log(sf)
        // debugger
    }
    // debugger
    const sf = JSON.stringify(best)
    var file = new File([sf], "myFilename.txt", { type: "application/octet-stream" });
    var blobUrl = URL.createObjectURL(file);
    window.location = blobUrl;
}


const convertList = () => {
    let a = {}
    for (const key in preCalc) {
        a[key] = words[preCalc[key].w]
    }
    console.log(JSON.stringify(a))
}

useEffect(() => {
    // createList()
    // convertList()
}, [])

useEffect(() => {
    if (hash) {

        // let h = pruneTree(hash, "TARES", [1, 2, 1, 0, 1])
        // console.log(countTree(h))
        // printTree()

    }
}, [hash])
