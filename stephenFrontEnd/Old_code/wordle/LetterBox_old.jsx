import React, { useState, useEffect, useRef } from 'react';
import { useWordle } from '../../src/components/Games/Wordle/WordleContext'

export default function LetterBox(props) {
    const { wordIndex, letterIndex, tabToNext, hide, editable, focusIndex, reset } = props

    let hold = ""
    // const [letter, setLetter] = useState(false);
    const [checkedGreen, setCheckedGreen] = useState(false);
    const [checkedYellow, setCheckedYellow] = useState(false);
    const [current, setCurrent] = useState(null);
    const letterRef = useRef(null)

    const { gameData, updateAccuracy, replaceLetter, clear } = useWordle()
    const flash = false; // used to come from useWordle()... discontinued

    useEffect(() => {
        if (gameData?.length > 0)
            setCurrent(gameData[gameData.length - 1])
    }, [gameData])

    useEffect(() => {
        setCheckedGreen(gameData[gameData.length - 1]?.accuracies[wordIndex][letterIndex] === 2)
        setCheckedYellow(current?.accuracies[wordIndex][letterIndex] === 1)
    }, [clear])

    useEffect(() => {
        if (editable && (focusIndex === letterIndex)) letterRef.current.focus()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [focusIndex])

    const handleCorrectPosition = (e) => {
        if (!checkedGreen) {
            updateAccuracy(wordIndex, letterIndex, 2)
            setCheckedYellow(false)
        } else if (!checkedYellow) {
            updateAccuracy(wordIndex, letterIndex, 0)
        }
        setCheckedGreen(!checkedGreen)
    }

    const handleCorrectLetter = (e) => {
        if (!checkedYellow) {
            updateAccuracy(wordIndex, letterIndex, 1)
            setCheckedGreen(false)
        } else if (!checkedGreen) {
            updateAccuracy(wordIndex, letterIndex, 0)
        }
        setCheckedYellow(!checkedYellow)
    }


    return (
        <div style={{ display: 'inline-block', marginRight: "3px" }} >
            <div style={{ display: 'block' }} >

                <input
                    tabIndex={letterIndex + 1001}
                    ref={letterRef}
                    style={{
                        backgroundColor:
                            flash ? "lightblue" :
                                current?.accuracies[wordIndex][letterIndex] === 0 ?
                                    "white" :
                                    current?.accuracies[wordIndex][letterIndex] === 1 ?
                                        "gold" :
                                        "lightgreen", margin: "auto"
                    }}
                    value={current?.word.split('')[letterIndex]}
                    className={"textbox short tab"}
                    maxLength={1}
                    onChange={e => {
                        if (editable) {
                            if (e.target.value.toUpperCase().match(/[A-Z]/)) {
                                e.target.value = e.target.value.toUpperCase()
                                tabToNext(letterIndex)
                                replaceLetter(letterIndex, e.target.value)
                            } else {
                                e.target.value = ''
                            }
                        }
                    }}
                    onFocus={e => {
                        if (editable) e.target.value = ''
                    }}
                    onBlur={e => {
                        if (!e.target.value.match(/[A-Z]/))
                            e.target.value = current?.word.split('')[letterIndex]
                    }}
                    type={"text"} />
            </div>

            {hide === true ? <></> : <>
                <div style={{ display: 'block' }} >
                    <input
                        style={{ marginTop: "10px" }}
                        checked={checkedGreen}
                        type="checkbox"
                        onChange={(e) => { handleCorrectPosition(e) }}
                    />
                </div>
                <div style={{ display: 'block' }} >
                    <input
                        style={{ marginBottom: "20px" }}
                        checked={checkedYellow}
                        type="checkbox"
                        onChange={(e) => { handleCorrectLetter(e) }}
                    />
                </div>
            </>
            }
        </div>


    )
}
