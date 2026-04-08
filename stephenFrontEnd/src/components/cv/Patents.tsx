import React, { useState } from 'react';
import { Row, Col } from 'react-bootstrap'

const docLocation = "https://stephen.buddbliss.com/documents/"

interface AccordionProps {
    children: React.ReactNode;
}

function Accordion({ children }: AccordionProps) {

    const [currentKey, setCurrentKey] = useState(-1)

    const childrenWithProps = React.Children.map(children, child => {

        if (React.isValidElement(child)) {
            return React.cloneElement(child, { currentKey, setCurrentKey });
        }
        return child;
    });

    return <div>{childrenWithProps}</div>
}
interface AccordionItemProps {
    children: React.ReactNode;
    eventKey: number;
    currentKey?: number;
    setCurrentKey?: (key: number) => void;
}

function AccordionItem({ children, eventKey, currentKey, setCurrentKey }: AccordionItemProps) {

    return (
        <>
            <div onMouseEnter={() => setCurrentKey(eventKey)} onMouseLeave={() => setCurrentKey(-1)} >
                {children[0]}

                {currentKey === eventKey ? <>{children[1]}</> : null}
            </div>

        </>
    );
}

export default function Patents() {

    return (<>
        <Row className="cvLists">
            <Col xs={12}>


                <h4>Patents</h4>

                <Accordion>
                    <AccordionItem eventKey={0}>
                        <div className="card-header">
                            <li>
                                <a href={docLocation + "US6445223.pdf"} target="_blank" rel="noreferrer" data-toggle="collapse" data-target="#collapseOne" aria-expanded="true" aria-controls="collapseOne">
                                    Line driver with an integrated termination
                                </a>
                            </li>
                        </div>
                        <div className="card-body">
                            <ul>
                                <li>Patent number: 6,445,223</li>
                                <li>Date of Patent: September 3, 2002</li>
                            </ul>
                        </div>
                    </AccordionItem>
                    <AccordionItem eventKey={1}>
                        <div className="card-header">
                            <li>
                                <a href={docLocation + "US6573785.pdf"} target="_blank" rel="noreferrer" data-toggle="collapse" data-target="#collapseTwo" aria-expanded="true" aria-controls="collapseOne">
                                    Method, apparatus, and system for common mode feedback circuit using switched capacitors
                                </a>
                            </li>
                        </div>
                        <div className="card-body">
                            <ul>
                                <li>Patent number:  6,573,785</li>
                                <li>Date of Patent: June 3, 2003</li>
                            </ul>
                        </div>
                    </AccordionItem>
                    <AccordionItem eventKey={2}>
                        <div className="card-header">
                            <li>
                                <a href={docLocation + "US20030031139A1.pdf"} target="_blank" rel="noreferrer" data-toggle="collapse" data-target="#collapseThree" aria-expanded="true" aria-controls="collapseOne">
                                    Echo cancellation circuit
                                </a>
                            </li>
                        </div>
                        <div className="card-body">
                            <ul>
                                <li>Application US20030031139A1</li>
                                <li>Feb. 13, 2003 Abandoned</li>
                            </ul>
                        </div>
                    </AccordionItem>
                    <AccordionItem eventKey={3}>
                        <div className="card-header">
                            <li>
                                <a href={docLocation + "documents/US6621445.pdf"} target="_blank" rel="noreferrer" data-toggle="collapse" data-target="#collapseFour" aria-expanded="true" aria-controls="collapseOne">
                                    Low power reference buffer circuit utilizing switched capacitors
                                </a>
                            </li>
                        </div>
                        <div className="card-body">
                            <ul>
                                <li>Patent number: 6,621,445  </li>
                                <li>Date of Patent: September 16, 2003 </li>
                            </ul>
                        </div>
                    </AccordionItem>
                    <AccordionItem eventKey={4}>
                        <div className="card-header">
                            <li>
                                <a href={docLocation + "US20160285453A1.pdf"} target="_blank" rel="noreferrer" data-toggle="collapse" data-target="#collapseFive" aria-expanded="true" aria-controls="collapseOne">
                                    Driver using pull-up nmos transistor
                                </a>
                            </li>
                        </div>
                        <div className="card-body">
                            <ul>
                                <li>Application US20160285453A1</li>
                                <li>September 29, 2016 Abandoned</li>
                            </ul>
                        </div>
                    </AccordionItem>
                    <AccordionItem eventKey={5}>
                        <div className="card-header">
                            <li>
                                <a href={docLocation + "US9762231.pdf"} target="_blank" rel="noreferrer" data-toggle="collapse" data-target="#collapseSix" aria-expanded="true" aria-controls="collapseOne">
                                    Transistors configured for gate overbiasing and circuits therefrom
                                </a>
                            </li>
                        </div>
                        <div className="card-body">
                            <ul>
                                <li>Patent number: 9,762,231 </li>
                                <li>Date of Patent: September 12, 2017</li>
                            </ul>
                        </div>
                    </AccordionItem>
                    <AccordionItem eventKey={6}>
                        <div className="card-header">
                            <li>
                                <a href={docLocation + "US9910482.pdf"} target="_blank" rel="noreferrer" data-toggle="collapse" data-target="#collapseSeven" aria-expanded="true" aria-controls="collapseOne">
                                    Memory interface with adjustable voltage and termination and methods of use
                                </a>
                            </li>
                        </div>
                        <div className="card-body">
                            <ul>
                                <li>Patent number: 9,910,482 </li>
                                <li>Date of Patent: March 6, 2018</li>
                            </ul>
                        </div>
                    </AccordionItem>
                    <AccordionItem eventKey={7}>
                        <div className="card-header">
                            <li>
                                <a href={docLocation + "US9859888.pdf"} target="_blank" rel="noreferrer" data-toggle="collapse" data-target="#collapseEight" aria-expanded="true" aria-controls="collapseOne">
                                    Transmitter with feedback terminated preemphasis
                                </a>
                            </li>
                        </div>
                        <div className="card-body">
                            <ul>
                                <li>Patent number: 9,859,888 </li>
                                <li>Date of Patent: January 2, 2018</li>
                            </ul>
                        </div>
                    </AccordionItem>
                    <AccordionItem eventKey={8}>
                        <div className="card-header">
                            <li>
                                <a href={docLocation + "US9698782.pdf"} target="_blank" rel="noreferrer" data-toggle="collapse" data-target="#collapseNine" aria-expanded="true" aria-controls="collapseOne">
                                    Systems and methods to provide charge sharing at a transmit buffer circuit
                                </a>
                            </li>
                        </div>
                        <div className="card-body">
                            <ul>
                                <li>Patent number: 9,698,782 </li>
                                <li>Date of Patent: July 4, 2017</li>
                            </ul>
                        </div>
                    </AccordionItem>
                </Accordion>

            </Col>
        </Row>
    </>
    )
}