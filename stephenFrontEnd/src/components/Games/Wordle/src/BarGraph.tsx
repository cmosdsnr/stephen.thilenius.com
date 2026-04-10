/**
 * @file BarGraph.tsx
 * @description Bar graph component for displaying the bin-distribution of a Wordle guess evaluation.
 *
 * Each "bin" represents one of the 243 possible 5-letter accuracy patterns (base-3 encoding).
 * A flat distribution across bins is ideal — it means the guess splits the possible answers evenly.
 *
 * NOTE: The chart rendering is currently disabled (commented out). The component accepts data
 * but renders nothing. The react-charts dependency was removed; re-enable by restoring the
 * Chart import and the JSX block inside the return statement.
 */

import React, { useEffect, useState } from 'react'
import ResizableBox from "./ResizableBox";

/** A single bar in the chart — one accuracy-pattern bin and its count. */
type BinType = {
    /** The bin index (0–242), encoded as a string for chart axis labelling. */
    bin: String,
    /** How many possible-answer words fall into this bin for the evaluated guess. */
    number: number,
}

/** Chart series wrapper required by react-charts. */
type Series = {
    label: string,
    data: BinType[]
}

/**
 * Renders a bar graph showing how a candidate guess distributes possible answers across bins.
 *
 * @param {Object}   props
 * @param {number[]} props.d - Array of bin counts (one value per occupied bin).
 * @param {number[]} props.x - Parallel array of bin indices corresponding to `d`.
 * @returns {JSX.Element} An empty fragment (chart is currently disabled).
 */
export function BarGraph({ d, x }: { d: number[], x: number[] }) {
    const [data, setData] = useState<Series[]>(
        [{
            data: [
                { bin: '0', number: 12 },
            ],
            label: "bin distribution",
        }]
    )

    // Rebuild chart series whenever the bin data changes.
    useEffect(() => {
        if (d != undefined) {
            const z = [...data]
            z[0].data = []
            d.map((v, i) => {
                z[0].data.push({
                    bin: x[i].toString(),
                    number: v
                })
            })
            setData(z)
        }
    }, [d])

    // Chart rendering is disabled — restore the Chart import and JSX block below to re-enable.
    return (
        <>
            {/* Disabled: requires react-charts Chart component
                <ResizableBox style={{ background: "rgba(255,255,255,0.2)", padding: ".5rem",
                    borderRadius: "5px", border: "1px solid black", width: "100%" }}>
                    <Chart options={{ data, primaryAxis, secondaryAxes }} />
                </ResizableBox>
            */}
        </>
    )
}
