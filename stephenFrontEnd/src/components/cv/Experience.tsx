import React, { useState } from 'react';
// import { Row, Col } from 'react-bootstrap'

export default function Experience() {

    const [show, setShow] = useState(Array.apply(false, Array(10)))

    const showNumber = (number) => {
        let s = [...show]
        s[number] = true
        setShow(s)
    }
    return (

        <>
            <table className="expTable">
                <tr>
                    <th>From</th>
                    <th>To</th>
                    <th>About my Responsibilities</th>
                    <th>About the Companies</th>
                </tr>
                <tr>
                    <td>Jul 13</td>
                    <td>Jun 18 (retired)</td>
                    <td><span className="linkLike" onClick={(e) => { showNumber(9) }}>Sr. Staff Design Engineer</span></td>
                    <td><a href="http://www.qualcomm.com" target="_blank" rel="noreferrer" >Qualcomm</a></td>
                </tr>
                <tr>
                    <td>Mar 03</td>
                    <td>Jul 13</td>
                    <td><span className="linkLike" onClick={(e) => { showNumber(8) }}>Staff Design Engineer</span></td>
                    <td><a href="http://www.intel.com" target="_blank" rel="noreferrer" >Intel</a></td>
                </tr>
                <tr>
                    <td>Oct 02</td>
                    <td>Mar 03</td>
                    <td><span className="linkLike" onClick={(e) => { showNumber(7) }}>Senior Mixed Signal Designer</span></td>
                    <td>Micro Linear</td>
                </tr>
                <tr>
                    <td>Oct 01</td>
                    <td>Oct 02</td>
                    <td><span className="linkLike" onClick={(e) => { showNumber(6) }}>Analog Designer</span></td>
                    <td>nSine</td>
                </tr>
                <tr>
                    <td>Mar 97</td>
                    <td>Oct 01</td>
                    <td><span className="linkLike" onClick={(e) => { showNumber(5) }}>Staff Design Engineer</span></td>
                    <td><a href="http://www.intel.com" target="_blank" rel="noreferrer" >Level One Communications & Intel</a></td>
                </tr>
                <tr>
                    <td>Jul 94</td>
                    <td>Mar 97</td>
                    <td><span className="linkLike" onClick={(e) => { showNumber(4) }}>Design Engineer</span></td>
                    <td><a href="http://www.mot.com" target="_blank" rel="noreferrer" >Motorola</a></td>
                </tr>
                <tr>
                    <td>Jan 92</td>
                    <td>Jul 94</td>
                    <td><span className="linkLike" onClick={(e) => { showNumber(3) }}>ASIC Design Engineer</span></td>
                    <td>SIS Microelectronics</td>
                </tr>
                <tr>
                    <td>Aug. 91</td>
                    <td>Aug. 93</td>
                    <td><span className="linkLike" onClick={(e) => { showNumber(2) }}>Faculty</span></td>
                    <td><a href="http://www-ocs.colorado.edu/" target="_blank" rel="noreferrer" >CU,&nbsp; Optical Computing Center</a></td>
                </tr>
                <tr>
                    <td>May 90</td>
                    <td>Aug 94</td>
                    <td><span className="linkLike" onClick={(e) => { showNumber(1) }}>Contractor</span></td>
                    <td>companies in the Boulder Area</td>
                </tr>
            </table>

            <span className="linkLike" onClick={(e) => { showNumber(0) }} >What I did before I became an engineer</span>

            <div style={{ border: "1px solid black", width: "100%", marginTop: "20px" }}>

            </div>
            {show[0] ?
                <div>
                    <p>From Mar. 1986 to Aug 1986&nbsp; I worked as an accountant for Collins
                        Commodities at the <a href="http://www.cbot.com/">Chicago Board of Trade</a>.
                        What a cool summer Job!</p>
                    <p>From Aug. 1984 to Mar. 1986 I worked as a mechanic fixing M109 Howitzer
                        Artillery tanks in the United States Army. I was stationed in Neu-Ulm Germany
                        for most of that time.</p>
                </div> : <></>}

            {show[8] ? <div>
                <h5>Senior staff Design Engineer, Qualcomm, San Diego CA</h5>
                <p>Jul 2013 to Jun 2018</p>
                -        <ul>
                    <li>High speed LPDDR4 IO design on various generations of cutting edge processes.  </li>
                    <li>22nm thru 7nm TSMC process experience.</li>
                </ul>
            </div> : <></>}
            {show[7] ? <div>
                <h5>Senior staff Design Engineer, Intel, Folsom CA</h5>
                <p>Jul 2003 to Jul 2013</p>
                <ul>
                    <li>Team Management</li>
                    <li>High speed IO design (GDDR5, OPIO) on various generations of Intel’s cutting edge processes. </li>
                    <li>103 dB Delta Sigma ADC design for RFID reader chip.</li>
                    <li>10-bit .segmented, 250MHz video DAC design in 90nm technology</li>
                    <li>Responsible for design of DFE, FFE, slicer, and biasing for 10/100 Ethernet chip.</li>
                </ul>
            </div> : <></>}
            {show[6] ? <div>
                <h5>Nov 2002 to May 2003 (Micro Linear, Cambridge UK, closed in May 2003)</h5>
                <ul>
                    <li>System level design, through implementation, of a 1/96th Fractional-N divider PLL using innovative delta-sigma techniques for a 2.4GHz radio transceiver. ADS and cadence were used extensively.</li>
                    <li>Pre-Scalar, band gap, limiter, and RSSI design and simulation for a 5.8GHz radio transceiver.</li>
                    <li>Micro Linear closed the UK design center in June 2003.</li>
                </ul>

            </div> : <></>}
            {show[5] ? <div>
                <h5>Oct 2001 to Oct 2002 (Nsine Ltd., Reading UK, startup closed in Oct 2002)</h5>
                Project lead/manager for 30MHz (2Mbps) Power line communications AFE IC.<br />

            </div> : <></>}
            {show[4] ? <div>
                <h5>Staff Design Engineer, Level One Communications, Sacramento CA, (530) 677-3588</h5>
                <p>Mar. 1997 to present</p>
                <ul>
                    <li>Project manager and chief technical lead for the design of Level One's octal, quad and dual T1/E1 transceivers.</li>
                    <li>Responsible for Level One's first 0.35u IC, first on schedule tapeout with first pass silicon success.</li>
                    <li>Experience with 0.35u CMOS mixed signal integrated circuit design for telecommunication applications.</li>
                    <li>Designs include transmitters, receivers, timing recovery, jitter attenuator, bandgap reference and PLL's.</li>
                    <li>Project member for Level Ones first octal E1 transceiver.</li>
                    <li>Patented current mode transmitter for long-haul T1 transceiver</li>
                    <li>Low power, high dynamic range 30 MHz delta-sigma switched capacitor design for DSL products</li>
                </ul>
            </div> : <></>}
            {show[3] ? <div>
                <h5>Design Engineer, Motorola, Tempe AZ, (602) 413-4920</h5>
                <p>Nov. 1995 to Mar. 1997</p>
                <ul>
                    <li>Experience with the Smartmos3 BiCMOS Analog integrated circuit design for automotive applications.</li>
                    <li>Responsible for the redesign of Motorola's Smartmos3 octal driver.</li>
                    <li>Principal designer of the UART based physical layer IC working directly with the customer.</li>
                    <li>Team designer for an ultra low input offset dual opamp.</li>
                </ul>
                Aug. 1994 to Nov. 1995<br />
                <ul>
                    <li>Principal designer of a multiprocessor board for the IO sub-system for the Gemini fault tolerant computer system, including SCSI, Ethernet, and 68020 processors and DRAM controller.</li>
                    <li>Implementation originally intended for digital ASIC design, however design was cost effectively</li>
                    <li>implemented with FPGA's.</li>
                    <li>Expertise in the use of Cadence Concept and Mentor Graphics tools.</li>
                </ul>
            </div> : <></>}
            {show[2] ? <div>
                <h5>ASIC Design Engineer, SIS Microelectronics, Longmont CO, (303) 776-1667</h5>
                <p>Jan. 1992 to Jul. 1994</p>
                <ul>
                    <li>Gate Array and Cell based ASIC design, layout, and verification.</li>
                    <li>Expertise in the use of Compass ASIC tools (VLSI), from design conception through physical layout.</li>
                    <li>Experience with Verilog and AHDL entry using both Synopsis and Compass netlist generation.</li>
                    <li>Collaborated with customer on DSP audio IC.</li>
                </ul>
            </div> : <></>}
            {show[1] ? <div>
                <h5>ECL Digital Design Engineer, Dr. Jon Sauer, Optical Computing Center, Boulder CO</h5>
                <p>Aug. 1991 to Aug. 1993</p>
                <ul>
                    <li>Involved in the design of an experimental high speed optical interconnect network.</li>
                    <li>Designed a complex interface card for the IBM PC using Xilinx FPGA's to test and operate the newnetwork.</li>
                    <li>Using Pads Logic and PCB, designed 2 high speed ECL circuit boards.</li>
                </ul>
            </div> : <></>}
            {show[0] ? <div>
                <h5>Consulting Projects, Consultant for various companies in the Boulder Area</h5>
                <p>May 1990 to Aug. 1994</p>
                <ul>
                    <li>Design of custom interface cards for the IBM compatible PC.</li>
                    <li>Borland C/C++ and OWL 2.0 Windows Software Systems Development.</li>
                    <li>Circuit Board designs and layouts.</li>
                </ul>
            </div> : <></>}
            <div height="150px">
            </div>
        </>
    )
}


