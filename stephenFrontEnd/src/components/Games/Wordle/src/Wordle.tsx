import React, { useState, useEffect, useRef } from 'react';
import { Row, Col, Button, Table } from 'react-bootstrap'
import Quord from './Quord'
import Blossom from '../../Blossom/Blossom'
import ProgressBar from './ProgressBar'
import { WordleProvider, useWordle } from '../context/WordleContext'
import { firstGuess } from './Guesses'
import "./Wordle.css"

import checkMark from "../images/checkMark.png?as=png&width=40"

/**
 * Top-level component to toggle between Wordle, Quordle, Octordle, and Blossom games.
 * Maintains selection state and wraps Wordle-based games in context provider.
 *
 * @returns {JSX.Element} The rendered Wordle selection UI and game display.
 */
export default function Wordle() {
    const [selector, setSelector] = useState(0)

    return (
        <>
            <div className="selector">
                <span onClick={() => setSelector(0)} style={{ backgroundColor: selector == 0 ? "lightblue" : "beige" }}>Wordle</span>
                <span onClick={() => setSelector(1)} style={{ backgroundColor: selector == 1 ? "lightblue" : "beige" }}>Quordle</span>
                <span onClick={() => setSelector(2)} style={{ backgroundColor: selector == 2 ? "lightblue" : "beige" }}>Octordle</span>
                <span onClick={() => setSelector(3)} style={{ backgroundColor: selector == 3 ? "lightblue" : "beige" }}>Blossom</span>
            </div>
            {selector < 3 ?
                <WordleProvider>
                    <WordleCore selector={selector} />
                </WordleProvider> :
                <Blossom />
            }
        </>
    )
}

interface WordleCoreProps {
    selector: number;
}

/**
 * Core component for Wordle, Quordle, and Octordle logic and UI.
 * Handles user interactions, word selection, testing, and visualization.
 *
 * @param {Object} props - Component props.
 * @param {number} props.selector - Indicates which game variant is selected (0 = Wordle, 1 = Quordle, 2 = Octordle).
 * @returns {JSX.Element} The rendered game interface and tools.
 */
