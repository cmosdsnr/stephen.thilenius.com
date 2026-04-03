self.addEventListener('message', function (e) {
    // e.data = [stats, possibleWordList, fragmented all words wordList, letterValue]
    evaluate(e.data[0], e.data[1], e.data[2], e.data[3]);
    self.postMessage({ type: "complete", stats: e.data[0] });
    self.close();
}, false);

const evaluate = (stats, possibleWordList, wordList, letterValue) => {
    stats.topRanked = []
    for (let i = 0; i < 20; i++) { stats.topRanked.push({ std: 1000000, word: "" }) }

    stats.worst.std = 0;
    stats.distribution = [];

    for (let i = 0; i < wordList.length; i++) {
        const dictionaryWordToAnalyze = wordList[i]
        if (i > 0 && i % 20 === 0) self.postMessage({ type: "update", status: 20 });
        let binCounts = Array(243).fill(0)  // 3^5 = 9*9*3
        possibleWordList.forEach((possibleWord, n) => {
            let bin = 0
            // get the accuracy value of word if possibleWord is the answer
            dictionaryWordToAnalyze.split('').forEach((letter, position) => {
                if (possibleWord.match(letter)) {
                    if (possibleWord.slice(position, position + 1) === letter)
                        bin += 2
                    else bin += 1
                }
                bin *= 3
            })
            bin /= 3
            // add 1 to that bin
            binCounts[bin]++
        })

        // calculate mean of binCount array
        // binCount has possibleWordList.length increments, so the sum of binCount is always possibleWordList.length
        // if possibleWordList.length < 243 then the best spread is binCount having possibleWordList.length bins with 1 and the rest 0
        let mean = possibleWordList.length > 243 ? possibleWordList.length / 243 : 1;

        // calc std of array
        let std = 0;
        let c = 0;
        let barChartBins = []
        binCounts.forEach((a) => {
            // if possibleWordList.length > 243 add in every bin 0 or not.
            // if not, ignore the 0 bins till the next steps
            std += possibleWordList.length > 243 || a > 0 ? (a - mean) * (a - mean) : 0
            if (a > 0) {
                c++
                barChartBins.push(a)
            }
        })
        if (mean === 1) {
            // if less than 243 words, ideal spread is in possibleWordList.length bins
            // c is the number of bins that actually had non-zero values so there are 
            // possibleWordList.length - c bins that are zero which ideally should not be.
            // sdt component of each of these is 1 (mean =1, value=0 => (1-0)^2 = 1)
            std += possibleWordList.length - c
        }

        for (let i = c; i < (possibleWordList.length > 243 ? 243 : possibleWordList.length); i++) {
            barChartBins.push(0)
        }

        std = Math.sqrt(std / possibleWordList.length)

        if (stats.distribution[parseInt(std / stats.binSize)] === undefined) stats.distribution[parseInt(std / stats.binSize)] = 1
        else stats.distribution[parseInt(std / stats.binSize)]++

        let letterScore = 0
        // if (dictionaryWordToAnalyze == "LINTY") console.log("std:", std, dictionaryWordToAnalyze, JSON.stringify(binCounts), stats.best.std, i);
        if (i == 0 || std <= stats.best.std) {
            // if equal to best, check which word has the highest letter value
            dictionaryWordToAnalyze.split('').forEach((letter, i) => {
                if (Array.isArray(letterValue[i])) {
                    // console.log(letter.charCodeAt(0) - 65, JSON.stringify(letterValue));
                    letterScore += letterValue[i][letter.charCodeAt(0) - 65];
                } else {
                    console.log("error: ", JSON.stringify(letterValue))
                }
            });
            console.log("ls:", letterScore, dictionaryWordToAnalyze);
        }

        let rankWeHaveNotYetBeat = 19
        // beat ranks till we can't any more
        while (rankWeHaveNotYetBeat >= 0 && stats.topRanked[rankWeHaveNotYetBeat].std > std) rankWeHaveNotYetBeat--
        // if we are the best std, check letterScore to promote to a higher rank
        if (i > 0 && std === stats.best.std)
            while (rankWeHaveNotYetBeat >= 0 && stats.topRanked[rankWeHaveNotYetBeat].letterScore > letterScore) {
                console.log("ld");
                rankWeHaveNotYetBeat--;
            }
        // if we have not beaten the 19th rank, we are not in the top 20
        if (rankWeHaveNotYetBeat < 19) {
            stats.topRanked.splice(rankWeHaveNotYetBeat + 1, 0, { std, word: dictionaryWordToAnalyze, letterScore, binCounts: [...binCounts], barChartBins: [...barChartBins] })
            stats.topRanked.pop()
        }

        // check if better than best, or check if equal to best, but also in possibleWordList, which is a better choice 
        if ((i > 0 && std === stats.best.std && (possibleWordList.indexOf(dictionaryWordToAnalyze) > -1)) || ((std < stats.best.std) || (i === 0))) {
            stats.best.word = dictionaryWordToAnalyze;
            stats.best.std = std;
            stats.best.binCounts = [...binCounts];
            stats.best.barChartBins = [...barChartBins];
        }


        // check if WORST and replace if it is
        if (i === 0 || std > stats.worst.std)
            stats.worst = {
                std,
                word: dictionaryWordToAnalyze
            }
    }
}