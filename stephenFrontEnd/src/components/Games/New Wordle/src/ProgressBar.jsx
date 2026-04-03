/**
 * ProgressBar.jsx
 * Shows a visual indicator of word calculation progress.
 */

import React from 'react';
import { Col } from 'react-bootstrap';
import './Wordle.css';
import { useWordEvaluator } from '../context/useWordEvaluator';

/**
 * Displays a progress bar if progress is incomplete and 'show' is true.
 * @param {Object} props
 * @param {number} props.progress - Progress value (0–100).
 * @param {boolean} props.show - Flag indicating if progress bar should be shown.
 * @returns {JSX.Element|null}
 */
// export default function ProgressBar({ progress, show }) {
//     if (!show || progress === 100) return null;

//     return (
//         <>
//             <Col xs={2} lg={1}>progress:</Col>
//             <Col xs={7} md={7} lg={5} xl={4}>
//                 <div className="progress-container">
//                     <div
//                         className="progress-bar"
//                         style={{ width: `${progress}%` }}
//                     ></div>
//                 </div>
//             </Col>
//         </>
//     );
// }


export default function ProgressBar() {
    const { progress } = useWordEvaluator();
    return (<>
        {progress < 100 && <>
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
