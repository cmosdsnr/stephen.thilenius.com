import React, { useState, useEffect } from 'react';
import { Row, Col } from 'react-bootstrap'
import Nav from "react-bootstrap/Nav"
import Navbar from "react-bootstrap/Navbar"

import Skills from './Skills'
import Patents from './Patents'
import Education from './Education'
import Experience from './Experience'
import Personal from './Personal'

const docLocation = "https://stephen.buddbliss.com/documents/"

const MyPill = (props) => {
    const { no, name, handleClick, page } = props
    return (
        <center>
            <Nav.Item onClick={() => { handleClick({ no }) }} className={page === no ? "cvNav active" : "cvNav"}>{name}</Nav.Item>
        </center>
    )
}
export default function Cv() {

    const [today, setToday] = useState(0)
    const [lastUpdate, setLastUpdate] = useState(0)
    const [resumeDate, setResumeDate] = useState(0)
    const [visitorNumber, setVisitorNumber] = useState(0)
    const [page, setPage] = useState(0)

    useEffect(() => {
        setLastUpdate("6/16/22")
        setToday(new Date().toLocaleDateString('en-us', { weekday: "long", year: "numeric", month: "short", day: "numeric" }))
        setResumeDate("7/17")
        setVisitorNumber("87")
    }, [])

    return (
        <Row>
            <Col xs={12} md={3}>
                <Navbar
                    expand="md"
                    id="cvNavContainer"
                    className='navbar-light'
                >
                    <Navbar.Toggle aria-controls="basic-navbar-nav" />
                    <Navbar.Collapse id="basic-navbar-nav">
                        <Nav defaultActiveKey="/cv" className="flex-column" style={{ width: "100%" }}>
                            <MyPill no={0} page={page} handleClick={() => { setPage(0) }} name="Home" />
                            <MyPill no={1} page={page} handleClick={() => { setPage(1) }} name="Skills" />
                            <MyPill no={2} page={page} handleClick={() => { setPage(2) }} name="Patents" />
                            <MyPill no={3} page={page} handleClick={() => { setPage(3) }} name="Education" />
                            <MyPill no={4} page={page} handleClick={() => { setPage(4) }} name="Experience" />
                            <MyPill no={5} page={page} handleClick={() => { setPage(5) }} name="Personal" />
                        </Nav>
                    </Navbar.Collapse>
                </Navbar>
            </Col>

            <Col xs={12} md={{ span: 8, offset: 1 }}>
                {page === 5 ? <Personal /> :
                    page === 4 ? <Experience /> :
                        page === 3 ? <Education /> :
                            page === 2 ? <Patents /> :
                                page === 1 ? <Skills /> :
                                    page === 0 ?
                                        <center>
                                            <Row><Col xs={12} md={6} lg={5}>
                                                <p>Today is {today}<br />
                                                    This site was last updated on {lastUpdate}<br />
                                                    PDF of my resume is <a target="_blank" rel="noreferrer" href={docLocation + "resume_17.pdf"}>here</a> <br />
                                                    My resume was last updated on {resumeDate} <br /><br />
                                                    You Are visitor number {visitorNumber} <br />
                                                </p>
                                            </Col></Row>
                                        </center> : null
                }
            </Col>
        </Row>
    )
}
