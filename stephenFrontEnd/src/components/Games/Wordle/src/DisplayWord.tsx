/**
 * DisplayWord.jsx
 * Shows an interactive 5-letter word input row for each gameData entry.
 */

import React from 'react';
import { useWordle } from '../context/WordleContext';
import LetterCell from './Cells';
import './Wordle.css';

interface Props {
    wordIndex: number;
}

export default function DisplayWord({ wordIndex }: Props) {
    const { gameData, updateAllAccuracy, current } = useWordle();

    const handleClick = (j, i) => {
        console.log("clicked", j, i);
        const accuracy = gameData[j].accuracies[wordIndex][i];
        updateAllAccuracy(j, wordIndex, i, accuracy !== 1 ? 1 : 0);
    };

    const handleRightClick = (e, j, i) => {
        consol.log("right clicked", j, i);
        e.preventDefault();
        const accuracy = gameData[j].accuracies[wordIndex][i];
        updateAllAccuracy(j, wordIndex, i, accuracy !== 2 ? 2 : 0);
    };

    return (
        <>
            {gameData?.map((entry, j) => (
                j === gameData.length - 1 || entry.finished[wordIndex] ? null : (
                    <div key={j} className="display-word-row">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <LetterCell
                                key={i}
                                letter={entry.word[i]}
                                accuracy={entry.accuracies[wordIndex][i]}
                                greyed={entry.greyed[wordIndex]}
                                onClick={() => handleClick(j, i)}
                                onRightClick={(e) => handleRightClick(e, j, i)}
                            />
                        ))}
                    </div>
                )
            ))}
        </>
    );
}
