import React from 'react'
import Tapes from './Tapes'
import { serverURL } from '../../constants'
import './Recordings.css'

export default function Recordings() {
    return (
        <div className="rec-page">

            <div className="rec-page-header">
                <p className="rec-page-eyebrow">Thilenius Family Archive</p>
                <h1 className="rec-page-title">Recordings</h1>
                <hr className="rec-page-rule" />
            </div>

            {/* ── Emmy Waldmuller ── */}
            <div className="rec-card">
                <div className="rec-card-header">
                    <h5 className="rec-card-title">Emmy Waldmuller</h5>
                    <span className="rec-card-year">b. 1886 · Recorded 1972</span>
                </div>
                <div className="rec-card-body">
                    <p className="rec-bio">
                        Emmy Waldmuller (born Thilenius, 1886) is the sister of my grandfather. At 86, in
                        1972 she made a tape recording of her life experiences. She witnessed the invention
                        of the bicycle, car, airplane, indoor plumbing, and more.
                    </p>
                    <div className="rec-audio-wrap">
                        <span className="rec-audio-label">Play</span>
                        <audio
                            className="rec-audio"
                            src={serverURL + "/sound/Thilenius Recordings/Emmy Waldmuller.mp3"}
                            controls
                        />
                    </div>
                    <ul className="rec-links">
                        <li>
                            <a href="/Recordings/TranscriptionEmmy">
                                German transcription of the tape (computer generated)
                            </a>
                        </li>
                        <li>
                            <a href="">
                                English translation of that transcription (computer translated)
                            </a>
                        </li>
                    </ul>
                </div>
            </div>

            {/* ── Thilenius Family 1943 ── */}
            <div className="rec-card">
                <div className="rec-card-header">
                    <h5 className="rec-card-title">Thilenius Family</h5>
                    <span className="rec-card-year">Frankfurt · March 1943</span>
                </div>
                <div className="rec-card-body">
                    <p className="rec-bio">
                        Transcription of a phonographic record cut in March 1943 in Frankfurt (Germany)
                        in connection with the confirmation of Otto Guntram Thilenius. It is an 8 minute
                        recording.
                    </p>

                    <p className="rec-section-label">Recording History</p>
                    <ul className="rec-timeline">
                        <li>Originally cut as a phonographic record — March 1943</li>
                        <li>First transcribed to tape — date unknown</li>
                        <li>Transcribed to CD — Spring 2004</li>
                        <li>Final transcription to MP3 — Spring 2023</li>
                    </ul>

                    <p className="rec-section-label">Voices</p>
                    <ul className="rec-speakers">
                        <li>Otto Gerhard Thilenius — my grandfather</li>
                        <li>Thilo — short poem &amp; text (age 8)</li>
                        <li>Otto Guntram — being confirmed (age 14)</li>
                        <li>Dietmut (age 12)</li>
                        <li>Axa Thilenius — wartime notes on rations</li>
                    </ul>

                    <div className="rec-audio-wrap">
                        <span className="rec-audio-label">Play</span>
                        <audio
                            className="rec-audio"
                            src={serverURL + "/sound/Thilenius Recordings/Thilenius 1943.mp3"}
                            controls
                        />
                    </div>
                </div>
            </div>

            {/* ── Renate Piano CDs ── */}
            <Tapes />

        </div>
    )
}
