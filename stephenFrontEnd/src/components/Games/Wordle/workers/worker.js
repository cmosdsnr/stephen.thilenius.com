import { evaluate } from './evaluate';

self.addEventListener('message', function (e) {
    // e.data = [stats, possibleWordList, fragmented all words wordList, letterValue]
    const stats = evaluate(e.data[0], e.data[1], e.data[2]);
    self.postMessage({ type: "complete", stats });
    self.close();
}, false);
