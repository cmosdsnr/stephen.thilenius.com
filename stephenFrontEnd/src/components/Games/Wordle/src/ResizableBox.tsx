/**
 * ResizableBox.jsx
 * A wrapper component providing optional resizable functionality around its children.
 */

import React from "react";
import { ResizableBox as ReactResizableBox } from "react-resizable";
import "react-resizable/css/styles.css";
import './Wordle.css';

interface Props {
    children?: React.ReactNode;
    width?: number | string;
    height?: number;
    resizable?: boolean;
    style?: React.CSSProperties;
    className?: string;
}

/**
 * Renders a resizable (or fixed size) container for any child content.
 * @param {Object} props
 * @param {React.ReactNode} props.children - Components or elements to be wrapped.
 * @param {number|string} [props.width='100%'] - Initial width of the box.
 * @param {number} [props.height=300] - Initial height of the box.
 * @param {boolean} [props.resizable=true] - Whether the box should be resizable.
 * @param {Object} [props.style={}] - Optional inline styles.
 * @param {string} [props.className=""] - Optional className to apply to the inner content.
 * @returns {JSX.Element}
 */
export default function ResizableBox({
    children,
    width = '100%',
    height = 300,
    resizable = true,
    style = {},
    className = "",
}: Props) {
    return (
        <div style={{ marginLeft: 20 }}>
            <div
                style={{
                    display: "inline-block",
                    width: "auto",
                    background: "white",
                    padding: ".5rem",
                    borderRadius: "0.5rem",
                    boxShadow: "0 30px 40px rgba(0,0,0,.1)",
                    ...style,
                }}
            >
                {resizable ? (
                    <ReactResizableBox width={width} height={height}>
                        <div style={{ width: "100%", height: "100%" }} className={className}>
                            {children}
                        </div>
                    </ReactResizableBox>
                ) : (
                    <div
                        style={{
                            width: typeof width === 'number' ? `${width}px` : width,
                            height: `${height}px`,
                        }}
                        className={className}
                    >
                        {children}
                    </div>
                )}
            </div>
        </div>
    );
}

/*
Suggested CSS (optional override styles):

*/
