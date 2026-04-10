/**
 * @file ProgressBar.tsx
 * @description Visual indicator for web-worker evaluation progress.
 *
 * The progress value (0–100) is read directly from {@link useWordEvaluator}.
 * The bar is hidden when progress reaches 100 (i.e., workers are idle).
 * It appears and animates during the `getNextBestWord()` computation triggered
 * by pressing **Go** or **Recalculate**.
 */

import React from 'react';
import { Col } from 'react-bootstrap';
import './Wordle.css';
import { useWordEvaluator } from '../context/useWordEvaluator';

/**
 * Renders a green progress bar that reflects the current web-worker evaluation status.
 *
 * The bar is visible only while `progress < 100`. Each worker reports incremental
 * progress every 20 words evaluated; the main thread accumulates these and updates
 * the `progress` state in {@link useWordEvaluator}.
 *
 * @returns {JSX.Element} An empty fragment when idle, or a labelled progress bar when computing.
 */
export default function ProgressBar() {
    const { progress } = useWordEvaluator();

    return (
        <>
            {progress < 100 && (
                <>
                    <Col xs={2} lg={1}>progress:</Col>
                    <Col xs={7} md={7} lg={5} xl={4}>
                        <div style={{ border: "2px solid black" }}>
                            <div style={{ backgroundColor: "green", width: progress + "%", height: "15px" }} />
                        </div>
                    </Col>
                </>
            )}
        </>
    )
}
