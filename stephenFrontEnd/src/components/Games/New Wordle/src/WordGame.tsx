/**
 * Word.jsx
 * Displays current Wordle guesses, suggestions, and letter accuracy inputs for each word.
 */

import React, { useState, useEffect } from 'react';
import { Row, Col } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBroom } from '@fortawesome/free-solid-svg-icons'

import { useWordle } from '../context/WordleContext';
import WordColumn from './Cells';
import ProgressBar from './ProgressBar';
import { WordListPopover, InputWordPopover } from './WordListPopover';
import './Wordle.css';

/**
 * Word-level interface showing accuracy inputs, suggestions, and next guess action.
 * @returns {JSX.Element}
 */
export default function WordGame() {
    const [beforeHeight, setBeforeHeight] = useState(0);
    const {
        gameData,
        current,
        progress,
        recalculateWord,
        numberWords,
        replaceWord,
        getWordDeviation,
        clearAccuracies,
        updateAccuracy,
        isAWord,
    } = useWordle();

    useEffect(() => {
        let height = 0;
        for (let i of current.inputLists) {
            if (i.length < 30 && i.length > height) height = i.length;
        }
        height = Math.floor(height / 6) + 4;
        height *= 14;
        height += 20; // Add some extra space for the popover
        setBeforeHeight(height);
    }, [JSON.stringify(current.inputLists)]);

    return (
        <>
            <Row>
                {gameData?.length > 1 && (
                    <Col xs={12} sm={6} lg={3}>
                        <FontAwesomeIcon
                            onClick={clearAccuracies}
                            className="clear-icon"
                            icon={faBroom}
                        />
                    </Col>
                )}
            </Row>
            <Row className="word-input-row">
                {Array.from({ length: numberWords }).map((_, j) => (
                    <React.Fragment key={j}>
                        <Col xs={12} sm={6} lg={3} >
                            <WordColumn wordIndex={j}>
                                {(current?.inputLists[j]?.length > 0 && !current?.finished[j]) && (
                                    <div className="suggestion-list" style={{ height: beforeHeight }}>
                                        {current?.inputLists[j].length > 0 && (
                                            <InputWordPopover wordIndex={j} />
                                        )}
                                    </div>
                                )}
                            </WordColumn>
                            <WordListPopover
                                bestGuess={current?.individualBestGuess[j]}
                                words={current?.outputLists[j]}
                                replaceWord={replaceWord}
                                index={j}
                            />
                        </Col>
                    </React.Fragment>
                ))}

            </Row>
            <Row>
                <ProgressBar />
            </Row>
        </>
    );
}
