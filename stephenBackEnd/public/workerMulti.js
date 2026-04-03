self.addEventListener('message', function (e) {
    // e.data = [stats, inputLists, individualBestGuessStd, fragmented all words wordList]
    evaluate(e.data[0], e.data[1], e.data[2], e.data[3])
    self.postMessage({ type: "complete", stats: e.data[0] });
    self.close();
}, false);

const evaluate = (stats, inputLists, individualBestGuessStd, wordList) => {
    stats.topRanked = []
    for (let i = 0; i < 20; i++) { stats.topRanked.push({ std: 1000000, word: "" }) }
    stats.worst.std = 0;
    stats.distribution = [];
    let std = [];

    for (let i = 0; i < wordList.length; i++) {
        const dictionaryWordToAnalyze = wordList[i]
        if (i > 0 && i % 20 === 0) self.postMessage({ type: "update", status: 20 });
        let binCounts;
        let barChartBins;
        std = [];
        for (let listNumber = 0; listNumber < inputLists.length; listNumber++) {
            if (inputLists[listNumber].length === 0) continue
            let possibleWordList = inputLists[listNumber]
            binCounts = Array(243).fill(0)  // 3^5 = 9*9*3
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
            std.push(0);
            // std[listNumber] = 0;
            let c = 0;
            barChartBins = []
            binCounts.forEach((a) => {
                // if possibleWordList.length > 243 add in every bin 0 or not.
                // if not, ignore the 0 bins till the next steps
                std[listNumber] += possibleWordList.length > 243 || a > 0 ? (a - mean) * (a - mean) : 0
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
                std[listNumber] += possibleWordList.length - c
            }

            for (let i = c; i < (possibleWordList.length > 243 ? 243 : possibleWordList.length); i++) {
                barChartBins.push(0);
            }

            std[listNumber] = Math.sqrt(std[listNumber] / possibleWordList.length);
            std[listNumber] /= individualBestGuessStd[listNumber]; // how far beyond the best one

        }
        // get the sum of rations of stds
        std = std.reduce((a, b) => a + b, 0)

        if (stats.distribution[parseInt(std / stats.binSize)] === undefined) stats.distribution[parseInt(std / stats.binSize)] = 1
        else stats.distribution[parseInt(std / stats.binSize)]++

        let rankWeHaveNotYetBeat = 19
        // beat ranks till we can't any more
        while (rankWeHaveNotYetBeat >= 0 && stats.topRanked[rankWeHaveNotYetBeat].std > std) rankWeHaveNotYetBeat--
        // if we have not beaten the 19th rank, we are not in the top 20
        if (rankWeHaveNotYetBeat < 19) {
            stats.topRanked.splice(rankWeHaveNotYetBeat + 1, 0, { std, word: dictionaryWordToAnalyze })
            stats.topRanked.pop()
        }

        // check if better than best, or check if equal to best, but also in possibleWordList, which is a better choice 
        if ((i > 0 && std === stats.best.std && (possibleWordList.indexOf(dictionaryWordToAnalyze) > -1)) || ((std < stats.best.std) || (i === 0))) {
            stats.best.word = dictionaryWordToAnalyze
            stats.best.binCounts = [...binCounts]
            stats.best.barChartBins = [...barChartBins]
        }

        // check if WORST and replace if it is
        if (i === 0 || std > stats.worst.std)
            stats.worst = {
                std,
                word: dictionaryWordToAnalyze
            }
    }

}