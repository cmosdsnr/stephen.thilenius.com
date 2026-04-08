import React, { useEffect, useState } from 'react';
import { Button } from 'react-bootstrap';
import Worker from './worker.ts?worker';
import { JsonFileLoader } from './JsonFileLoader';
import { top } from '@popperjs/core';
import { set } from 'lodash';

export const Primes = () => {
    const [primes, setPrimes] = useState<number[][]>([[2, 0], [5, 0], [7, 6], [11, 2], [13, 6], [17, 16], [19, 18], [23, 22], [29, 28], [31, 30], [37, 36], [41, 40], [43, 42], [47, 46], [53, 52], [59, 58], [61, 60]]);
    const [display, setDisplay] = useState(true);
    const [top100, setTop100] = useState<number[][]>([]);
    const [top100p, setTop100p] = useState<number[][]>([]);
    const [maxPrime, setMaxPrime] = useState<number>(11);

    // find primes and their repeating period from the last prime in primes up to max
    const runInParallel = async (max: number, primes: number[][]): Promise<number[][]> => {

        let allPrimes: number[][] = [...primes];
        let to = allPrimes[allPrimes.length - 1][0] ** 2;
        if (to > max) to = max;
        console.log("max: ", max, "to: ", to);
        const chunkSize = 5000000;
        console.log("allPrimes is: ", allPrimes.length);
        do {
            const totalChunks = Math.ceil((to - allPrimes[allPrimes.length - 1][0]) / chunkSize);
            const maxConcurrency = Math.min(navigator.hardwareConcurrency / 2 || 4, totalChunks);
            console.log("totalChunks: ", totalChunks, "maxConcurrency: ", maxConcurrency);
            let completedCount = 0;
            let nextIndex = 0;
            const offset = allPrimes.length > 0 ? allPrimes[allPrimes.length - 1][0] + 2 : 5;

            // const order = Array.from({ length: totalChunks }, (_, i) => i)
            //     .sort(() => Math.random() - 0.5);

            let newPrimesAry: number[][][] = [];
            let newPrimes: number[][] = await new Promise((resolve) => {
                const startTask = (taskIndex: number) => {
                    // if (taskIndex == 23) debugger;
                    const worker = new Worker();
                    let finished = false;

                    const complete = (label: string) => {
                        if (finished) return;
                        finished = true;
                        completedCount++;

                        if (completedCount % 10 === 0) {
                            console.log(`Progress: ${completedCount}/${totalChunks}`);
                        }

                        if (nextIndex < totalChunks) {
                            startTask(nextIndex++);
                        } else if (completedCount === totalChunks) {
                            console.log("✅ All workers completed");
                            // console.log("newPrime blocks: ", newPrimesAry.length);
                            // Merge all results
                            const primes = newPrimesAry.flat();
                            // sort allPrimes by prime
                            primes.sort((a, b) => a[0] - b[0]);
                            resolve(primes);
                        }
                    };

                    worker.addEventListener("message", (e) => {
                        if (e.data.type === "complete") {
                            const r = e.data.results;
                            console.log(`Chunk ${taskIndex} completed in ${r.duration}ms`);
                            newPrimesAry.push(r.primes);
                            // console.log("new Primes: ", r.primes.length);
                            worker.terminate();
                            complete("message");
                        }
                    });

                    worker.addEventListener("error", (e) => {
                        console.error(`❌ Worker ${taskIndex} error:`, e.message);
                        worker.terminate();
                        complete("error");
                    });

                    const start = offset + taskIndex * chunkSize;
                    let end = offset + (taskIndex + 1) * chunkSize - 2;
                    if (end > to) end = to;
                    // console.log(`Worker ${taskIndex} processing range: ${start} to ${end}`);
                    worker.postMessage([allPrimes, start, end]);
                };

                // Start initial batch
                console.log("Starting workers: ", maxConcurrency);
                for (let i = 0; i < maxConcurrency && i < totalChunks; i++) {
                    startTask(nextIndex++);
                }
            });
            allPrimes = [...allPrimes, ...newPrimes];
            console.log("allPrimes is now: ", allPrimes.length);
            if (to == max) break;
            to = allPrimes[allPrimes.length - 1][0] ** 2;
            if (to > max) to = max;
            console.log("max: ", max, "to: ", to);
        } while (1)
        return allPrimes;
    };

    // const findShortRepeats = async (): Promise<number[][]> => {
    //     const totalChunks = 2000;
    //     const chunkSize = 2000;
    //     const maxConcurrency = Math.min(navigator.hardwareConcurrency || 4, totalChunks);

    //     let completedCount = 0;
    //     let nextIndex = 0;
    //     let max = 0;
    //     const offset = maxPrime;

    //     const allResults: number[][] = [];

    //     return new Promise((resolve) => {
    //         const startTask = (taskIndex: number) => {
    //             const worker = new Worker();
    //             let finished = false;

    //             const complete = () => {
    //                 if (finished) return;
    //                 finished = true;
    //                 completedCount++;

    //                 if (completedCount % 10 === 0) {
    //                     console.log(`Progress: ${completedCount}/${totalChunks}`);
    //                 }

    //                 if (nextIndex < totalChunks) {
    //                     startTask(nextIndex++);
    //                 } else if (completedCount === totalChunks) {
    //                     // Merge all results
    //                     const merged = [...top100, ...allResults];
    //                     const deduped = Array.from(new Map(
    //                         merged.map(p => [p[0], p])
    //                     ).values());
    //                     const sorted = deduped
    //                         .map(p => [...p, (p[1] > 0 ? (p[0] - 1) / p[1] : Infinity)])
    //                         .sort((a, b) => b[2] - a[2])
    //                         .slice(0, 100);
    //                     setTop100(sorted);
    //                     setMaxPrime(max);
    //                     resolve(sorted);
    //                 }
    //             };

    //             worker.addEventListener("message", (e) => {
    //                 if (e.data.type === "complete") {
    //                     const primes = e.data.results.primes;
    //                     if (Array.isArray(primes)) {
    //                         max = max < primes[primes.length - 1][0] ? primes[primes.length - 1][0] : max;
    //                         allResults.push(...primes);
    //                     }
    //                     worker.terminate();
    //                     complete();
    //                 }
    //             });

    //             worker.addEventListener("error", (e) => {
    //                 console.error(`❌ Worker ${taskIndex} error:`, e.message);
    //                 worker.terminate();
    //                 complete();
    //             });

    //             worker.addEventListener("exit", () => {
    //                 complete(); // even if no message
    //             });

    //             const start = offset + taskIndex * chunkSize;
    //             const end = offset + (taskIndex + 1) * chunkSize;
    //             worker.postMessage([start, end]);
    //         };

    //         for (let i = 0; i < maxConcurrency && i < totalChunks; i++) {
    //             startTask(nextIndex++);
    //         }
    //     });
    // };

    const saveFile = () => {
        //save primes to a file called primes.json
        const blob = new Blob([JSON.stringify(primes)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'primes.json';
        document.body.appendChild(a);
        a.click();
        URL.revokeObjectURL(url);
        document.body.removeChild(a);
        console.log("All primes saved to primes.json");
    }

    useEffect(() => {
        console.log("Primes updated:", primes.length);
    }, [primes]);

    const handle = () => {
        setDisplay(false);
        console.log("starting workers");
        runInParallel(1_000_000_000, primes).then((allPrimes) => {
            setPrimes(allPrimes)
            setDisplay(true);
        });
    };


    const handleRepeats = () => {
        setDisplay(false);
        console.log("starting workers");
        // findShortRepeats().then((data) => {
        //     setDisplay(true);
        // });
    };

    useEffect(() => {
        if (primes.length > 0) {
            console.log("Primes found:", primes.length);
            setTops();
            setTopsp();
            setMaxPrime(primes[primes.length - 1][0]);
        }
    }, [primes]);

    const setTops = () => {
        let sorted = [...primes].sort((a, b) => {
            const ratioA = a[1] > 0 ? (a[0] - 1) / a[1] : Infinity;
            const ratioB = b[1] > 0 ? (b[0] - 1) / b[1] : Infinity;
            return ratioB - ratioA;
        }).slice(0, 102);
        sorted.shift(); // remove the 2
        sorted.shift(); // remove the 5

        // add the ratio to the end of each array
        sorted = sorted.map((p) => {
            const ratio = p[1] > 0 ? (p[0] - 1) / p[1] : Infinity;
            return [...p, ratio];
        });
        setTop100(sorted);

        console.log("Top 100 primes:", sorted);
    };

    const setTopsp = () => {
        let sorted = [...primes].sort((a, b) => {
            return a[1] - b[1];
        }).slice(0, 102);
        // sorted.shift(); // remove the 2
        // sorted.shift(); // remove the 5

        // add the ratio to the end of each array
        sorted = sorted.map((p) => {
            const ratio = p[1] > 0 ? (p[0] - 1) / p[1] : Infinity;
            return [...p, ratio];
        });
        setTop100p(sorted);

        console.log("Top 100 primesp:", sorted);
    };

    const SortByPeriodLengthRatio = () => {
        setPrimes(prevPrimes => {
            const sorted = [...prevPrimes].sort((a, b) => {
                const ratioA = a[1] > 0 ? (a[0] - 1) / a[1] : Infinity;
                const ratioB = b[1] > 0 ? (b[0] - 1) / b[1] : Infinity;
                return ratioB - ratioA;
            });
            return sorted;
        });
    };
    const SortByPrime = () => {
        setPrimes(prevPrimes => {
            const sorted = [...prevPrimes].sort((a, b) => a[0] - b[0]);
            return sorted;
        });
    };
    const SortByPeriod = () => {
        setPrimes(prevPrimes => {
            const sorted = [...prevPrimes].sort((a, b) => a[1] - b[1]);
            return sorted;
        });
    };

    const renderTableBody = (data: number[][]) => {
        if (data.length === 0) return null;
        let p = [...data].slice(0, 40000);

        const groupCount = 6; // 6 groups of 3 = 18 columns
        const chunkSize = Math.ceil(p.length / groupCount);
        const columnChunks: number[][][] = Array.from({ length: groupCount }, (_, i) =>
            p.slice(i * chunkSize, (i + 1) * chunkSize)
        );

        const maxRows = Math.max(...columnChunks.map(col => col.length));

        return (
            <table border={1} cellPadding={4} cellSpacing={0} className="my-5">
                <thead>
                    <tr>
                        {[...Array(6)].map((_, i) => (
                            <React.Fragment key={i}>
                                <th className="font-bold bg-[rgb(214,238,238)] p-2">Prime</th>
                                <th className="font-bold bg-[rgb(214,238,238)] p-2">Period</th>
                                <th className="font-bold bg-[rgb(214,238,238)] p-2 border-r-2 border-r-[#999]">(p−1)/period</th>
                            </React.Fragment>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {Array.from({ length: maxRows }).map((_, rowIndex) => (
                        <tr key={rowIndex}>
                            {columnChunks.map((col, colIndex) => {
                                const pair = col[rowIndex];
                                if (pair) {
                                    const [prime, period] = pair;
                                    const ratio = period > 0 ? ((prime - 1) / period).toString() : '';
                                    return (
                                        <React.Fragment key={colIndex}>
                                            <td className="text-blue-600">{prime.toLocaleString()}</td>
                                            <td className="text-green-600">{period.toLocaleString()}</td>
                                            <td className="text-purple-600 border-r-2 border-r-[#999] pr-2">{ratio.toLocaleString()}</td>
                                        </React.Fragment>
                                    );
                                } else {
                                    return (
                                        <>
                                            <td></td>
                                            <td></td>
                                            <td></td>
                                        </>
                                    );
                                }
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        )
    };

    return (
        <>
            <Button variant="primary" onClick={handle} >
                {`Do ${maxPrime.toLocaleString()} thru ${(maxPrime + 500000).toLocaleString()} in parallel`}
            </Button>
            <Button variant="primary" onClick={handleRepeats} >
                {`findShortRepeats ${maxPrime.toLocaleString()} thru ${(maxPrime + 500000).toLocaleString()} in parallel`}
            </Button>
            {display && <>
                {renderTableBody(top100)}
                {renderTableBody(top100p)}
                {renderTableBody(primes)}
            </>
            }
        </>
    );
};
