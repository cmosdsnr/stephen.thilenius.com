import React, { useState, useEffect, useRef } from 'react';
import { useWordle } from './WordleContext'

interface Props {
    wordIndex: number;
    letterIndex: number;
}

export default function LetterBox(props: Props) {
    const { wordIndex, letterIndex } = props

    const { current, updateAccuracy } = useWordle()

    const handleClick = (e) => {
        // if (current?.accuracies[wordIndex][letterIndex] === 0) updateAccuracy(wordIndex, letterIndex, 1)
        // else if (current?.accuracies[wordIndex][letterIndex] === 1) updateAccuracy(wordIndex, letterIndex, 2)
        // else if (current?.accuracies[wordIndex][letterIndex] === 2) updateAccuracy(wordIndex, letterIndex, 0)
        if (current?.accuracies[wordIndex][letterIndex] != 1) updateAccuracy(wordIndex, letterIndex, 1)
        else updateAccuracy(wordIndex, letterIndex, 0)
    }

    const handleRightClick = (e) => {
        e.preventDefault()
        if (current?.accuracies[wordIndex][letterIndex] != 2) updateAccuracy(wordIndex, letterIndex, 2)
        else updateAccuracy(wordIndex, letterIndex, 0)
    }


    return (
        <div style={{ display: 'inline-block', marginRight: "3px" }} >
            <div style={{ display: 'block' }} >
                <span
                    style={{
                        width: "30px", height: "30px", display: "inline-block",
                        border: "1px solid black",
                        borderRadius: "2px",
                        backgroundColor:
                            current?.greyed[wordIndex] ?
                                "grey" :
                                Array.isArray(current?.accuracies[wordIndex]) ?
                                    current?.accuracies[wordIndex][letterIndex] === 0 ?
                                        "white" :
                                        current?.accuracies[wordIndex][letterIndex] === 1 ?
                                            "gold" :
                                            "lightgreen"
                                    : "white",
                        margin: "auto"
                    }}
                    onClick={handleClick}
                    onContextMenu={handleRightClick}
                >
                    {current?.word.split('')[letterIndex]}
                </span>
            </div>
        </div>


    )
}
