import React, { useState, useEffect, useRef } from 'react';
import { Row, Col } from 'react-bootstrap'
import { useWordle } from './WordleContext'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBroom } from '@fortawesome/free-solid-svg-icons'

interface Props {
    wordIndex: number;
}

export default function DisplayWord(props: Props) {
    const { wordIndex } = props
    const { gameData, updateAllAccuracy } = useWordle()

    const handleClick = (e, gameDataIndex, letterIndex) => {
        // if (gameData[gameDataIndex].accuracies[wordIndex][letterIndex] === 0) updateAllAccuracy(gameDataIndex, wordIndex, letterIndex, 1)
        // else if (gameData[gameDataIndex].accuracies[wordIndex][letterIndex] === 1) updateAllAccuracy(gameDataIndex, wordIndex, letterIndex, 2)
        // else if (gameData[gameDataIndex].accuracies[wordIndex][letterIndex] === 2) updateAllAccuracy(gameDataIndex, wordIndex, letterIndex, 0)

        if (gameData[gameDataIndex].accuracies[wordIndex][letterIndex] != 1) updateAllAccuracy(gameDataIndex, wordIndex, letterIndex, 1)
        else updateAllAccuracy(gameDataIndex, wordIndex, letterIndex, 0)
    }

    const handleRightClick = (e, gameDataIndex, letterIndex) => {
        e.preventDefault()
        if (gameData[gameDataIndex].accuracies[wordIndex][letterIndex] != 2) updateAllAccuracy(gameDataIndex, wordIndex, letterIndex, 2)
        else updateAllAccuracy(gameDataIndex, wordIndex, letterIndex, 0)
    }


    return (
        <>

            {gameData?.map((v, j) => {
                return (
                    j == gameData.length - 1 ?
                        null :
                        <Col key={j} xs={12}>
                            {gameData[j].finished[wordIndex] ? <></> :
                                <center style={{}}>
                                    {
                                        Array.apply(null, Array(5)).map((l, i) => {
                                            return (
                                                <div key={i} style={{ display: 'inline-block', marginRight: "3px" }} >
                                                    <div style={{ display: 'block' }} >
                                                        <input
                                                            style={{
                                                                backgroundColor:
                                                                    gameData[j].greyed[wordIndex] ? "grey" :
                                                                        gameData[j].accuracies[wordIndex][i] === 0 ? "white" :
                                                                            gameData[j].accuracies[wordIndex][i] === 1 ? "gold" : "lightgreen",
                                                                margin: "auto"
                                                            }}
                                                            value={gameData[j].word.split('')[i]}
                                                            className={"textbox short tab"}
                                                            maxLength={1}
                                                            onChange={e => { }}
                                                            onFocus={e => { }}
                                                            onBlur={e => { }}
                                                            onClick={(e) => handleClick(e, j, i)}
                                                            onContextMenu={(e) => handleRightClick(e, j, i)}
                                                            type={"text"} />
                                                    </div>

                                                </div>
                                            )
                                        })
                                    }
                                </center>
                            }
                        </Col>
                )
            })
            }
        </>
    )
}



