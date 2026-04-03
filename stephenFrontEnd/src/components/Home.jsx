import React from 'react'
import { Row, Col } from "react-bootstrap"
import { Slideshow } from "./SlideShow/Slideshow"
import me from "../images/me.jpg"
import { serverURL } from '../constants'

export default function Home() {
    return (
        <>
            <Row>
                <Col xs={3} lg={3}>
                    <img className="me" src={me} alt="Stephen" title="Stephen" />
                </Col>
                <Col xs={9} lg={4} className="mt-3">
                    <p>Hi, I'm Stephen Thilenius. I'm an electrical engineer, live in San Diego, and design integrated circuits at Qualcomm. I greatly enjoy programming and web design, so here we are.</p>
                    <p>I also have an affinity for the Thilenius family name and the genealogy behind it. We have over 800 Thilenius relatives cataloged. If you are a Thilenius, or relative, please register and you can use the interactive genealogy tables. They are quite fun to play with and go back to the early 1600's!</p>
                    <p>Like I said, I love programming, so this site will change and grow. If there is a desire for anything else Thilenius related, I would be happy to add them, just email me.</p>
                    <p>Please create a login to see more!</p><center><h2>Enjoy!!</h2></center>
                </Col>
                <Col xs={12} lg={5}>
                    <Slideshow />
                </Col>
            </Row>
            <Row>
                <Col xs={12} lg={{ span: 9, offset: 2 }} xl={{ span: 6, offset: 3 }}>
                    <h4>Food for thought:</h4>
                    <Row>
                        <Col xs={5} className='my-auto'>Anthony Hopkins reads Dylan Thomas      </Col>
                        <Col xs={7} className='my-auto'><audio src={serverURL + "/sound/Anthony Hopkins reads Dylan Thomas.mp3"} controls /></Col>
                    </Row>
                    <Row>
                        <Col xs={5} className='my-auto'>Stopping by the Woods on a Snowy Evening</Col>
                        <Col xs={7} className='my-auto'><audio src={serverURL + "/sound/Stopping by the Woods on a Snowy Evening.mp3"} controls /></Col>
                    </Row>
                    <Row>
                        <Col xs={5} className='my-auto'>Poem from a movie - Denzel Washington   </Col>
                        <Col xs={7} className='my-auto'><audio src={serverURL + "/sound/poem.mp3"} controls /></Col>
                    </Row>
                </Col>
            </Row>
        </>
    )
}

