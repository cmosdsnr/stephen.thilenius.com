import React, { useState, useRef, SourceHTMLAttributes } from 'react'
import { Row, Col } from "react-bootstrap"
import { serverURL } from '../../constants'

export default function Tapes() {
    const [track, setTrack] = useState<any[]>([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
    const [cd, setCd] = useState("1")

    const url = serverURL + "sound/Thilenius Recordings/Renate Piano CD"
    const [trackSrc, setTrackSrc] = useState<string>(url + "1/Track 01.mp3")

    const audioSrc = useRef<HTMLSourceElement>(null)
    const audio = useRef<HTMLAudioElement>(null)

    const handleCdChange = (e: any) => {
        setCd(e.target.value);
        if (e.target.value === "1") setTrack([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
        else if (e.target.value === "2") setTrack([1, 2, 3])
        else setTrack([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14])
    }
    const handleTrackSelect = (e: any, i: number) => {
        setTrackSrc(url + cd + "/Track" + (i < 10 ? "0" : "") + i + ".mp3")
        if (audioSrc.current)
            audioSrc.current.src = url + cd + "/Track " + (i < 10 ? "0" : "") + i + ".mp3";
        if (audio.current) {
            audio.current.load();
            audio.current.play();
        }
    }

    return (
        <>
            <Row style={{ borderTop: "2px solid black", marginTop: "10px" }}>
                <h5>Recordings by Renate Thilenius 1967</h5>
            </Row>
            <Row>
                <Col xs={3}>
                    <label style={{ padding: '20px', border: '1px solid black', borderRadius: "5px" }}>CD #
                        <div className="">
                            < input type="radio" value="1" name="CD" onChange={handleCdChange} checked={cd === "1"} /> CD 1<br />
                            <input type="radio" value="2" name="CD" onChange={handleCdChange} checked={cd === "2"} /> CD 2<br />
                            <input type="radio" value="3" name="CD" onChange={handleCdChange} checked={cd === "3"} /> CD 3
                        </div></label>
                </Col >

                <Col xs={3}>
                    <Row>
                        <label style={{ padding: '20px', border: '1px solid black', borderRadius: "5px" }}>Track #
                            {track.map((v, i) => {
                                return (
                                    <Col
                                        key={i}
                                        xs={3}
                                        onClick={e => { handleTrackSelect(e, i + 1) }}
                                    >
                                        {v}
                                    </Col>
                                )
                            })}
                        </label>
                    </Row>
                </Col>
                <Col>
                    <audio ref={audio} controls>
                        <source ref={audioSrc} id="audioSource" src=""></source>
                        Your browser does not support the audio format.
                    </audio>
                </Col>
            </Row >
        </>
    )
}
