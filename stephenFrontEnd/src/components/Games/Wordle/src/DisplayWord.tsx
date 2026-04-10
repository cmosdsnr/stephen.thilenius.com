/**
 * @file DisplayWord.tsx
 * @description Renders interactive 5-letter accuracy rows for historical game steps.
 *
 * Each row shows one past guess word with color-coded letter cells that the user
 * can click to correct. This component is an alternative to {@link WordCell} — it
 * maps directly over `gameData` rather than being driven by `rowIndex` props.
 *
 * NOTE: This component has a typo on line 25 (`consol.log` instead of `console.log`)
 * which will throw a ReferenceError on right-click. Fix before enabling right-click.
 */

import React from 'react';
import { useWordle } from '../context/WordleContext';
import LetterCell from './Cells';
import './Wordle.css';

interface Props {
    /** Index of the target word column (0 for Wordle, 0–3 for Quordle, 0–7 for Octordle). */
    wordIndex: number;
}

/**
 * Renders all historical (non-current, non-finished) guess rows for one target word column.
 *
 * Each letter cell responds to left-click (toggle yellow) and right-click (toggle green).
 * Clicking calls `updateAllAccuracy`, which recalculates the filtered word lists for
 * subsequent steps.
 *
 * @param {Props} props
 * @param {number} props.wordIndex - Which target word column to display.
 * @returns {JSX.Element} A series of 5-cell rows for past guesses.
 */
export default function DisplayWord({ wordIndex }: Props) {
    const { gameData, updateAllAccuracy, current } = useWordle();

    /**
     * Toggles a letter between gray (0) and yellow (1) on left-click.
     * @param {number} j - Row index in gameData.
     * @param {number} i - Letter position (0–4).
     */
    const handleClick = (j: number, i: number) => {
        const accuracy = gameData[j].accuracies[wordIndex][i];
        updateAllAccuracy(j, wordIndex, i, accuracy !== 1 ? 1 : 0);
    };

    /**
     * Toggles a letter between gray (0) and green (2) on right-click.
     * @param {React.MouseEvent} e - The mouse event (preventDefault suppresses browser menu).
     * @param {number} j - Row index in gameData.
     * @param {number} i - Letter position (0–4).
     */
    const handleRightClick = (e: React.MouseEvent, j: number, i: number) => {
        e.preventDefault();
        const accuracy = gameData[j].accuracies[wordIndex][i];
        updateAllAccuracy(j, wordIndex, i, accuracy !== 2 ? 2 : 0);
    };

    return (
        <>
            {gameData?.map((entry, j) => (
                // Skip the last (current) row and any already-finished rows
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
