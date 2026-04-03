import wordListFile from "./words2309.txt";
import optionWords from "./words11435.txt";
import longWordListFile from "./words8916.txt";

const loadList = async (list: string): Promise<string[]> => {
  const w: string[] = [];
  const r = await fetch(list);
  const text = await r.text();
  text.split("\n").forEach((line) => line.split(" ").forEach((word) => w.push(word.slice(0, 5).toUpperCase())));
  return w;
};

export const wordList = await loadList(wordListFile);
export const optionList = await loadList(optionWords);
export const longWordList = await loadList(longWordListFile);

console.log(
  `Loaded Old Wordle lists: ${wordList.length} words, ${optionList.length} options, ${longWordList.length} long words.`
);
