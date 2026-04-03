import React from 'react';
import { Row, Col } from 'react-bootstrap'
import cuBoulder from "../../images/cv/cu.jpg"

export default function education() {
    return (
        <>
            <Row>
                <Col xs={3} >
                    <a href="http://www.colorado.edu/" target="_blank" rel="noreferrer"><img src={cuBoulder} alt="" /></a>
                </Col>
            </Row>
            <Row xs={12} >
                <div style={{ border: "1px solid black", width: "100%", marginTop: "20px" }}></div>
                <p><b>1990-1991 <i>M.S. Electrical Engineering</i></b>, <a href="http://www.colorado.edu/" target="_blank" rel="noreferrer">University
                    of Colorado</a>, Boulder CO</p>
                <p>Optical Computing Center Graduate</p>
                <p>Graduated December 1991, emphasis in device physics, G.P.A. 3.3/4.0</p>
                <p>Major fields of study include:</p>

                <ul style={{ width: "100%" }}>
                    <li>Devices and materials</li>
                    <li>Digital signal processing (DSP)</li>
                    <li>Computer architectures</li>
                    <li>Neural Networks</li>
                </ul>
                <div style={{ border: "1px solid black", width: "100%", marginTop: "20px" }}></div>
                <p><b>1987-1990</b> <b><i>B.S. Electrical Engineering</i></b>, <a href="http://www.colorado.edu/">University
                    of Colorado</a>, Boulder CO</p>
                May 1990, G.P.A 3.5/4.0 (EE G.P.A. 3.6/4.0)

                <div style={{ border: "1px solid black", width: "100%", marginTop: "20px" }}></div>
                <p>
                    <h5>Previous Education</h5>
                    <ul>
                        <li><b>1984-1987</b>&nbsp; <a href="http://www.goarmy.com/" target="_blank" rel="noreferrer">United States
                            Army</a>,&nbsp;&nbsp;&nbsp;&nbsp; <a href="https://wikitravel.org/en/Ulm" target="_blank" rel="noreferrer">Neu
                                Ulm West-Germany</a></li>
                        <li><b>1982-1984&nbsp;</b> Studies in Applied Physics&nbsp; <a href="http://www.wisc.edu/" target="_blank" rel="noreferrer">University
                            of Wisconsin</a>&nbsp; Madison WI</li>
                        <li><b>1978-1982</b>&nbsp; <a href="https://www.hfhighschool.org/resources/alumni/" target="_blank" rel="noreferrer">high
                            School</a>&nbsp;&nbsp; Flossmoor IL</li>
                    </ul>
                </p>
            </Row>
        </>

    )
}


