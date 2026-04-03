import React, { useState, useEffect, useRef } from 'react';
import { Row, Col, Button, Table } from 'react-bootstrap'
import Quord from './Quord'
import Blossom from '../Blossom/Blossom'
import ProgressBar from './ProgressBar'
import { WordleProvider, useWordle } from './WordleContext'
import { firstGuess } from './Dictionary'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTrashCan } from '@fortawesome/free-solid-svg-icons'
import "../../../css/slider.css"
import "./Wordle.css"

import checkMark from "./checkMark.png?as=png&width=40"

export default function OldWordle() {
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
// Top level quordle/wordle game
// selects between the two
// maintains word/word group visibility
// keeps track of over all progress and best guesses

function WordleCore(props) {
    const { selector } = props
    const {
        gameData, clearAccuracies, replaceWord, clearOthers, checkWord,
        changeNumberWords, numberWords, progress, working, isAWord,
        nextWord, getBestStartWord, getWordDeviation, getBestSecondWords,
        loadLongList, loadShortList, letterCounts
    } = useWordle()

    const [showOkBtn, setShowOkBtn] = useState(true)
    const [editWord, setEditWord] = useState("")
    const [testWord, setTestWord] = useState(firstGuess)
    const [stat, setStat] = useState({ v: 12 })
    const [previousWords, setPreviousWords] = useState([])
    const btnRef = useRef()
    const [word, setWord] = useState("");
    const [cnt, setCnt] = useState(0);

    useEffect(() => {
        if (gameData?.length > 0 && gameData[gameData.length - 1].word)
            setWord(gameData[gameData.length - 1].word)
    }, [gameData])

    useEffect(() => {
        if (isAWord && btnRef.current) btnRef.current.focus()
    }, [isAWord])

    useEffect(() => {
        changeNumberWords(selector == 0 ? 1 : selector == 1 ? 4 : 8)
    }, [selector])

    const startup = async () => {
        switch (cnt) {
            case 0:
                await nextWord()
                break
            case 1:
                replaceWord("MOULT")
                await nextWord()
                break
            case 2:
                replaceWord("KARMA")
                await nextWord()
                break
            case 3:
                replaceWord("KHAKI")
                await nextWord()
                break
            case 4:
                replaceWord("SHORT")
                await nextWord()
                break
            case 5:
                replaceWord("CLANG")
                await nextWord()
                break
            case 6:
                replaceWord("FALAJ")
                await nextWord()
                break
            case 7:
                replaceWord("FOLLY")
                await nextWord()
                break
        }
        setCnt(cnt + 1)
    }


    useEffect(() => {
        if (word?.length === 5) {
            setEditWord(word)
            setShowOkBtn(isAWord)
        }
    }, [word])

    // 
    const addToPreviousWords = () => {
        if (!previousWords.includes(word)) {
            let p = [...previousWords, word]
            while (p.length > 10) p.shift()
            setPreviousWords(p)
        }
    }
    const handleNextWord = () => {
        clearOthers()
        addToPreviousWords()
        nextWord()
    }

    const handleTestWordChange = (e) => {
        setTestWord(e.target.value)
        if (e.target.value.length === 5)
            setStat(getWordDeviation(e.target.value, 0))
    }

    const handleWordChange = (e) => {
        setEditWord(e.target.value)
        if (e.target.value.length === 5 && checkWord(e.target.value.toUpperCase())) {
            setShowOkBtn(true)
            replaceWord(e.target.value.toUpperCase())
        } else {
            setShowOkBtn(false)
        }
    }


    const handleWordBlur = (e) => {

    }

    const secondWords = () => {
        let s = getBestSecondWords()
        console.log(s)
    }

    const switchList = (e) => {
        if (!e.target.checked)
            loadShortList()
        else
            loadLongList()
    }

    return (
        <div>
            <Row style={{ paddingBottom: "10px", paddingTop: '15px' }}>
                <Col xs={4} md={3}>
                    <button
                        style={{ marginRight: "12px", backgroundColor: "lightgreen" }}
                        onClick={() => { handleNextWord() }}
                        ref={btnRef}
                        disabled={!isAWord}
                    >Go</button>
                    {/* <button
                        style={{ backgroundColor: "lightgreen" }}
                        onClick={() => { startup() }}
                    >Load</button> */}
                    {/* {isAWord ? <img style={{ marginLeft: '10px' }} alt='' src={checkMark} width="40" /> : <div style={{ paddingRight: '60px' }}></div>} */}
                    <label>Edit Word:&nbsp;<input
                        style={{ textTransform: "uppercase" }}
                        type="text"
                        size="5"
                        value={editWord}
                        onBlur={handleWordBlur}
                        onChange={handleWordChange}
                    /></label>
                    {showOkBtn ? <img style={{ marginLeft: '10px' }} alt='' src={checkMark} width="40" /> : <div style={{ paddingRight: '60px' }}></div>}
                </Col>
                <Col xs={4} md={3} >
                    <ProgressBar progress={progress} show={working === numberWords} />
                </Col>
                <Col xs={4} md={3} >
                    <label>Long list&nbsp;</label><input type="checkbox" id="loadLongList" name="loadLongList" value="loadLongList" onClick={switchList} />
                </Col>
            </Row>
            {/* <Row style={{ paddingBottom: '20px' }}>
                <Col xs={{ span: 12, offset: 0 }} >
                    {previousWords.map((w, i) => {
                        return <>{i > 0 ? ',' : ''} <span key={i} onClick={() => replaceWord(w)} >{w}</span></>
                    })
                    }
                    {previousWords.length > 0 ?
                        <FontAwesomeIcon
                            onClick={() => { setPreviousWords([]) }}
                            style={{
                                fontSize: "20px",
                                paddingLeft: "20px"
                            }}
                            icon={faTrashCan}
                        /> : null}
                        </Col>
            </Row > */}
            <Row>
                <Col xs={{ span: 12, offset: 0 }}>
                    <Quord />
                </Col>
            </Row>
            <Row>
                <Col xs={{ span: 12, offset: 0 }}>
                    <button onClick={() => { getBestStartWord() }}>Best Start Word</button>
                    <button onClick={() => { secondWords() }}>Best Second Words</button>
                </Col>
            </Row>
            <Row>
                <Col xs={{ span: 12, offset: 0 }}>
                    <input type="text" size="5" value={testWord} onChange={handleTestWordChange} /> Dev:
                    {Math.round(stat.v * 1000) / 1000}
                </Col>
            </Row>
            <Row>
                <Col xs={{ span: 12, offset: 0 }}>
                    <Table>
                        <thead>
                            <tr>
                                <th>Letter</th>
                                {Array(26).fill(0).map((l, i) => {
                                    return <th key={i}>{String.fromCharCode(65 + i)}</th>
                                }
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {Array(5).fill(0).map((m, j) => {
                                return <tr key={j}>
                                    <td>{j + 1}</td>
                                    {Array(26).fill(0).map((l, i) => {
                                        if (Array.isArray(letterCounts))
                                            return <td key={i}>{letterCounts[j][i]}</td>
                                        else
                                            return <td key={i}>E</td>
                                    })}
                                </tr>
                            })}
                            <tr>
                                <td>Total</td>
                                {Array(26).fill(0).map((l, i) => {
                                    if (Array.isArray(letterCounts))
                                        return <td key={i}>{letterCounts[5][i]}</td>
                                    else
                                        return <td key={i}>E</td>
                                })}
                            </tr>
                        </tbody>
                    </Table>
                </Col>
            </Row>
            <Row>
                <Col xs={{ span: 12, offset: 0 }}>
                    <Table>
                        <thead>
                            <tr>
                                <th>Letter</th>
                                {Array(26).fill(0).map((l, i) => {
                                    return <th key={i}>{String.fromCharCode(65 + i)}</th>
                                }
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {Array(5).fill(0).map((m, j) => {
                                return <tr key={j}>
                                    <td>{j + 1}</td>
                                    {Array(26).fill(0).map((l, i) => {
                                        if (Array.isArray(letterCounts))
                                            return <td key={i}>{letterCounts[j + 6][i]}</td>
                                        else
                                            return <td key={i}>E</td>
                                    })}
                                </tr>
                            })}
                            <tr>
                                <td>Total</td>
                                {Array(26).fill(0).map((l, i) => {
                                    if (Array.isArray(letterCounts))
                                        return <td key={i}>{letterCounts[11][i]}</td>
                                    else
                                        return <td key={i}>E</td>
                                })}
                            </tr>
                        </tbody>
                    </Table>
                </Col>
            </Row>
        </div>
    )
}
