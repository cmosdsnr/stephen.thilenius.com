
const createTree = () => {
    let root = {}
    list.forEach(word => {
        let head = root
        word.split("").forEach((l, i) => {
            if (!head[l])
                head[l] = {}
            head = head[l]
            if (i == word.length - 1) head['.'] = true
        })
    })
    console.log('root:', root);

    let s = ""
    const printTree = (branch) => {
        for (const key in branch) {
            if (key == '.')
                s += '.'
            else {
                s += key
                s += '+'
                printTree(branch[key])
                s += '-'
            }
        }

    }
    printTree(root)
    console.log('s:', s);
    const a = document.createElement('a');
    const file = new Blob([s], { type: 'text/plain' });
    a.href = URL.createObjectURL(file);
    a.download = "test.txt";
    a.click();

    URL.revokeObjectURL(a.href);
}

const readTree = () => {
    let root = {}
    let head = root
    fetch(tree)
        .then(r => r.text())
        .then(text => {
            text.split("").forEach(letter => {
                if (letter == '+') {
                    head = head[head.length - 1]
                } else if (letter == '-') {
                    head = head.parent
                } else if (letter == '.') {
                    head['.'] = true
                } else {
                    if (!head[letter])
                        head[letter] = []
                    head[letter].push({})
                    head[letter][head[letter].length - 1].parent = head
                    head = head[letter][head[letter].length - 1]
                }

            })
        })
}

function sortAlpha(letters) {
    return letters
        .sort()
        .join("");
}

const analyzeScore = (word, y, available) => {
    let score
    if (word.length > 6) score = 12 + 3 * (word.length - 7)
    else if (word.length == 6) score = 6
    else if (word.length == 5) score = 4
    else score = 2
    let all = true
    for (let i = 0; i < available.length; i++)
        if (word.indexOf(available[i]) == -1) {
            all = false;
            break;
        }
    if (all) score += 7
    for (let i = 0; i < word.length; i++)
        if (word.charAt(i) == y) score += 5
    return score
}

const analyzeData = async () => {
    const r = await fetch(words)
    const text = await r.text()
    let h = []
    for (let mh = 97; mh <= 122; mh++) {

        let catalog = []
        let cnt = 0
        let list = []

        // get list of words with letter mh
        text.split("\n").forEach(word => {
            if (word.includes(String.fromCharCode(mh))) {
                cnt++
                list.push(word)
            }
        })

        // get the codeWords of 7 different-lettered words
        list.forEach(word => {
            let letters = []
            for (let i = 0; i < word.length; i++) {

                if (letters.indexOf(word.charAt(i)) == -1)
                    letters.push(word.charAt(i))
            }
            if (letters.length == 7) {
                const codeWord = sortAlpha(letters)
                if (!catalog[codeWord]) catalog[codeWord] = [word]
                else catalog[codeWord].push(word)
            }
        })
        // we now have all the possible codeWords, add the ones that have <7 letters
        list.forEach(word => {
            let letters = []
            for (let i = 0; i < word.length; i++) {

                if (letters.indexOf(word.charAt(i)) == -1)
                    letters.push(word.charAt(i))
            }
            if (letters.length < 7) {
                catalog.forEach((wordList, codeWord) => {
                    let all = true
                    for (i = 0; i < letters.length; i++) {
                        if (codeWord.indexOf(letters[i]) == -1) {
                            all = false
                            break
                        }
                    }
                    if (all) {
                        wordList.push(word)
                    }
                })
            }
        })
        //prune codeWords with less than 12 words
        Object.keys(catalog).forEach((codeWord) => {
            const wordList = catalog[codeWord]
            if (wordList.length < 12) {
                delete catalog[codeWord]

            }
        })

        // get the best score for each codeWord
        let best = []
        for (let index = 0; index < 12; index++) best.push({ score: 0, codeWord: null })
        Object.keys(catalog).forEach((codeWord) => {
            const wordList = catalog[codeWord]
            let local = []
            let cw = codeWord.split("").splice(codeWord.indexOf(String.fromCharCode(mh)), 1).join("")
            wordList.forEach((word) => {
                let best = 0
                cw.split("").forEach((l, j) => {
                    const s = analyzeScore(word, l, cw.split(""))
                    if (best < s) best = s
                })
                local.push({ word, score: best })
            })
            //get the best 12 words for this codeWord
            local = local.sort(function (a, b) { return b.score - a.score; }).slice(0, 12)
            let sum = 0
            local.forEach((l) => sum += l.score)
            let i = -1
            while (i < 11 && sum > best[i + 1].score) i++
            if (i > -1) best[i] = { score: sum, codeWord }
        })
        if (best[11].score > 0) {
            // const w = best[11].codeWord.split("").splice(best[11].codeWord.indexOf(String.fromCharCode(mh)), 1).join("")
            let w = best[11].codeWord.split("")
            w.splice(best[11].codeWord.indexOf(String.fromCharCode(mh)), 1)
            w = w.join("")
            h.push({
                score: best[11].score,
                must: String.fromCharCode(mh),
                available: w
            })
        }
        //report
        // console.log(String.fromCharCode(mh), " has ", cnt, " words and " + Object.keys(catalog).length
        //     + " codeWords in the catalog. Top Score: ", best[11].score, " for CodeWord: ", best[11].codeWord)
    }
    h = h.sort(function (a, b) { return a.score - b.score; })
    h.forEach((l) =>
        console.log("Score: ", l.score, " Must: ", l.must, " Available: ", l.available)
    )
}

const getData = async () => {
    if (!available || available.length == 0) {
        console.log("no letters")
        return;
    }
    if (!must) {
        console.log("no must")
        return;
    }
    console.log("getting data")
    let j = 0, i
    const r = await fetch(words)
    const text = await r.text()
    let local = []
    for (let index = 0; index < available.length; index++) local.push([])
    // let seven = []
    // let five = []
    // let valid = []
    // let invalidWords = 0
    // let cnt = 0
    text.split("\n").forEach(word => {
        // cnt++
        // if (word.length > 6) seven.push(word)
        // if (word.length == 5) five.push(word)

        // find words with more than 7 different letters
        // let letters = []
        // for (i = 0; i < word.length; i++) {
        //     if (letters.indexOf(word.charAt(i)) == -1) {
        //         letters.push(word.charAt(i))
        //         if (letters.length > 7) {
        //             invalidWords++
        //             break
        //         }
        //     }
        //     if (i == word.length - 1)
        //         valid.push(word)
        // }
        if (word.includes(must)) {
            for (i = 97; i <= 122; i++) {
                const letter = String.fromCharCode(i)
                if (letter != must && available.indexOf(letter) == -1 && word.includes(letter)) {
                    break;
                }
            }
            if (i == 123) available.forEach((l, j) => local[j].push({ word, score: score(word, l) }))
        }
    })

    let tmp = []
    local[0].forEach((w, i) => {
        let all = true
        for (let j = 0; j < available.length; j++) {
            if (!w.word.includes(available[j])) {
                all = false;
                break;
            }
        }
        if (all) tmp.push(w);
    })
    setUsesAll(tmp.sort(function (a, b) { return b.score - a.score; }))

    local.forEach((l, i) => local[i] = l.sort(function (a, b) { return b.score - a.score; }).slice(0, 25))
    setList(local)

    // console.log("invalid Words: ", invalidWords, " out of: ", cnt)
    // console.log("valid Words: ", valid.length, " out of: ", cnt)
    // valid.forEach((w) => {
    //     console.log(w)
    // })
    // console.log("five length: ", five.length)
    // five.forEach((w) => {
    //     console.log(w)
    // })
    //createTree()
}
