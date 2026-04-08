import React, { useState, useEffect, useRef } from 'react';
import { Row, Col, Button } from 'react-bootstrap'
import _ from "lodash"
import Word from './Word'
import { BarGraph } from './BarGraph'
import { useWordle } from './WordleContext'
import './Wordle.css'
import pb from '../../../lib/pocketBase';

//Instantiate Words (1 or 4)
//back and new game buttons
//draw stats table
//draw distribution plot
//draw accumulated plot
//draw word list

export default function Quord() {
    const [tableColumns, setTableColumns] = useState(0)
    const [firstList, setFirstList] = useState('')
    const [secondList, setSecondList] = useState('')
    const [thirdList, setThirdList] = useState('')
    const [list, setList] = useState([])

    const tableRef = useRef()

    const { gameData, distribution, backOneStep, reset, replaceWord, numberWords, removeWord } = useWordle()
    const [current, setCurrent] = useState(null);

    useEffect(() => {
        if (gameData?.length > 0)
            setCurrent(gameData[gameData.length - 1])
    }, [gameData])

    useEffect(() => {
        const resizeAndDraw = () => {
            const container = tableRef.current
            if (!container) {
                // console.log("no container")
                return
            }
            setTableColumns(Math.floor(container.clientWidth / 60))
        }
        resizeAndDraw()
        window.addEventListener("resize", resizeAndDraw)
        return () => {
            window.removeEventListener("resize", resizeAndDraw)
        }
    }, [])

    const handleLeave = () => {
        setFirstList('')
        setSecondList('')
        setThirdList('')
    }

    const handleHover = (n) => {
        if (!distribution?.second?.others) return

        if (n === 1) {
            setList(distribution.others)
            setFirstList(renderWordList)
        } else if (n === 2) {
            setList(distribution.second.others)
            setSecondList(renderWordList)
        } else if (n === 3) {
            setList(distribution.third.others)
            setThirdList(renderWordList)
        }
    }

    function chunkArrayInGroups(arr, size) {
        var myArray = [];
        for (var i = 0; i < arr.length; i += size) {
            myArray.push(arr.slice(i, i + size));
        }
        return myArray;
    }

    const renderWordList = () => {
        // if (!list.length < 15) return (<></>)
        const others = chunkArrayInGroups(list, 15)
        return (
            <div className="likes__list">
                <table>
                    <tbody>
                        {others.map((n, j) => {
                            return (<tr key={j}>
                                {n.map((m, k) => {
                                    return (<td key={k}>
                                        <span onClick={() => replaceWord(m)}>{m}</span>
                                    </td>)
                                })}
                            </tr>)
                        })}
                    </tbody>
                </table>
            </div>)
    }

    const makeWordInvalid = async (word) => {
        // pop up alert asking if user is sure
        if (!window.confirm(`Are you sure you want to mark "${word}" as invalid? This will remove it from future suggestions.`)) {
            return;
        }
        // remove word from future suggestions
        distribution.topRanked = distribution.topRanked.filter(n => n.word !== word);
        replaceWord(distribution.topRanked[0].word);
        removeWord(word);
        pb.collection('miscellaneous').getOne("000invalidwords").then(record => {
            console.log("Fetched invalid words record:", record);
            let invalidWords = record.data.words || [];
            if (!invalidWords.includes(word)) {
                invalidWords.push(word);
                console.log("Updating invalid words list:", invalidWords);
                pb.collection('miscellaneous').update("000invalidwords", { data: { words: invalidWords } });
            }
        });
    }


    return (
        <>
            <Word />
            <Row>
                {/* <Col
                    xs={12}
                    style={{ marginBottom: "10px" }}
                    className="likes__relavance"
                    onMouseOver={() => handleHover(1)}
                    onMouseLeave={handleLeave}
                >
                    <span style={{ marginRight: "10px" }}>equivalent:</span>
                    {distribution.others?.map((n, j) => {
                        return (
                            j > 10 ? <></> : <span key={j} onClick={() => replaceWord(n)}>{j != 10 ? n + ', ' : n}</span>
                        )
                    })}
                    {firstList}
                </Col>
                <Col
                    xs={12}
                    style={{ marginBottom: "10px" }}
                    className="likes__relavance"
                    onMouseOver={() => handleHover(2)}
                    onMouseLeave={handleLeave}
                >
                    <span style={{ marginRight: "10px" }}>Second place:</span>
                    {distribution.second?.others?.map((n, j) => {
                        return (
                            j > 10 ? <></> : <span key={j} onClick={() => replaceWord(n)}>{j != 10 ? n + ', ' : n}</span>
                        )
                    })}
                    {secondList}
                </Col>
                <Col
                    xs={12}
                    style={{ marginBottom: "10px" }}
                    className="likes__relavance"
                    onMouseOver={() => handleHover(3)}
                    onMouseLeave={handleLeave}
                >
                    <span style={{ marginRight: "10px" }}>Third place:</span>
                    {distribution.third?.others?.map((n, j) => {
                        return (
                            j > 10 ? <></> : <span key={j} onClick={() => replaceWord(n)}>{j != 10 ? n + ', ' : n}</span>
                        )
                    })}
                    {thirdList}
                </Col> */}
                <Col
                    xs={12}
                    style={{ marginBottom: "10px" }}
                >
                    <span style={{ marginRight: "10px" }}>Top 20:</span>
                    {distribution.topRanked?.map((n, j) => {
                        let t = 4;
                        return (
                            <span
                                key={j}
                                onClick={() => replaceWord(n.word)}
                                // on right click
                                onContextMenu={(e) => {
                                    e.preventDefault();
                                    makeWordInvalid(n.word);
                                }}
                                style={{
                                    color: n.rank == 1 ? "green" : n.rank == 2 ? "blue" : n.rank == 3 ? "purple" : n.rank == 4 ? "magenta" : "black"
                                }}
                            >
                                {n.word + '(' + (Math.round(n.std * 100) / 100) + ', ' + n.letterScore + ')'}{j != 19 ? ', ' : ''}
                            </span>
                        )
                    })}
                </Col>
            </Row>
            <Row>
                <Col xs={3} style={{ paddingTop: "30px" }}>
                    <center>
                        <Button className='btn btn-warning btn-sm' style={{ marginRight: "10px" }} onClick={backOneStep}>Back</Button>
                        <Button className='btn btn-info btn-sm' onClick={reset}>New Game</Button>
                        <table className='statTable'>
                            <tbody>
                                <tr>
                                    <th>Guess</th><td>{distribution?.guess}</td>
                                </tr><tr>
                                    <th>Possible</th><td>{current?.combinedList.length}</td>
                                </tr><tr>
                                    <th>Deviation</th><td>{distribution?.dev && parseInt(100 * distribution.dev) / 100}</td>
                                </tr><tr>
                                    <th>MaxY</th><td>{distribution?.maxY ? Math.round(distribution.maxY * 100) / 100 : 0}</td>
                                </tr><tr>
                                    <th>MinX</th><td>{distribution?.minX ? Math.round(distribution.minX * 100) / 100 : 0}</td>
                                </tr><tr>
                                    <th>MaxX</th><td>{distribution?.maxX ? Math.round(distribution.maxX * 100) / 100 : 0}</td>
                                </tr><tr>
                                    <th>Worst</th><td>{distribution?.worst}</td>
                                </tr>
                            </tbody>
                        </table>


                    </center>
                </Col>
                {/* <div className='distPlot'>
                        {distribution.dist?.map((n, j) => {
                            return (
                                <div key={j} className='sub_div' style={{ left: j * 3, backgroundColor: "blue", width: (100 / distribution.dist.length) + "%", height: (200 * n / distribution.maxY) + "px" }} />
                            )
                        })}
                    </div> */}
                {/* <Col xs={9} >
                    <Row>
                        <BarGraph d={distribution.dist} x={distribution.distX} />
                    </Row>
                    <Row>
                        <BarGraph d={distribution.acc} x={distribution.accX} />
                    </Row>
                </Col> */}
                {/* <div className='accPlot'>
                        {distribution.acc?.map((n, j) => {
                            return (
                                <div key={j} className='sub_div' style={{ left: (j * 100 / distribution.acc.length) + "%", backgroundColor: "blue", width: (100 / distribution.acc.length) + "%", height: (1 + 100 * n / distribution.maxAcc) + "%" }} />
                            )
                        })}
                    </div> */}
            </Row>
            <Row ref={tableRef}>
                <table style={{ marginTop: '40px', borderTop: '3px solid black' }}>
                    <thead style={{ height: '20px' }}>
                        <tr >
                            {[...Array(tableColumns)].map((v, i) => (
                                <th key={i} style={{ width: '60px' }}></th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {current?.combinedList.length < 1000 ? _.chunk(current.combinedList, tableColumns).map((chunk, k) => (
                            <tr key={k}>
                                {chunk.map((value, i) => (
                                    <td key={i}>{value}</td>
                                ))}
                            </tr>
                        )) : <></>}
                    </tbody>
                </table>
            </Row>
            <Row>
                <Col xs={12}>
                    {/* <div style={{ display: "inline-block" }}>
                            <div style={{ float: "left", backgroundColor: "blue", width: "5px", height: "20px", marginTop: "80px" }} />
                            <div style={{ float: "left", backgroundColor: "blue", width: "5px", height: "10px", marginTop: "90px" }} />
                            <div style={{ float: "left", backgroundColor: "blue", width: "5px", height: "35px", marginTop: "65px" }} />
                        </div> */}


                </Col>
            </Row>
        </>
    )
}
