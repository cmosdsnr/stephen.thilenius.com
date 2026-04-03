import React, { useRef, useState, useEffect } from 'react';
import { Col, Overlay, Popover } from 'react-bootstrap';
import _ from 'lodash';
import { useWordle } from '../context/WordleContext';
import { evaluate } from "../workers/evaluate";

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
 * Props for the InputWordPopover component.
 */
type InputWordPopoverProps = {
    wordIndex: number;
};

/**
 * Returns a background color based on deviation.
 * Lower = green, higher = red.
 * @param deviation - A numeric deviation between 0 and max
 * @param max - The max deviation in the current list
 */
function getHeatmapColor(deviation: number, max: number): string {
    const ratio = max > 0 ? deviation / max : 0;
    const hue = 120 - Math.min(Math.max(ratio, 0), 1) * 120; // 120 (green) → 0 (red)
    return `hsl(${hue}, 70%, 80%)`;
}

/**
 * Evaluate a word and return its ranking based on current game state.
 */
const getDeviation = (w: string, list: string[], valueMap: number[][]): RankedGuess => {
    let stats: Stats = evaluate(list, [w], valueMap);
    return stats.topRanked[0];
};

/**
 * Displays a column-centered summary of input suggestions, sorted by deviation.
 * If the list is long (30+ words), shows an interactive, scrollable popover on hover.
 * If the list is short, renders inline clickable suggestions with optional deviation values.
 *
 * @param props - Component props
 * @returns JSX.Element
 */
export function InputWordPopover({
    wordIndex
}: InputWordPopoverProps) {
    const [show, setShow] = useState(false);
    const [sorted, setSorted] = useState<{ word: string; deviation: number }[]>([]);
    const [maxDeviation, setMaxDeviation] = useState(1);
    const target = useRef<HTMLDivElement>(null);

    const { current, replaceWord } = useWordle();
    const words = current?.inputLists[wordIndex] || [];
    const letterValue = current?.letterValue || [];

    const handleMouseEnter = () => {
        setShow(words.length >= 30);
    };

    const handleMouseLeave = () => {
        setShow(false);
    };

    // Reset sorted cache if inputs change
    useEffect(() => {
        if (!current) return;
        const words = current.inputLists[wordIndex] || [];
        const letterValue = current.letterValue;
        const calculated = [...words].slice(0, 500)
            .map(word => ({ word, deviation: getDeviation(word, words, letterValue).std }))
            .sort((a, b) => a.deviation - b.deviation);

        setSorted(calculated);
        setMaxDeviation(calculated[calculated.length - 1]?.deviation || 1);
    }, [current, wordIndex]);

    const popover = (
        <Popover id={`popover-input-${wordIndex}`} style={{ minWidth: '300px' }}>
            <Popover.Header as="h3">Possible Words BEFORE</Popover.Header>
            <Popover.Body
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                style={{
                    maxHeight: '60vh',
                    overflowY: 'auto',
                }}
            >
                <table className="table table-sm table-bordered mb-0">
                    <tbody>
                        {_.chunk(sorted, 5).map((chunk, rowIdx) => (
                            <tr key={rowIdx}>
                                {chunk.map(({ word, deviation }, colIdx) => (
                                    <td
                                        key={colIdx}
                                        style={{
                                            cursor: "pointer",
                                            padding: "2px",
                                            fontSize: "0.85em",
                                            backgroundColor: getHeatmapColor(deviation, maxDeviation),
                                        }}
                                        onClick={() => replaceWord(word)}
                                    >
                                        {word} ({deviation.toFixed(3)})
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
                <div>Possible Words BEFORE: {words.length}</div>
                {!show && (
                    <div style={{ fontSize: "0.85em" }}>
                        {[...words]
                            .map(word => ({ word, deviation: getDeviation(word, words, letterValue).std }))
                            .sort((a, b) => a.deviation - b.deviation)
                            .slice(0, 8)
                            .map(({ word, deviation }, i, arr) =>
                                i % 5 === 4 || i === arr.length - 1
                                    ? (
                                        <span
                                            key={i}
                                            onClick={() => replaceWord(word)}
                                            style={{
                                                backgroundColor: getHeatmapColor(deviation, deviation),
                                                padding: "2px",
                                                borderRadius: "3px",
                                                marginRight: "4px"
                                            }}
                                        >
                                            {word}<br />
                                        </span>
                                    )
                                    : (
                                        <span
                                            key={i}
                                            onClick={() => replaceWord(word)}
                                            style={{
                                                backgroundColor: getHeatmapColor(deviation, deviation),
                                                padding: "2px",
                                                borderRadius: "3px",
                                                marginRight: "4px"
                                            }}
                                        >
                                            {word},
                                        </span>
                                    )
                            )}
                    </div>
                )}
            </div>

            {show && (
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