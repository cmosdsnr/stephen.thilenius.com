import React, { useState, useEffect, useRef } from 'react';
import { RankedGuess } from '../context/types'
import { Row, Col, Button, Table } from 'react-bootstrap'
import Quord from './Quord'
import { PossibleWordsTable } from './WordListPopover'
import Blossom from '../../Blossom/Blossom'
import ProgressBar from './ProgressBar'
import { WordleProvider, useWordle } from '../context/WordleContext'
import { firstGuess } from './Guesses'
import "./Wordle.css"

import checkMark from "../images/checkMark.png?as=png&width=40"

/**
 * Top-level component to toggle between Wordle, Quordle, Octordle, and Blossom games.
 * Maintains selection state and wraps Wordle-based games in context provider.
 *
 * @returns {JSX.Element} The rendered Wordle selection UI and game display.
 */
export default function Wordle() {
    const [selector, setSelector] = useState(0)

    return (
        <>
            <div className="selector">
                <span onClick={() => setSelector(0)} style={{ backgroundColor: selector == 0 ? "lightblue" : "beige" }}>Wordle</span>
                <span onClick={() => setSelector(1)} style={{ backgroundColor: selector == 1 ? "lightblue" : "beige" }}>Quordle</span>
                <span onClick={() => setSelector(2)} style={{ backgroundColor: selector == 2 ? "lightblue" : "beige" }}>Octordle</span>
                <span onClick={() => setSelector(3)} style={{ backgroundColor: selector == 3 ? "lightblue" : "beige" }}>Blossom</span>
            </div>
            {selector < 3 ?
                <WordleProvider>
                    <WordleCore selector={selector} />
                </WordleProvider> :
                <Blossom />
            }
        </>
    )
}

function useLocalStorageBool(key: string, defaultValue = false): [boolean, (v: boolean) => void] {
    const [value, setValue] = useState<boolean>(() => {
        const stored = localStorage.getItem(key)
        return stored !== null ? stored === 'true' : defaultValue
    })
    const setAndStore = (v: boolean) => {
        localStorage.setItem(key, String(v))
        setValue(v)
    }
    return [value, setAndStore]
}

interface WordleCoreProps {
    selector: number;
}

/**
 * Core component for Wordle, Quordle, and Octordle logic and UI.
 * Handles user interactions, word selection, testing, and visualization.
 *
 * @param {Object} props - Component props.
 * @param {number} props.selector - Indicates which game variant is selected (0 = Wordle, 1 = Quordle, 2 = Octordle).
 * @returns {JSX.Element} The rendered game interface and tools.
 */
