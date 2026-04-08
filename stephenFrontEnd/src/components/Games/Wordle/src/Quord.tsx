/**
 * Quord.jsx
 * Displays the full word board and interactive results, graphs, and stats.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Row, Col, Button } from 'react-bootstrap';
import _ from 'lodash';

import TopWordsTable from './TopWordsTable';
import WordGame from './WordGame';
import { useWordle } from '../context/WordleContext';
import './Wordle.css';

/**
 * Visual interface for playing Wordle, Quordle, Octordle variants.
 * Handles word table display and dynamic list resizing.
 * @returns {JSX.Element}
 */
export default function Quord() {
    const [tableColumns, setTableColumns] = useState(0);
    const [hoveredList, setHoveredList] = useState([]);
    const [renderList, setRenderList] = useState(null);

    const tableRef = useRef();
    const { gameData, distribution, replaceWord, backOneStep, reset } = useWordle();
    const [current, setCurrent] = useState(null);

    useEffect(() => {
        if (gameData?.length > 0) {
            setCurrent(gameData[gameData.length - 1]);
        }
    }, [gameData]);

    useEffect(() => {
        const resizeAndDraw = () => {
            const container = tableRef.current;
            if (container) {
                setTableColumns(Math.floor(container.clientWidth / 60));
            }
        };
        resizeAndDraw();
        window.addEventListener("resize", resizeAndDraw);
        return () => window.removeEventListener("resize", resizeAndDraw);
    }, []);

    /**
     * Breaks an array into rows of size `size`.
     * @param {Array} arr - The array to chunk.
     * @param {number} size - Items per chunk.
     * @returns {Array[]} - Chunked array.
     */
    function chunkArrayInGroups(arr, size) {
        const myArray = [];
        for (let i = 0; i < arr.length; i += size) {
            myArray.push(arr.slice(i, i + size));
        }
        return myArray;
    }

    return (
        <>
            <WordGame />
            <Row className="mb-3">
                <Col xs={12} md={6}>
                    <Button
                        className="btn btn-warning btn-sm me-2"
                        onClick={backOneStep}
                    >
                        Back
                    </Button>
                    <Button
                        className="btn btn-info btn-sm"
                        onClick={reset}
                    >
                        New Game
                    </Button>
                </Col>
            </Row>
            {gameData?.length > 1 && <TopWordsTable
                distribution={distribution}
                current={current}
                replaceWord={replaceWord}
            />}
        </>
    );
}


