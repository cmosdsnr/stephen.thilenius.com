import React, { useState, useEffect, useContext, ReactNode } from 'react';
import { frequencies } from '../src/Frequencies';
import { firstGuess, nextGuess } from '../src/Guesses';
import { useWords } from './useWords';
import { useGameState } from './useGameState';
import { useWordEvaluator } from './useWordEvaluator';
import { updateAllAccuracy, updateNextList } from './wordleUtils';
import { GameStep, LetterCounts, RankedGuess } from './types';

/**
 * Context data and functions shared via React context.
 */
interface WordleContextType {
    current: GameStep;
    gameData: GameStep[];
    clearAccuracies: () => void;
    nextWord: () => Promise<void>;
    recalculateWord: () => Promise<void>;
    updateAccuracy: (wordIndex: number, position: number, value: number) => void;
    updateAllAccuracy: (gameDataIndex: number, wordIndex: number, position: number, value: number) => void;
    numberWords: number;
    changeNumberWords: (n: number) => void;
    replaceWord: (word: string) => void;
    checkWord: (word: string) => boolean;
    isWord: boolean;
    backOneStep: () => void;
    getWordDeviation: (w: string, list: string[], valueMap: number[][]) => RankedGuess;
    getBestSecondWords: () => Promise<any>;
    topRanked: RankedGuess[];
    reset: () => void;
    loadLongList: () => Promise<void>;
    loadShortList: () => Promise<void>;
    letterCounts: LetterCounts;
    working: number;
    removeWord: (word: string) => void;
}

const WordleContext = React.createContext<WordleContextType | undefined>(undefined);

/**
 * React hook for accessing Wordle context.
 * @returns {WordleContextType} Wordle context values and functions.
 * @throws {Error} If used outside the WordleProvider.
 */
export const useWordle = (): WordleContextType => {
    const context = useContext(WordleContext);
    if (!context) throw new Error('useWordle must be used within a WordleProvider');
    return context;
};

interface Props {
    children: ReactNode;
}

/**
 * Wordle context provider. Wraps app components that need game logic access.
 * @param {Props} props - Component children
 * @returns {JSX.Element} React context provider
 */
export function WordleProvider({ children }: Props): JSX.Element {
    const { allWords, allowedSolutions, letterCounts, isWord, checkWord, loadLongList, loadShortList, removeWord } = useWords();

    const { getWordDeviation, topRanked, getNextBestWord } = useWordEvaluator();

    const {
        current,
        gameData,
        setCurrent,
        setGameData,
        reset,
        backOneStep,
        numberWords,
        changeNumberWords,
        nextWord,
        recalculateWord,
        working,
    } = useGameState(getNextBestWord);

    useEffect(() => {
        if (allWords.length > 0) reset();
    }, [allWords])

    useEffect(() => {
        //if we changed allowed words
        if (gameData.length > 0) {
            let s = [...gameData]
            s[0].inputLists = Array(8).fill([...allowedSolutions])
            setGameData(s)
            for (let i = 0; i < numberWords; i++) {
                const updated = updateAllAccuracy(s, 0, i, -1, 0);
                setGameData(updated);
            }
        }
    }, [allowedSolutions])

    const clearAccuracies = () => {
        const s = [...gameData]
        let t = [];
        for (let index = 0; index < gameData.length; index++) {
            const c = { ...s[index] }
            c.accuracies = Array(8).fill(0).map(() => Array(5).fill(0))
            c.accuracies.forEach(() => Array(5).fill(0))
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

    const value: WordleContextType = {
        current,
        gameData,
        clearAccuracies,
        nextWord,
        recalculateWord,

        updateAccuracy: (wordIndex, position, value) => {
            const updated = updateAllAccuracy(gameData, gameData.length - 1, wordIndex, position, value);
            setGameData(updated);
            setCurrent(updated[updated.length - 1]);
        },
        updateAllAccuracy: (gIndex, wordIndex, position, value) => {
            const updated = updateAllAccuracy(gameData, gIndex, wordIndex, position, value);
            setGameData(updated);
            setCurrent(updated[updated.length - 1]);
        },
        numberWords,
        changeNumberWords: (n) => changeNumberWords(n),

        replaceWord: (word: string) => {
            const s = [...gameData];
            const c: GameStep = JSON.parse(JSON.stringify(s[s.length - 1]));
            c.word = word;
            c.accuracies = Array(8).fill(0).map(() => Array(5).fill(0));
            for (let i = 0; i < numberWords; i++) {
                word.split('').forEach((v, j) => {
                    if (c.matched[i].includes(v)) c.accuracies[i][j] = 1;
                    if (c.exactMatched[i][j] === v) c.accuracies[i][j] = 2;
                });
                updateNextList(c, i);
            }
            s[s.length - 1] = c;
            setGameData(s);
            setCurrent(c);
        },
        checkWord,
        isWord,
        backOneStep,
        getWordDeviation,
        getBestSecondWords: async () => [],
        topRanked,
        reset,
        loadLongList,
        loadShortList,
        letterCounts,
        working,
        removeWord,
    }

    return (
        <WordleContext.Provider value={value}>
            {children}
        </WordleContext.Provider>
    );
}