function WordleCore({ selector }: WordleCoreProps) {
    const {
        gameData, replaceWord, checkWord,
        changeNumberWords, isWord,
        nextWord, getBestStartWord, getWordDeviation, getBestSecondWords,
        loadLongList, loadShortList, letterCounts, current
    } = useWordle()

    const [editWord, setEditWord] = useState("")
    const [testWord, setTestWord] = useState(firstGuess)
    // const [word, setWord] = useState("");

    const [stat, setStat] = useState<RankedGuess>({ score: 0, word: '' })
    const [showHowTo, setShowHowTo] = useLocalStorageBool('wordle.showHowTo.v2', true)
    const [showAlgorithm, setShowAlgorithm] = useLocalStorageBool('wordle.showAlgorithm.v2', true)
    const [showCountTable, setShowCountTable] = useLocalStorageBool('wordle.showCountTable')
    const [showPctTable, setShowPctTable] = useLocalStorageBool('wordle.showPctTable')
    const [showPossibleWords, setShowPossibleWords] = useLocalStorageBool('wordle.showPossibleWords')
    const [showBestWords, setShowBestWords] = useLocalStorageBool('wordle.showBestWords')
    const [previousWords, setPreviousWords] = useState([])
    const btnRef = useRef()

    useEffect(() => {
        if (gameData?.length > 0 && gameData[gameData.length - 1].word)
            setEditWord(gameData[gameData.length - 1].word)
    }, [gameData])

    useEffect(() => {
        if (isWord && btnRef.current) btnRef.current.focus()
    }, [isWord])

    useEffect(() => {
        changeNumberWords(selector == 0 ? 1 : selector == 1 ? 4 : 8)
    }, [selector])

    // useEffect(() => {
    //     if (word?.length === 5) {
    //         setEditWord(word)
    //     }
    // }, [word])

    /**
     * Adds the current word to the list of previously used words,
     * ensuring a maximum of 10 entries.
     */
    const addToPreviousWords = () => {
        if (!previousWords.includes(editWord)) {
            let p = [...previousWords, editWord]
            while (p.length > 10) p.shift()
            setPreviousWords(p)
        }
    }

    /**
     * Clears other guesses and proceeds to the next word.
     */
    const handleNextWord = () => {
        addToPreviousWords()
        nextWord()
    }

    /**
     * Handles test word input change and updates its deviation stat.
     * @param {React.ChangeEvent<HTMLInputElement>} e - The input event.
     */
    const handleTestWordChange = (e) => {
        const upper = e.target.value.toUpperCase()
        setTestWord(upper)
        if (upper.length === 5)
            setStat(getWordDeviation(upper, current.inputLists[0], current.letterValue))
    }

    /**
     * Handles the editing of the current word and replaces it if valid.
     * @param {React.ChangeEvent<HTMLInputElement>} e - The input event.
     */
    const handleWordChange = (e) => {
        setEditWord(e.target.value)
        if (e.target.value.length === 5 && checkWord(e.target.value.toUpperCase())) {
            replaceWord(e.target.value.toUpperCase())
        } else {
        }
    }

    /**
     * Logs best second words to the console.
     */
    const secondWords = () => {
        let s = getBestSecondWords()
        console.log(s)
    }

    /**
     * Switches between long and short word lists based on checkbox state.
     * @param {React.MouseEvent<HTMLInputElement>} e - The event triggered by clicking the checkbox.
     */
    const switchList = (e) => {
        if (!e.target.checked)
            loadShortList()
        else
            loadLongList()
    }

    /**
     * Blurs the word input (no-op handler).
     */
    const handleWordBlur = () => { }

    const cardStyle: React.CSSProperties = {
        background: 'white',
        border: '1px solid #e2e8f0',
        borderRadius: 8,
        boxShadow: '0 2px 12px rgba(0,24,48,0.07)',
        marginBottom: '1.5rem',
        overflow: 'hidden',
    }
    const cardHeaderStyle: React.CSSProperties = {
        background: '#001830',
        borderBottom: '2px solid #f59e0b',
        padding: '0.75rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        cursor: 'pointer',
        userSelect: 'none',
    }
    const cardHeaderTextStyle: React.CSSProperties = {
        fontFamily: 'Rajdhani, sans-serif',
        fontWeight: 700,
        fontSize: '0.85rem',
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        color: '#f59e0b',
    }
    const cardBodyStyle: React.CSSProperties = {
        padding: '1.25rem',
    }
    const descStyle: React.CSSProperties = {
        fontFamily: 'Rajdhani, sans-serif',
        fontWeight: 500,
        fontSize: '0.95rem',
        color: '#4a6a8a',
        marginBottom: '0.75rem',
    }
    const adminBtnStyle: React.CSSProperties = {
        fontFamily: 'Rajdhani, sans-serif',
        fontWeight: 700,
        fontSize: '0.8rem',
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        background: '#f59e0b',
        color: '#001830',
        border: '1px solid #f59e0b',
        borderRadius: 4,
        padding: '0.35rem 0.9rem',
        cursor: 'pointer',
        marginBottom: '0.5rem',
    }

    return (
        <div>
            {/* ── How to Use ── */}
            <div style={{ ...cardStyle, margin: '1rem 1.5rem 0 1.5rem' }}>
                <div style={cardHeaderStyle} onClick={() => setShowHowTo(!showHowTo)}>
                    <span style={{ ...cardHeaderTextStyle, marginRight: 'auto' }}>How to Use This Tool</span>
                    <span style={{ color: '#f59e0b', fontSize: '0.8rem', fontFamily: 'Rajdhani, sans-serif' }}>{showHowTo ? '▲ Hide' : '▼ Show'}</span>
                </div>
                {showHowTo && (
                    <div style={{ ...cardBodyStyle, lineHeight: 1.7 }}>
                        <p style={{ ...descStyle, marginBottom: '0.5rem' }}>
                            This is a <strong>Wordle solver assistant</strong>. It analyses the remaining possible answers after each guess
                            and suggests the single word that will most evenly split those candidates — giving you the best chance of solving
                            the puzzle in the fewest guesses. It supports three variants:
                        </p>
                        <ul style={{ ...descStyle, marginBottom: '0.75rem', paddingLeft: '1.25rem' }}>
                            <li><strong>Wordle</strong> — one hidden 5-letter word.</li>
                            <li><strong>Quordle</strong> — four hidden words solved simultaneously with shared guesses.</li>
                            <li><strong>Octordle</strong> — eight hidden words solved simultaneously.</li>
                        </ul>

                        <p style={{ ...descStyle, fontWeight: 700, marginBottom: '0.25rem' }}>Step-by-step workflow</p>
                        <ol style={{ ...descStyle, paddingLeft: '1.25rem', marginBottom: '0.75rem' }}>
                            <li>
                                <strong>Enter the suggested word</strong> into your Wordle game. The <em>Edit Word</em> field at the top lets you
                                override the suggestion with any 5-letter word — a green check mark confirms it is in the word list.
                            </li>
                            <li>
                                <strong>Mark each tile</strong> with the colour Wordle returned:
                                <strong>left-click</strong> to toggle <span style={{ color: 'hsl(50,65%,45%)', fontWeight: 600 }}>Yellow</span> (letter present but wrong position),
                                and <strong>right-click</strong> to toggle <span style={{ color: 'hsl(120,55%,38%)', fontWeight: 600 }}>Green</span> (correct position).
                                Tiles start <span style={{ color: 'hsl(0,0%,40%)', fontWeight: 600 }}>Gray</span> (letter not in the word); clicking again resets a tile back to gray.
                            </li>
                            <li>
                                <strong>Press Go</strong> (or click the green button) once all five tiles are coloured. The tool calculates the
                                best next guess and advances to the next round.
                            </li>
                            <li>Repeat until the word is found (all tiles green).</li>
                        </ol>

                        <p style={{ ...descStyle, fontWeight: 700, marginBottom: '0.25rem' }}>Other controls</p>
                        <ul style={{ ...descStyle, paddingLeft: '1.25rem', marginBottom: '0.5rem' }}>
                            <li><strong>Back</strong> — undo the last committed guess and return to the previous state.</li>
                            <li><strong>New Game</strong> — reset everything and start fresh.</li>
                            <li>
                                <strong>Long list</strong> checkbox — toggles between the standard ~2 000-word Wordle answer list (default) and a
                                full ~12 000-word English dictionary. Use the long list if the puzzle source uses uncommon words.
                            </li>
                            <li>
                                <strong>Top 20 Words + Stats table</strong> — appears after the first guess. Shows the 20 best next guesses ranked
                                by deviation score. Click any row to use that word as the next guess. Right-click a word to permanently remove it
                                from the suggestion list if you know it is not a valid answer.
                            </li>
                            <li>
                                <strong>Bin Distribution chart</strong> — visualises how the current word splits the remaining candidates across
                                all 243 possible feedback patterns. Each coloured square sequence represents one pattern; the number beside it
                                is how many remaining answers fall into that group. A highlighted border shows the pattern you actually received.
                            </li>
                        </ul>
                    </div>
                )}
            </div>

            {/* Game Controls */}
            <Row style={{ paddingBottom: "10px", paddingTop: '15px' }}>
                <Col xs={4} md={3}>
                    <button
                        style={{ marginRight: "12px", backgroundColor: "lightgreen" }}
                        onClick={() => { handleNextWord() }}
                        ref={btnRef}
                        disabled={!isWord}
                    >Go</button>
                    <label>Edit Word:&nbsp;<input
                        style={{ textTransform: "uppercase" }}
                        type="text"
                        size="5"
                        value={editWord}
                        onBlur={handleWordBlur}
                        onChange={handleWordChange}
                    /></label>
                    {isWord ? <img style={{ marginLeft: '10px' }} alt='' src={checkMark} width="40" /> : <div style={{ paddingRight: '60px' }}></div>}
                </Col>
                <Col xs={4} md={3} >
                    <ProgressBar />
                </Col>
                <Col xs={4} md={3} >
                    <label>Long list&nbsp;</label><input type="checkbox" id="loadLongList" name="loadLongList" value="loadLongList" onClick={switchList} />
                </Col>
            </Row>

            {/* Quord Display */}
            <Row>
                <Col xs={{ span: 12, offset: 0 }}>
                    <Quord />
                </Col>
            </Row>

            {/* ── Admin-style tools section ── */}
            <hr className="wordle-divider" />
            <div style={{ marginTop: '1.5rem', marginLeft: '1.5rem', marginRight: '1.5rem' }}>

                {/* Possible Words Before This Guess */}
                <div style={cardStyle}>
                    <div style={cardHeaderStyle} onClick={() => setShowPossibleWords(!showPossibleWords)}>
                        <input type="checkbox" checked={showPossibleWords} onChange={e => setShowPossibleWords(e.target.checked)} onClick={e => e.stopPropagation()} style={{ marginRight: '10px', accentColor: '#f59e0b', cursor: 'pointer' }} />
                        <span style={cardHeaderTextStyle}>Possible Words Before This Guess</span>
                    </div>
                    {showPossibleWords && (
                        <div style={cardBodyStyle}>
                            <p style={descStyle}>
                                All candidate answers still in play before the current guess, sorted by deviation score.&nbsp;
                                <span style={{ color: 'hsl(120,60%,35%)', fontWeight: 600 }}>Green</span> = splits remaining candidates most evenly (best next guess) &nbsp;·&nbsp;
                                <span style={{ color: 'hsl(0,65%,45%)', fontWeight: 600 }}>Red</span> = splits least evenly. Click any word to use it as the guess.
                            </p>
                            <PossibleWordsTable wordIndex={0} />
                        </div>
                    )}
                </div>

                {/* Find Best Words */}
                <div style={cardStyle}>
                    <div style={cardHeaderStyle} onClick={() => setShowBestWords(!showBestWords)}>
                        <input type="checkbox" checked={showBestWords} onChange={e => setShowBestWords(e.target.checked)} onClick={e => e.stopPropagation()} style={{ marginRight: '10px', accentColor: '#f59e0b', cursor: 'pointer' }} />
                        <span style={cardHeaderTextStyle}>Find Best Words</span>
                    </div>
                    {showBestWords && (
                        <div style={cardBodyStyle}>
                            <Row>
                                <Col xs={12} sm={6} style={{ marginBottom: '1rem' }}>
                                    <button style={adminBtnStyle} onClick={() => getBestStartWord()}>Best Start Word</button>
                                    <p style={descStyle}>Finds the single opening guess that minimizes the average number of remaining candidates across all possible answers.</p>
                                </Col>
                                <Col xs={12} sm={6}>
                                    <button style={{ ...adminBtnStyle, background: 'transparent', color: '#6a9ac4', borderColor: '#1c3050' }} onClick={() => secondWords()}>Best Second Words</button>
                                    <p style={descStyle}>Given the current first guess, finds the follow-up words that best narrow down the remaining candidates.</p>
                                </Col>
                            </Row>
                        </div>
                    )}
                </div>

                {/* Letter Frequency by Position */}
                <div style={cardStyle}>
                    <div style={cardHeaderStyle} onClick={() => setShowCountTable(!showCountTable)}>
                        <input type="checkbox" checked={showCountTable} onChange={e => setShowCountTable(e.target.checked)} onClick={e => e.stopPropagation()} style={{ marginRight: '10px', accentColor: '#f59e0b', cursor: 'pointer' }} />
                        <span style={cardHeaderTextStyle}>Letter Frequency by Position</span>
                    </div>
                    {showCountTable && (
                        <div style={cardBodyStyle}>
                            <p style={descStyle}>How many times each letter appears at each word position (1–5) across all valid words. The Total row sums across all positions.</p>
                            <Table>
                                <thead>
                                    <tr>
                                        <th>Pos</th>
                                        {Array(26).fill(0).map((_, i) => <th key={i}>{String.fromCharCode(65 + i)}</th>)}
                                    </tr>
                                </thead>
                                <tbody>
                                    {Array(5).fill(0).map((_, j) => (
                                        <tr key={j}>
                                            <td>{j + 1}</td>
                                            {Array(26).fill(0).map((_, i) =>
                                                <td key={i}>{letterCounts.positionCounts?.[j]?.[i] ?? ""}</td>
                                            )}
                                        </tr>
                                    ))}
                                    <tr>
                                        <td><strong>Total</strong></td>
                                        {Array(26).fill(0).map((_, i) =>
                                            <td key={i}>{letterCounts.totalCounts?.[i] ?? ""}</td>
                                        )}
                                    </tr>
                                </tbody>
                            </Table>
                        </div>
                    )}
                </div>

                {/* Letter Frequency % by Position */}
                <div style={cardStyle}>
                    <div style={cardHeaderStyle} onClick={() => setShowPctTable(!showPctTable)}>
                        <input type="checkbox" checked={showPctTable} onChange={e => setShowPctTable(e.target.checked)} onClick={e => e.stopPropagation()} style={{ marginRight: '10px', accentColor: '#f59e0b', cursor: 'pointer' }} />
                        <span style={cardHeaderTextStyle}>Letter Frequency % by Position</span>
                    </div>
                    {showPctTable && (
                        <div style={cardBodyStyle}>
                            <p style={descStyle}>Percentage of words where each letter appears at each position (1–5). The Total row sums the percentages across all 5 positions.</p>
                            <Table>
                                <thead>
                                    <tr>
                                        <th>Pos</th>
                                        {Array(26).fill(0).map((_, i) => <th key={i}>{String.fromCharCode(65 + i)}</th>)}
                                    </tr>
                                </thead>
                                <tbody>
                                    {Array(5).fill(0).map((_, j) => (
                                        <tr key={j}>
                                            <td>{j + 1}</td>
                                            {Array(26).fill(0).map((_, i) =>
                                                <td key={i}>{letterCounts.percentages?.[j]?.[i] ?? ""}</td>
                                            )}
                                        </tr>
                                    ))}
                                    <tr>
                                        <td><strong>Total</strong></td>
                                        {Array(26).fill(0).map((_, i) =>
                                            <td key={i}>{letterCounts.percentages ? Math.round(letterCounts.percentages.reduce((sum, row) => sum + (row[i] ?? 0), 0) * 100) / 100 : ""}</td>
                                        )}
                                    </tr>
                                </tbody>
                            </Table>
                        </div>
                    )}
                </div>

                {/* Word Deviation */}
                <div style={cardStyle}>
                    <div style={cardHeaderStyle}>
                        <span style={cardHeaderTextStyle}>Word Deviation</span>
                    </div>
                    <div style={cardBodyStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                            <input
                                style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: '1rem', padding: '4px 8px', border: '1px solid #e2e8f0', borderRadius: 4, textTransform: 'uppercase', width: '6rem' }}
                                type="text" size={5} value={testWord} onChange={handleTestWordChange}
                            />
                            <span style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: '1.1rem', letterSpacing: '0.08em', color: '#001830' }}>
                                Exp. Remaining: <span style={{ color: '#f59e0b' }}>{Math.round(stat.score * 100) / 100}</span>
                            </span>
                        </div>
                        <p style={{ ...descStyle, marginTop: '0.75rem' }}>Type any 5-letter word to see its expected remaining candidates score — the average number of answers that would survive this guess. Lower is better; 1.0 is perfect.</p>
                    </div>
                </div>

                {/* ── Algorithm Documentation ── */}
                <div style={cardStyle}>
                    <div style={cardHeaderStyle} onClick={() => setShowAlgorithm(!showAlgorithm)}>
                        <span style={{ ...cardHeaderTextStyle, marginRight: 'auto' }}>How Next Words Are Selected — Algorithm</span>
                        <span style={{ color: '#f59e0b', fontSize: '0.8rem', fontFamily: 'Rajdhani, sans-serif' }}>{showAlgorithm ? '▲ Hide' : '▼ Show'}</span>
                    </div>
                    {showAlgorithm && (
                        <div style={{ ...cardBodyStyle, lineHeight: 1.75 }}>

                            <p style={{ ...descStyle, fontWeight: 700, marginBottom: '0.25rem' }}>Goal</p>
                            <p style={descStyle}>
                                After each guess the set of possible remaining answers shrinks. The solver's job is to pick the next word
                                that will eliminate the most candidates regardless of what the puzzle answer actually is — the minimax of
                                remaining uncertainty.
                            </p>

                            <p style={{ ...descStyle, fontWeight: 700, marginBottom: '0.25rem' }}>Feedback patterns and bins</p>
                            <p style={descStyle}>
                                Every Wordle guess produces a pattern of five coloured tiles, each one of three colours (gray / yellow / green).
                                That gives 3<sup>5</sup> = <strong>243</strong> possible feedback patterns. Each pattern is encoded as a
                                base-3 number: green = 2, yellow = 1, gray = 0, with the leftmost tile as the most-significant digit.
                                For example, the pattern [green, gray, yellow, gray, green] encodes to
                                2×81 + 0×27 + 1×9 + 0×3 + 2 = <strong>173</strong>.
                            </p>
                            <p style={descStyle}>
                                For a candidate guess word <em>g</em> and every possible answer <em>a</em> in the remaining list, the solver
                                simulates what feedback pattern Wordle would return (using the same two-pass exact-then-inexact match
                                algorithm Wordle uses) and increments a counter for that bin.  The result is an array of 243 counts —
                                the <strong>bin distribution</strong> visible in the Bin Distribution panel.
                            </p>

                            <p style={{ ...descStyle, fontWeight: 700, marginBottom: '0.25rem' }}>Expected remaining candidates score</p>
                            <p style={descStyle}>
                                After a guess resolves, the true answer will be revealed to live in exactly one bin, leaving only the
                                candidates in that bin still possible. If the answer is equally likely to be any of the <em>N</em> remaining
                                candidates, the probability it falls in bin <em>b</em> is count<sub>b</sub> / N, and if it does we are left
                                with count<sub>b</sub> candidates. The expected number of remaining candidates is:
                            </p>
                            <p style={{ ...descStyle, fontFamily: 'monospace', margin: '0.25rem 0 0.75rem 1.25rem' }}>
                                score = Σ<sub>b</sub> (count<sub>b</sub> / N) × count<sub>b</sub> = Σ<sub>b</sub> count<sub>b</sub>² / N
                            </p>
                            <p style={descStyle}>
                                Equivalently, reading directly from the <strong>Outcome Probability</strong> table: each row shows a bin
                                size <em>k</em>, the number of bins of that size, and the probability of landing in any bin of that size.
                                The score is simply:
                            </p>
                            <p style={{ ...descStyle, fontFamily: 'monospace', margin: '0.25rem 0 0.75rem 1.25rem' }}>
                                score = Σ<sub>rows</sub> binSize × probability
                            </p>
                            <p style={descStyle}>
                                A score of <strong>1.0</strong> is perfect — every remaining answer lands in its own unique bin, so
                                whatever feedback comes back, exactly one candidate survives. Higher values mean larger groups survive
                                on average. <strong>Lower score = better guess.</strong> The solver evaluates every word in the full
                                dictionary as a potential guess and keeps the 20 with the lowest score.
                            </p>

                            <p style={{ ...descStyle, fontWeight: 700, marginBottom: '0.25rem' }}>Perfect-score in-list promotion</p>
                            <p style={descStyle}>
                                When any possible-answer word achieves a score of exactly 1.0, it is promoted to the top
                                recommendation. The information value of a score-1.0 guess is the same regardless of which word you
                                use — every remaining candidate will land in a unique bin, so the next guess is always guaranteed to
                                solve the puzzle. However, if the promoted word happens to be the actual answer you win on
                                this turn. Guessing an out-of-list word with the same score can never win outright, so the
                                in-list word is strictly better: a <strong>1-in-N chance of solving immediately</strong>, with no
                                downside.
                            </p>

                            <p style={{ ...descStyle, fontWeight: 700, marginBottom: '0.25rem' }}>Letter-score tiebreaker</p>
                            <p style={descStyle}>
                                When two words have identical scores, the solver prefers the word whose letters are most
                                statistically likely at their respective positions, using the per-position letter-frequency percentages
                                computed from the full answer list (visible in the Letter Frequency % by Position table). Summing these
                                percentages over all five positions gives each word a <strong>Letter Score</strong>; higher is better as a
                                tiebreaker. If two words tie on both score and letter score, a word that is still a possible answer is
                                preferred over a pure information-gathering word that cannot itself be the answer.
                            </p>

                            <p style={{ ...descStyle, fontWeight: 700, marginBottom: '0.25rem' }}>Parallel evaluation with Web Workers</p>
                            <p style={descStyle}>
                                Evaluating all ~12 000 dictionary words against up to ~2 000 remaining answers requires millions of
                                pattern comparisons. To keep the UI responsive the solver splits the dictionary into roughly equal chunks
                                and runs each chunk in a dedicated Web Worker, using as many workers as the browser reports hardware
                                threads (capped so each worker handles at least 200 words). Workers post progress updates so the progress
                                bar stays accurate, then the main thread merges the per-worker top-20 lists into a final top-20 ranking.
                            </p>

                            <p style={{ ...descStyle, fontWeight: 700, marginBottom: '0.25rem' }}>Quordle / Octordle: combined list strategy</p>
                            <p style={descStyle}>
                                In multi-word variants the solver maintains a separate candidate list for each of the 4 (Quordle) or 8
                                (Octordle) hidden words. Because every guess applies to all words simultaneously, the solver builds a
                                <strong> combined list</strong> — the union of all per-word candidate lists that still have more than one
                                remaining possibility — and scores guesses against that union. This means the next suggested word is the
                                one that best narrows all unsolved puzzles at once, rather than optimising for any single one.
                                Individual per-word best guesses are also computed and shown so you can see which word is the hardest
                                remaining sub-puzzle.
                            </p>

                            <p style={{ ...descStyle, fontWeight: 700, marginBottom: '0.25rem' }}>Filtering logic</p>
                            <p style={descStyle}>
                                After you mark the tiles and press Go, the candidate list for each word is filtered in two passes:
                            </p>
                            <ol style={{ ...descStyle, paddingLeft: '1.25rem', marginBottom: '0.5rem' }}>
                                <li><strong>Pass 1 — exact matches (green):</strong> keep only candidates that have the correct letter at every green position.</li>
                                <li><strong>Pass 2 — inexact matches (yellow/gray):</strong> for each yellow position, keep only candidates that contain the letter somewhere else in the word; for each gray position, discard any candidate that contains that letter at all (duplicate-letter edge cases are handled automatically).</li>
                            </ol>
                            <p style={descStyle}>
                                The resulting list becomes the input for the next round's deviation evaluation.
                            </p>

                        </div>
                    )}
                </div>

            </div>
        </div>
    )
}
