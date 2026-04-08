
/**
 * LetterCell.jsx
 * Unified component for letter display in current and past guesses.
 */

import React from 'react';
import './Wordle.css';
import { useWordle } from '../context/WordleContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRefresh } from '@fortawesome/free-solid-svg-icons'

interface LetterCellProps {
    letter?: string;
    accuracy?: number;
    greyed?: boolean;
    onClick?: () => void;
    onRightClick?: (e: React.MouseEvent) => void;
}

/**
 * A reusable letter cell representing one letter's accuracy.
 * Supports left- and right-click interactions for marking status.
 *
 * @component
 * @param {Object} props
 * @param {string} props.letter - The letter to display (A–Z).
 * @param {number} props.accuracy - The accuracy (0 = incorrect, 1 = wrong place, 2 = correct).
 * @param {boolean} props.greyed - If true, cell background is greyed out.
 * @param {Function} props.onClick - Handler for left click.
 * @param {Function} props.onRightClick - Handler for right click.
 * @returns {JSX.Element}
 */
export function LetterCell({
    letter = '',
    accuracy = 0,
    greyed = false,
    onClick = () => { },
    onRightClick = () => { },
}: LetterCellProps) {
    const backgroundColor = greyed ? 'grey' : ['white', 'gold', 'lightgreen'][accuracy] || 'white';

    return (
        <span
            className="letter-cell"
            style={{ backgroundColor }}
            onClick={onClick}
            onContextMenu={onRightClick}
        >
            {letter}
        </span>
    );
}

interface WordCellProps {
    wordIndex?: number;
    rowIndex?: number;
    children?: React.ReactNode;
}

/**
 * WordCell
 * Renders a single row of five LetterCells for a specific word guess.
 *
 * @component
 * @param {Object} props
 * @param {number} props.wordIndex - The index of the word across columns.
 * @param {number} props.rowIndex - The index of the row (historical or active entry).
 * @returns {JSX.Element}
 */
export function WordCell({ wordIndex = 0, rowIndex = 0, children }: WordCellProps) {
    const { gameData, updateAllAccuracy } = useWordle();
    const { word, accuracies, greyed } = gameData[rowIndex];
    const accuracy = accuracies[wordIndex];
    const isGreyed = greyed[wordIndex];

    const handleClick = (i) => {
        updateAllAccuracy(rowIndex, wordIndex, i, accuracy[i] !== 1 ? 1 : 0);
    };

    const handleRightClick = (e, i) => {
        e.preventDefault();
        updateAllAccuracy(rowIndex, wordIndex, i, accuracy[i] !== 2 ? 2 : 0);
    };

    return (
        <div className="display-word-row">
            {Array.from({ length: 5 }).map((_, i) => (
                <LetterCell
                    key={i}
                    letter={word[i]}
                    accuracy={accuracy[i]}
                    greyed={isGreyed}
                    onClick={() => handleClick(i)}
                    onRightClick={(e) => handleRightClick(e, i)}
                />
            ))}
            {children}
        </div>
    );
}

interface WordColumnProps {
    wordIndex?: number;
    children?: React.ReactNode;
}

/**
 * WordColumn
 * Renders a vertical stack of WordCell components representing guesses for a word.
 *
 * @component
 * @param {Object} props
 * @param {number} [props.wordIndex=0] - Which word this column represents.
 * @param {React.ReactNode} props.children - Custom row (e.g. input) to show only on last entry.
 * @returns {JSX.Element}
 */
export default function WordColumn({ wordIndex = 0, children }: WordColumnProps) {
    const { gameData, isAWord, recalculateWord } = useWordle();

    const handleNextWord = () => {
        recalculateWord()
    }

    return (
        <>
            {gameData?.map((entry, j) => (
                entry.finished[wordIndex] ? null : (
                    <React.Fragment key={j}>
                        {j === gameData.length - 1 && children}
                        <WordCell wordIndex={wordIndex} rowIndex={j} >
                            {j === gameData.length - 1 && wordIndex == 0 ? (
                                <span
                                    style={{ marginLeft: "10px" }}
                                    onClick={() => { handleNextWord() }}
                                    disabled={!isAWord}
                                >
                                    <FontAwesomeIcon style={{ fontSize: "20px" }} spin icon={faRefresh} />
                                </span>
                            ) : (
                                <span style={{ width: "30px", display: "inline-block" }}>
                                </span>
                            )}
                        </WordCell>
                    </React.Fragment>
                )
            ))}
        </>
    );
}
