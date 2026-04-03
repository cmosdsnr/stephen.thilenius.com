import React, { useState, useEffect } from 'react';
import { Row, Col } from 'react-bootstrap'
import LetterBox from './LetterBox'
import ProgressBar from './ProgressBar'
import { useWordle } from './WordleContext'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faRefresh, faBroom } from '@fortawesome/free-solid-svg-icons'
import DisplayWord from './DisplayWord';



export default function Word(props) {
    const { } = props

    const [focusJ, setFocusJ] = useState(-1)
    const [beforeHeight, setBeforeHeight] = useState(0)

    const { gameData, current, progress, working, clearOthers, recalculateWord, isAWord, numberWords, replaceWord, getWordDeviation, clearAccuracies } = useWordle()

    const handleNextWord = () => {
        clearOthers()   // clear the other options list
        recalculateWord()
    }

    useEffect(() => {
        let height = 0
        for (let i of current.inputLists) { if (i.length < 30 && i.length > height) height = i.length }
        height = parseInt(height / 6) + 4
        height *= 14
        setBeforeHeight(height)
        console.log("height:", height)
    }, [JSON.stringify(current.inputLists)])


    return (
        <>
            <Row>
                {gameData?.length > 1 &&
                    <Col xs={12} sm={6} lg={3}>
                        <FontAwesomeIcon
                            onClick={clearAccuracies}
                            style={{
                                fontSize: "20px",
                                margin: "0 auto",
                                display: "table",
                                marginBottom: "10px"
                            }}
                            icon={faBroom}
                        />
                    </Col>
                }
            </Row>
            <Row style={{ display: "flex", flexDirection: "row" }}>
                {
                    Array.apply(null, Array(numberWords)).map((n, j) => {
                        let r = 0
                        if (Array.isArray(current?.inputLists))
                            for (let i = 0; i < current.inputLists.length; i++)
                                if (current.inputLists[i].length === 0 || current.finished[i]) r++
                                else break;

                        return (
                            <Col key={j} xs={12} sm={6} lg={3}>
                                <Row>
                                    <center>
                                        <DisplayWord wordIndex={j} />
                                        {current?.inputLists[j].length === 0 || current?.finished[j] ? <div style={{ height: 40 }}></div> :
                                            <>
                                                <Col xs={12} style={{ marginBottom: "20px", fontSize: "12px", height: beforeHeight }}>

                                                    {current?.inputLists[j].length > 0 ? <>
                                                        Possible Words BEFORE:&nbsp;&nbsp; {current?.inputLists[j] ? current.inputLists[j].length : 0}<br />
                                                    </> : <></>}
                                                    {current?.inputLists[j].length < 30 ?
                                                        current?.inputLists[j]?.length <= 8 ?
                                                            current.inputLists[j].map((w, i) =>
                                                                i % 2 === 1 ?
                                                                    <span key={i} onClick={() => replaceWord(w)}>{w} ({Math.floor(1000 * getWordDeviation(w, j).v) / 1000})<br /></span> :
                                                                    <span key={i} onClick={() => replaceWord(w)}>{w} ({Math.floor(1000 * getWordDeviation(w, j).v) / 1000}), </span>
                                                            ) :
                                                            current.inputLists[j].map((w, i) =>
                                                                i === current?.inputLists[j].length - 1 ?
                                                                    <span key={i} onClick={() => replaceWord(w)}>{w}</span> :
                                                                    <span key={i} onClick={() => replaceWord(w)}>{w}, </span>
                                                            ) :
                                                        <></>
                                                    }
                                                </Col>
                                                <Col xs={12}>
                                                    {
                                                        Array.apply(null, Array(5)).map((l, i) => {
                                                            return (
                                                                <LetterBox
                                                                    key={i}
                                                                    letterIndex={i}
                                                                    wordIndex={j}
                                                                />
                                                            )
                                                        })
                                                    }
                                                    <span
                                                        style={{ border: "none", marginLeft: "10px" }}
                                                        onClick={() => { handleNextWord() }}
                                                        disabled={!isAWord}
                                                    >
                                                        {j > r ? <></> : <FontAwesomeIcon style={{ fontSize: "20px" }} spin icon={faRefresh} />}
                                                    </span>
                                                </Col>
                                                <Col xs={12}>
                                                    <div style={{ marginBottom: "20px" }}>
                                                        {current?.individualBestGuess[j].length > 0 ?
                                                            <>Best Guess: <span>{current?.individualBestGuess[j]}</span> <br /></> : <></>}
                                                        Possible Words:&nbsp;&nbsp; {current?.outputLists[j] ? current.outputLists[j].length : 0}<br />
                                                        {current?.outputLists[j]?.length < 50 ?
                                                            current.outputLists[j].map((w, i) => (
                                                                i === current?.outputLists[j].length - 1 ? <span key={i}>{w}</span> :
                                                                    <span key={i} onClick={() => replaceWord(w)}>{w}, </span>
                                                            )) :
                                                            <></>
                                                        }
                                                    </div>
                                                </Col>
                                            </>}
                                    </center>
                                </Row>
                                <Row>
                                    <ProgressBar progress={progress} show={working === j} />
                                </Row>
                            </Col>
                        )
                    })
                }
            </Row>
            {/* <NextWords /> */}
        </>
    )
}
