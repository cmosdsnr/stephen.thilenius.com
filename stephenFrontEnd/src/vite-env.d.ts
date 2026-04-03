/// <reference types="vite/client" />

declare module "*?worker" {
  const worker: new () => Worker;
  export default worker;
}

interface RankedGuess {
  std: number;
  word: string;
  letterScore?: number;
  inList?: boolean;
  binCounts?: number[];
  rank?: number;
}

interface Stats {
  topRanked: RankedGuess[];
  worst: RankedGuess;
  distribution: number[];
}

type NextGuessType = { [key: string]: string };
