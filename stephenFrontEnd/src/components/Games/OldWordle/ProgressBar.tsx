import React from 'react'
import { Row, Col } from 'react-bootstrap'

interface Props {
    progress: number;
    show: boolean;
}

export default function ProgressBar({ progress, show }: Props) {
    return (<>
        {progress === 100 || !show ? <></> : <>
            <Col xs={2} lg={1}>progress:</Col>
            <Col xs={7} md={7} lg={5} xl={4}>
                <div style={{ border: "2px solid black" }}>
                    <div style={{ backgroundColor: "green", width: progress + "%", height: "15px" }}></div>
                </div>
            </Col>
        </>
        }
    </>
    )
}
