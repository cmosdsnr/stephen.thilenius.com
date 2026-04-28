import React from 'react'
import { Slideshow } from "./SlideShow/Slideshow"
import me from "../images/me.jpg"
import { serverURL } from '../constants'
import './Home.css'

const audioTracks = [
    { title: "Anthony Hopkins reads Dylan Thomas", file: "Anthony Hopkins reads Dylan Thomas.mp3" },
    { title: "Stopping by the Woods on a Snowy Evening", file: "Stopping by the Woods on a Snowy Evening.mp3" },
    { title: "Poem from a movie — Denzel Washington", file: "poem.mp3" },
]

export default function Home() {
    return (
        <div className="th-home">

            {/* ── Section 1: Intro ─────────────────────────────── */}
            <div className="th-intro">
                <div className="th-intro-photo-wrap">
                    <img className="th-intro-photo" src={me} alt="Stephen Thilenius" />
                </div>
                <div className="th-intro-text">
                    <div className="th-intro-greeting">
                        Hi, I'm <span>Stephen Thilenius</span>
                    </div>
                    <p>
                        I hold an MSEE and spent my career as an analog design engineer at
                        Intel and Qualcomm, working on the kind of low-level silicon problems
                        most people never think about. In 2018 I retired from the industry to
                        focus on what I actually find most interesting: investing, personal
                        software projects, and anything involving a microcontroller or a
                        soldering iron.
                    </p>
                    <p>
                        These days my time goes toward building software end-to-end — React
                        frontends, Node.js backends, ESP32 firmware — and I'm just as
                        comfortable in a terminal as I am thinking through orbital mechanics
                        or dissecting an energy market. I care about understanding systems
                        deeply, whether that's a circuit, a codebase, or a macroeconomic
                        trend. When something catches my curiosity, I follow it all the way
                        down.
                    </p>
                    <p>
                        I also have a deep affinity for the Thilenius family name and its
                        genealogy. We have over 800 relatives cataloged going back to the
                        early 1600s. If you're a Thilenius, or a relative, register and
                        explore the interactive genealogy tables — they're quite fun.
                    </p>
                    <p>
                        This site is a place for me to share what I'm learning, and to
                        experiment with building things that are fun for me and maybe fun for
                        you too. If any of it resonates, feel free to reach out.
                    </p>
                    <div className="th-intro-cta">· Create a login to see more ·</div>
                </div>
            </div>

            <hr className="th-section-divider" />

            {/* ── Section 2: Slideshow ─────────────────────────── */}
            <div className="th-slideshow-section">
                <div className="th-slideshow-label">· Photo Gallery ·</div>
                <Slideshow containerClassName="w-full overflow-hidden rounded-xl" />
            </div>

            <hr className="th-section-divider" />

            {/* ── Section 3: Listening ─────────────────────────── */}
            <div className="th-listening-section">
                <div className="th-listening-panel">
                    <div className="th-listening-header">· Listening ·</div>
                    {audioTracks.map((track, i) => (
                        <div key={i} className="th-listening-item">
                            <span className="th-listening-title">{track.title}</span>
                            <audio src={`${serverURL}/sound/${track.file}`} controls />
                        </div>
                    ))}
                </div>
            </div>

        </div>
    )
}
