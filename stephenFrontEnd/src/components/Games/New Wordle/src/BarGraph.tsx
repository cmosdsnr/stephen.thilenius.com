import React, { useEffect, useState } from 'react'
// import { AxisOptions, Chart } from "react-charts";
import ResizableBox from "./ResizableBox";


type BinType = {
    bin: String,
    number: number,
}

type Series = {
    label: string,
    data: BinType[]
}

export function BarGraph({ d, x }: { d: number[], x: number[] }) {
    const [data, setData] = useState<Series[]>(
        [{
            data: [
                { bin: '0', number: 12 },
            ],
            label: "bin distribution",
        }]
    )

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

    // const primaryAxis = React.useMemo<
    //     AxisOptions<BinType>
    // >(
    //     () => ({
    //         getValue: (datum) => datum.bin,
    //         show: false,
    //     }),
    //     []
    // )

    // const secondaryAxes = React.useMemo<
    //     AxisOptions<BinType>[]
    // >(
    //     () => [
    //         {
    //             position: "left",
    //             min: 0,
    //             getValue: (datum) => datum.number,
    //         },
    //     ],
    //     []
    // )

    return (
        <>
            {/* {data[0].data.length < 2 ? <></> :
                <ResizableBox style={{
                    background: "rgba(255, 255, 255, 0.2)",
                    padding: ".5rem",
                    borderRadius: "5px",
                    border: "1px solid black",
                    width: "100%"
                }}>
                    <Chart
                        options={{
                            data,
                            primaryAxis,
                            secondaryAxes,
                        }}
                    />

                </ResizableBox>
            } */}
        </>
    )
}




// useEffect(() => {
//     // const d = [...local]
//     // d[0].data = []
//     // data.map((v, i) => {
//     //     d[0].data.push({
//     //         bin: i.toString(),
//     //         number: v
//     //     })
//     // })
//     // setLocal(d)
//     // console.log(d)
//     console.log(data)
//     console.log(local)

// }, [data])