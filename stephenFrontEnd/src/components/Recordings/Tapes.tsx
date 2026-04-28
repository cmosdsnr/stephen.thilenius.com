import React, { useState, useRef } from 'react'
import { serverURL } from '../../constants'
import './Recordings.css'

export default function Tapes() {
    const [track, setTrack] = useState<any[]>([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
    const [cd, setCd] = useState("1")
    const [selectedTrack, setSelectedTrack] = useState<number | null>(null)

    const url = serverURL + "sound/Thilenius Recordings/Renate Piano CD"
    const [trackSrc, setTrackSrc] = useState<string>(url + "1/Track 01.mp3")

    const audioSrc = useRef<HTMLSourceElement>(null)
    const audio = useRef<HTMLAudioElement>(null)

    const handleCdChange = (value: string) => {
        setCd(value)
        setSelectedTrack(null)
        if (value === "1") setTrack([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
        else if (value === "2") setTrack([1, 2, 3])
        else setTrack([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14])
    }

    const handleTrackSelect = (e: any, i: number) => {
        setSelectedTrack(i)
        setTrackSrc(url + cd + "/Track" + (i < 10 ? "0" : "") + i + ".mp3")
        if (audioSrc.current)
            audioSrc.current.src = url + cd + "/Track " + (i < 10 ? "0" : "") + i + ".mp3";
        if (audio.current) {
            audio.current.load();
            audio.current.play();
        }
    }

    return (
        <div className="tapes-card">
            <div className="tapes-header">
                <h5 className="tapes-title">Renate Thilenius — Piano</h5>
                <span className="tapes-year">Recorded 1967</span>
            </div>
            <div className="tapes-body">

                <p className="tapes-cd-label">Select Disc</p>
                <div className="tapes-cd-group">
                    {["1", "2", "3"].map(v => (
                        <button
                            key={v}
                            className={`tapes-cd-btn${cd === v ? ' active' : ''}`}
                            onClick={() => handleCdChange(v)}
                        >
                            CD {v}
                        </button>
                    ))}
                </div>

                <p className="tapes-track-label">Select Track</p>
                <div className="tapes-track-grid">
                    {track.map((_, i) => (
                        <button
                            key={i}
                            className={`tapes-track-btn${selectedTrack === i + 1 ? ' active' : ''}`}
                            onClick={e => handleTrackSelect(e, i + 1)}
                        >
                            {i + 1}
                        </button>
                    ))}
                </div>

                <div className="tapes-audio-wrap">
                    <span className="tapes-audio-label">Play</span>
                    <audio ref={audio} controls className="tapes-audio">
                        <source ref={audioSrc} id="audioSource" src="" />
                        Your browser does not support the audio format.
                    </audio>
                </div>

            </div>
        </div>
    )
}
