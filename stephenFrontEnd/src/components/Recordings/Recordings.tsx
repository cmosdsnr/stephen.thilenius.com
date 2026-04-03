import React from 'react'
import Tapes from './Tapes'
// import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
// import { faPlay } from '@fortawesome/free-solid-svg-icons'
import { serverURL } from '../../constants'

export default function Recordings() {

    return (
        <div>
            <h1 style={{ textAlign: "center" }}>Recordings</h1>
            <h5 style={{ borderTop: "2px solid black", marginTop: "10px" }}>Emmy Waldmuller</h5>
            <p>Emmy Waldmuller (born Thilenius, 1886) is the sister of my grandfather. At 86, in 1972 she made a tape recording of her life experiences. She witnessed the invention of the bicycle, car, airplane, indoor plumbing, and more.</p>
            <ul>
                <li><audio style={{ marginBottom: '10px', marginTop: '10px' }} src={serverURL + "/sound/Thilenius Recordings/Emmy Waldmuller.mp3"} controls />
                </li>
                <li><a href="/Recordings/TranscriptionEmmy">Here is a German transcription of the tape. (computer generated)</a></li>
                <li><a href="">Here is a translation of that transcription to english. (computer translated)</a></li>
            </ul>
            <h5 style={{ borderTop: "2px solid black", marginTop: "10px" }}>Thilenius Family 1943</h5>
            <p>Transcription of a phonographic record cut in March 1943 in Frankfurt (Germany) in connection with the confirmation of
                Otto Guntram Thilenius. It is an 8 minute recording.</p>
            <ul>
                <li>It was first transcribed to tape (date unknown)</li>
                <li>It was first transcribed to CD (Spring 2004)</li>
                <li>Last transcription to mp3 (Spring 2023)</li>
            </ul>
            Voices are:
            <ul>
                <li>First, my grandfather, Otto Gerhard Thilenius</li>
                <li>Then a short poem and some text spoken by Thilo (8 years old)</li>
                <li>Next Otto Guntram (14 years old)</li>
                <li>Next is Dietmut (12 years old)</li>
                <li>Finally Axa Thilenius (These were war times, thus the importance of who had what and when to eat!)</li>
            </ul>
            <audio src={serverURL + "/sound/Thilenius Recordings/Thilenius 1943.mp3"} controls />
            <Tapes />
        </div >
    )
}
