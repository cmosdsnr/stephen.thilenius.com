import React, { useRef, useState, useEffect } from 'react';
import { Col, Overlay, Popover } from 'react-bootstrap';
import _ from 'lodash';
import { useWordle } from '../context/WordleContext';
import { evaluate } from "../workers/evaluate";
import { RankedGuess, Stats } from '../context/types';

type Props = {
    bestGuess?: string;
    words?: string[];
    replaceWord: (word: string) => void;
    index: number;
};

/**
 * Displays best guess and possible word count, with a hoverable popover if list is long.
 */
export function WordListPopover({ bestGuess, words = [], replaceWord, index }: Props) {
    const [show, setShow] = useState(false);
    const target = useRef<HTMLDivElement>(null);

    const shouldShowPopover = words.length >= 50;

    const handleMouseEnter = () => shouldShowPopover && setShow(true);
    const handleMouseLeave = () => setShow(false);

    const popover = (
        <Popover id={`popover-outputlist-${index}`} style={{ minWidth: '300px' }}>
            <Popover.Header as="h3">Words List</Popover.Header>
            <Popover.Body onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
                <table className="table table-sm table-bordered mb-0">
                    <tbody>
                        {_.chunk(words, 5).map((chunk, rowIdx) => (
                            <tr key={rowIdx}>
                                {chunk.map((word, colIdx) => (
                                    <td
                                        key={colIdx}
                                        style={{ cursor: "pointer", padding: "2px" }}
                                        onClick={() => replaceWord(word)}
                                    >
                                        {word}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Popover.Body>
        </Popover>
    );

    return (
        <Col xs={12} className="text-center">
            <div
                ref={target}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                style={{ marginBottom: "20px", display: "inline-block" }}
            >
                {bestGuess?.length ? (
                    <>
                        Best Guess: <span>{bestGuess}</span><br />
                    </>
                ) : null}
                Possible Words:&nbsp;&nbsp;{words.length}<br />
                {!shouldShowPopover && words.map((w, i) =>
                    i === words.length - 1
                        ? <span key={i}>{w}</span>
                        : <span key={i} onClick={() => replaceWord(w)}>{w}, </span>
                )}
            </div>

            {shouldShowPopover && (
                <Overlay
                    target={target.current}
                    show={show}
                    placement="right"
                    containerPadding={10}
                >
                    {popover}
                </Overlay>
            )}
        </Col>
    );
}


/**
 * Returns a background color based on deviation.
 * Lower = green, higher = red.
 */
function getHeatmapColor(deviation: number, max: number): string {
    const ratio = max > 0 ? deviation / max : 0;
    const hue = 120 - Math.min(Math.max(ratio, 0), 1) * 120;
    return `hsl(${hue}, 70%, 80%)`;
}

/**
 * Evaluate a word and return its deviation score.
 */
const getDeviation = (w: string, list: string[], valueMap: number[][]): RankedGuess => {
    const stats: Stats = evaluate(list, [w], valueMap);
    return stats.topRanked[0];
};

/**
 * Props for the InputWordPopover component.
 */
type InputWordPopoverProps = {
    wordIndex: number;
};

/**
 * Displays a count of possible words before this guess, with a small inline preview.
 */
export function InputWordPopover({ wordIndex }: InputWordPopoverProps) {
    const [sorted, setSorted] = useState<{ word: string; deviation: number }[]>([]);
    const [maxDeviation, setMaxDeviation] = useState(1);

    const { current, replaceWord } = useWordle();
    const words = current?.inputLists[wordIndex] || [];

    useEffect(() => {
        if (!current) return;
        const words = current.inputLists[wordIndex] || [];
        const letterValue = current.letterValue;
        const calculated = [...words].slice(0, 500)
            .map(word => ({ word, deviation: getDeviation(word, words, letterValue).score }))
            .sort((a, b) => a.deviation - b.deviation);
        setSorted(calculated);
        setMaxDeviation(calculated[calculated.length - 1]?.deviation || 1);
    }, [current, wordIndex]);

    return (
        <Col xs={12} className="text-center">
            <div style={{ marginBottom: "20px", display: "inline-block" }}>
                <div>Possible Words BEFORE: {words.length}</div>
                <div style={{ fontSize: "0.85em" }}>
                    {sorted.slice(0, 8).map(({ word, deviation }, i, arr) => (
                        <span
                            key={i}
                            onClick={() => replaceWord(word)}
                            style={{
                                backgroundColor: getHeatmapColor(deviation, maxDeviation),
                                padding: "2px",
                                borderRadius: "3px",
                                marginRight: "4px",
                                cursor: "pointer",
                            }}
                        >
                            {word}{i < arr.length - 1 && i % 5 !== 4 ? ',' : ''}
                            {i % 5 === 4 ? <br /> : ''}
                        </span>
                    ))}
                </div>
            </div>
        </Col>
    );
}

/**
 * Props for PossibleWordsTable.
 */
type PossibleWordsTableProps = {
    wordIndex: number;
};

/**
 * Full inline table of possible words before the current guess, sorted by deviation score.
 * Color-coded green (low deviation = better guess) to red (high deviation).
 * Click a word to use it as the current guess.
 */
export function PossibleWordsTable({ wordIndex }: PossibleWordsTableProps) {
    const [sorted, setSorted] = useState<{ word: string; deviation: number }[]>([]);
    const [maxDeviation, setMaxDeviation] = useState(1);

    const { current, replaceWord } = useWordle();
    const words = current?.inputLists[wordIndex] || [];

    useEffect(() => {
        if (!current) return;
        const words = current.inputLists[wordIndex] || [];
        const letterValue = current.letterValue;
        const calculated = [...words].slice(0, 500)
            .map(word => ({ word, deviation: getDeviation(word, words, letterValue).score }))
            .sort((a, b) => a.deviation - b.deviation);
        setSorted(calculated);
        setMaxDeviation(calculated[calculated.length - 1]?.deviation || 1);
    }, [current, wordIndex]);

    if (sorted.length === 0) return null;

    const COLS = 6;
    const rows = _.chunk(sorted, COLS);

    return (
        <table className="table table-sm table-bordered mb-0" style={{ fontSize: '0.85em' }}>
            <thead className="table-dark">
                <tr>
                    {Array(COLS).fill(0).map((_, i) => (
                        <React.Fragment key={i}>
                            <th>Word</th>
                            <th>Dev</th>
                        </React.Fragment>
                    ))}
                </tr>
            </thead>
            <tbody>
                {rows.map((chunk, rowIdx) => (
                    <tr key={rowIdx}>
                        {chunk.map(({ word, deviation }, colIdx) => (
                            <React.Fragment key={colIdx}>
                                <td
                                    style={{
                                        cursor: 'pointer',
                                        backgroundColor: getHeatmapColor(deviation, maxDeviation),
                                        padding: '2px 4px',
                                        fontWeight: 'bold',
                                    }}
                                    onClick={() => replaceWord(word)}
                                >
                                    {word}
                                </td>
                                <td style={{ padding: '2px 4px', backgroundColor: getHeatmapColor(deviation, maxDeviation) }}>
                                    {deviation.toFixed(3)}
                                </td>
                            </React.Fragment>
                        ))}
                        {/* pad incomplete last row */}
                        {chunk.length < COLS && Array(COLS - chunk.length).fill(0).map((_, i) => (
                            <React.Fragment key={`pad-${i}`}><td /><td /></React.Fragment>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    );
}
