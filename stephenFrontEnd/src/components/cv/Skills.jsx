import React from 'react';
import { Row, Col } from 'react-bootstrap'

export default function Skills() {
    return (
        <>
            <Row className="cvLists">
                <Col xs={12}>
                    <h4>Mixed signal IC design</h4>
                    <ul>
                        <li>Mixed-signal deep sub-micron CMOS design</li>
                        <li>low jitter analog PLL design</li>
                        <li>low jitter digital communication timing recovery</li>
                        <li>Digital jitter attenuators for telecommunications</li>
                        <li>receivers: T1/E1, Very low power switched capacitor  Delta-Sigma's</li>
                        <li>bandgap references</li>
                        <li>Patented current mode and switching transmitter designs</li>
                    </ul>
                    <ul>
                        <li>BiCMOS mixed-signal high voltage ICs for the automotive industry</li>
                    </ul>
                    <h4>Digital IC design</h4>
                    <ul>
                        <li>Digital ASIC and discrete circuit design, inculding extensive experience with:</li>
                    </ul>
                    <ul>
                        <li>Compass Tools</li>
                        <li>Cadence Tools</li>
                        <li>VHDL</li>
                        <li>Verilog</li>
                        <li>Synopsis</li>
                    </ul>
                    <h4>Microcontrollers and FPGA</h4>
                    <ul>
                        <li>Skilled with various PAL/PLD design packages: Xilinx, Altera, Cypress, Lattice and ABEL 5.0</li>
                        <li>Extensive knowledge of circuit board layout and routing using PADS design software.</li>
                        <li>Software systems development in C, C++, Pascal, Basic, and Assembly.</li>
                        <li>Very Knowledgeable with UNIX operating system</li>
                    </ul>
                    <h4>Software developement</h4>
                    <ul>
                        <li>C and Born shell programming.</li>
                        <li>Perl, Awk, Sed, etc.</li>
                    </ul>
                    <h4>Web Design</h4>
                    <ul>
                        <li>HTML and Javascript</li>
                        <li>AngularJS and other frameworks</li>
                        <li>PHP and MySQL</li>
                    </ul>
                </Col>
            </Row>
        </>
    )
}
