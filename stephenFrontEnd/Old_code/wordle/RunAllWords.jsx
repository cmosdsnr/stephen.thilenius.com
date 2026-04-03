import React from 'react'

export const RunAllWords = ({ allWords }) => {

    const letterAtPos = (l, pos, words) => {
        var t = [], nt = []
        for (let i = 0; i < words.length; i++) {
            if (words[i].slice(pos, pos + 1) === l) {
                t.push(words[i])
            } else {
                nt.push(words[i])
            }
        }
        return ([t, nt])
    }

    const letterInWord = (l, pos, words, withLetter) => {
        var t = []
        for (let i = 0; i < words.length; i++) {
            //letter in word but NOT at pos
            if (withLetter === 1 && words[i].match(l) && words[i].slice(pos, pos + 1) !== l) {
                t.push(words[i])
            }
            if (withLetter === 0 && !words[i].match(l)) {
                t.push(words[i])
            }
        }
        return (t)
    }

    const eliminate = (guess, myWords, accuracies) => {
        let w = [...myWords]
        guess.split('').forEach((l, i) => {
            if (accuracies[i] === 2) {
                w = letterAtPos(l, i, w)[0]
            }
        })
        guess.split('').forEach((l, i) => {
            if (accuracies[i] !== 2) {
                w = letterInWord(l, i, w, accuracies[i])

            }
        })
        return (w)
    }

    const setAccuracies = (guess, word) => {
        var accuracies = [0, 0, 0, 0, 0]
        var wl = word.split('')
        guess.split('').forEach((l, i) => {
            if (wl[i] === l) accuracies[i] = 2
            else if (word.match(l)) accuracies[i] = 1
        })
        return accuracies
    }

    const level1 = () => {
        var myWords = [...allWords]
        var accuracies = [0, 0, 0, 0, 0]
        var list = {}

        for (let i = 0; i < 243; i++) {
            let r = i
            let t = i % 3
            for (let j = 0; j < accuracies.length; j++) {
                accuracies[j] = t
                r -= t
                r /= 3
                t = r % 3
            }
            myWords = eliminate("ARISE", myWords, accuracies)
            if (myWords.length === 0) {
                console.log(accuracies + " NO WORDS")
            } else {
                const guess = getNextBestWord(myWords)
                console.log(accuracies + " " + guess)
                list[i] = guess
            }
            myWords = [...allWords]
        }
        console.log(JSON.stringify(list))
    }

    const run = () => {
        var guess = "ARISE"
        var steps = 0, wordCnt = 0
        var c = {}
        var selectedWords = [{}, {}, {}, {}, {}, {}]
        allWords.forEach((d, i) => {
            var myWords = [...allWords]
            var accuracies = [0, 0, 0, 0, 0]
            var cnt = 0
            while (myWords.length > 2) {
                // console.log(guess + " s:" + cnt + " left:" + myWords.length)
                // debugger
                accuracies = setAccuracies(guess, d)
                myWords = eliminate(guess, myWords, accuracies)
                const lastGuess = guess
                guess = getNextBestWord(myWords)
                if (guess === lastGuess) break
                if (selectedWords[cnt][guess]) selectedWords[cnt][guess] += 1
                else selectedWords[cnt][guess] = 1
                cnt++
            }
            if (myWords.length === 1) cnt++
            else if (myWords.length === 2) cnt += 1.5
            else if (myWords.length === 3) cnt += 1.67
            else console.log("error: " + myWords.length)
            steps += cnt
            wordCnt++
            if (c[cnt]) c[cnt] += 1
            else c[cnt] = 1
            console.log(d + " took " + cnt + " steps")
            // debugger
        })
        steps /= wordCnt
        console.log("Average: " + steps)
        for (const property in c) {
            console.log(`${property}: ${c[property]}`);
        }
        // debugger
    }

    const getNextBestWord = (w) => {
        if (w.length < 3) {
            return w[0]
        }
        var mean = 0
        const splitOnLetters = (w, l, i) => {
            var a = [], b = []
            w.forEach(e => {
                if (e.match(l[i])) a.push(e)
                else b.push(e)
            })
            if (i < 4) {
                a = splitOnLetters(a, l, i + 1)
                b = splitOnLetters(b, l, i + 1)
            } else {
                mean += a.length + b.length
            }
            return [a, b]
        }
        var stdSum = 0
        const getStdDev = (a) => {
            if (Array.isArray(a[0])) {
                getStdDev(a[0])
                getStdDev(a[1])
            } else {
                stdSum += (a.length - mean) * (a.length - mean)
            }
        }
        var a
        var min = { v: 1000000, w: "" }
        allWords.forEach((t, i) => {
            var ls = t.split('')
            a = splitOnLetters(w, ls, 0)
            mean /= 32
            getStdDev(a)
            var stdDev = Math.sqrt(stdSum / 32)
            if (stdDev < min.v) {
                min.v = stdDev
                min.w = t
                // console.log(t, " ", mean, " ", stdDev)
            }
            mean = 0
            stdSum = 0
        })
        return (min.w)
    }

    return (
        <div>
            <button className='btn btn-info' onClick={(e) => run(e)}>Run All Words</button>
            <button className='btn btn-info' onClick={(e) => level1(e)}>Level 1</button>
        </div>
    )
}