function WordleCore({ selector }: WordleCoreProps) {
    const {
        gameData, replaceWord, checkWord,
        changeNumberWords, isWord,
        nextWord, getBestStartWord, getWordDeviation, getBestSecondWords,
        loadLongList, loadShortList, letterCounts
    } = useWordle()

    const [editWord, setEditWord] = useState("")
    const [testWord, setTestWord] = useState(firstGuess)
    // const [word, setWord] = useState("");

    const [stat, setStat] = useState({ v: 12 })
    const [previousWords, setPreviousWords] = useState([])
    const btnRef = useRef()

    useEffect(() => {
        if (gameData?.length > 0 && gameData[gameData.length - 1].word)
            setEditWord(gameData[gameData.length - 1].word)
    }, [gameData])

    useEffect(() => {
        if (isWord && btnRef.current) btnRef.current.focus()
    }, [isWord])

    useEffect(() => {
        changeNumberWords(selector == 0 ? 1 : selector == 1 ? 4 : 8)
    }, [selector])

    // useEffect(() => {
    //     if (word?.length === 5) {
    //         setEditWord(word)
    //     }
    // }, [word])

    /**
     * Adds the current word to the list of previously used words,
     * ensuring a maximum of 10 entries.
     */
    const addToPreviousWords = () => {
        if (!previousWords.includes(editWord)) {
            let p = [...previousWords, editWord]
            while (p.length > 10) p.shift()
            setPreviousWords(p)
        }
    }

    /**
     * Clears other guesses and proceeds to the next word.
     */
    const handleNextWord = () => {
        addToPreviousWords()
        nextWord()
    }

    /**
     * Handles test word input change and updates its deviation stat.
     * @param {React.ChangeEvent<HTMLInputElement>} e - The input event.
     */
    const handleTestWordChange = (e) => {
        setTestWord(e.target.value)
        if (e.target.value.length === 5)
            setStat(getWordDeviation(e.target.value, 0))
    }

    /**
     * Handles the editing of the current word and replaces it if valid.
     * @param {React.ChangeEvent<HTMLInputElement>} e - The input event.
     */
    const handleWordChange = (e) => {
        setEditWord(e.target.value)
        if (e.target.value.length === 5 && checkWord(e.target.value.toUpperCase())) {
            replaceWord(e.target.value.toUpperCase())
        } else {
        }
    }

    /**
     * Logs best second words to the console.
     */
    const secondWords = () => {
        let s = getBestSecondWords()
        console.log(s)
    }

    /**
     * Switches between long and short word lists based on checkbox state.
     * @param {React.MouseEvent<HTMLInputElement>} e - The event triggered by clicking the checkbox.
     */
    const switchList = (e) => {
        if (!e.target.checked)
            loadShortList()
        else
            loadLongList()
    }

    /**
     * Blurs the word input (no-op handler).
     */
    const handleWordBlur = () => { }

    return (
        <div>
            {/* Game Controls */}
            <Row style={{ paddingBottom: "10px", paddingTop: '15px' }}>
                <Col xs={4} md={3}>
                    <button
                        style={{ marginRight: "12px", backgroundColor: "lightgreen" }}
                        onClick={() => { handleNextWord() }}
                        ref={btnRef}
                        disabled={!isWord}
                    >Go</button>
                    <label>Edit Word:&nbsp;<input
                        style={{ textTransform: "uppercase" }}
                        type="text"
                        size="5"
                        value={editWord}
                        onBlur={handleWordBlur}
                        onChange={handleWordChange}
                    /></label>
                    {isWord ? <img style={{ marginLeft: '10px' }} alt='' src={checkMark} width="40" /> : <div style={{ paddingRight: '60px' }}></div>}
                </Col>
                <Col xs={4} md={3} >
                    <ProgressBar />
                </Col>
                <Col xs={4} md={3} >
                    <label>Long list&nbsp;</label><input type="checkbox" id="loadLongList" name="loadLongList" value="loadLongList" onClick={switchList} />
                </Col>
            </Row>

            {/* Quord Display */}
            <Row>
                <Col xs={{ span: 12, offset: 0 }}>
                    <Quord />
                </Col>
            </Row>

            {/* Word Tools */}
            <Row style={{ border: '1px solid black' }}>
                <Col xs={{ span: 12, offset: 0 }}>
                    <button style={{ marginRight: '15px' }} onClick={() => { getBestStartWord() }}>Best Start Word</button>
                    <button onClick={() => { secondWords() }}>Best Second Words</button>
                </Col>
            </Row>

            {/* Word Deviation Display */}
            <Row style={{ padding: '15px', border: '1px solid black' }}>
                <Col xs={{ span: 12, offset: 0 }}>
                    <input style={{ marginRight: '15px' }} type="text" size="5" value={testWord} onChange={handleTestWordChange} />Dev:{Math.round(stat.v * 1000) / 1000}
                </Col>
            </Row>

            {/* Letter Count Table: Wordle Grid 1 */}
            <Row>
                <Col xs={{ span: 12, offset: 0 }}>
                    <Table>
                        <thead>
                            <tr>
                                <th>Letter</th>
                                {Array(26).fill(0).map((_, i) => <th key={i}>{String.fromCharCode(65 + i)}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {Array(5).fill(0).map((_, j) => (
                                <tr key={j}>
                                    <td>{j + 1}</td>
                                    {Array(26).fill(0).map((_, i) =>
                                        <td key={i}>{Array.isArray(letterCounts) ? letterCounts[j][i] : "E"}</td>
                                    )}
                                </tr>
                            ))}
                            <tr>
                                <td>Total</td>
                                {Array(26).fill(0).map((_, i) =>
                                    <td key={i}>{Array.isArray(letterCounts) ? letterCounts[5][i] : "E"}</td>
                                )}
                            </tr>
                        </tbody>
                    </Table>
                </Col>
            </Row>

            {/* Letter Count Table: Wordle Grid 2 */}
            <Row>
                <Col xs={{ span: 12, offset: 0 }}>
                    <Table>
                        <thead>
                            <tr>
                                <th>Letter</th>
                                {Array(26).fill(0).map((_, i) => <th key={i}>{String.fromCharCode(65 + i)}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {Array(5).fill(0).map((_, j) => (
                                <tr key={j}>
                                    <td>{j + 1}</td>
                                    {Array(26).fill(0).map((_, i) =>
                                        <td key={i}>{Array.isArray(letterCounts) ? letterCounts[j + 6][i] : "E"}</td>
                                    )}
                                </tr>
                            ))}
                            <tr>
                                <td>Total</td>
                                {Array(26).fill(0).map((_, i) =>
                                    <td key={i}>{Array.isArray(letterCounts) ? letterCounts[11][i] : "E"}</td>
                                )}
                            </tr>
                        </tbody>
                    </Table>
                </Col>
            </Row>
        </div>
    )
}
