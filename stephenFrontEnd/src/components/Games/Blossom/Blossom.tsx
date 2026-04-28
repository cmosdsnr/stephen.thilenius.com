import React, { useState, useEffect } from 'react';
import { API } from '../../../api'

export default function Blossom() {

    const [must, setMust] = useState(null)
    const [available, setAvailable] = useState(null)
    const [list, setList] = useState([])
    const [usesAll, setUsesAll] = useState([])
    const [definitions, setDefinitions] = useState([])

    const getDefinitions = async () => {
        let def = []
        for (let k = 0; k < list.length; k++) {
            let used = false;
            def.forEach((d) => {
                if (d.word == list[k][0].word) used = true
            })
            if (!used) {
                if (list[k][0].definition == "(from other list)") {
                    const response = await fetch("https://www.dictionaryapi.com/api/v3/references/collegiate/json/" + list[k][0].word + "?key=0ce14dcd-438f-4860-b517-bc3ef48ac7b7")
                    const data = await response.json();
                    if (data[0]?.shortdef) {
                        data[0].shortdef.unshift("(from other list)")
                        def.push({ word: list[k][0].word, defs: data[0].shortdef })
                    } else
                        def.push({ word: list[k][0].word, defs: ["(from other list)", "no definition"] })
                }
                else
                    def.push({ word: list[k][0].word, defs: [list[k][0].definition] })
            }
        }
        setDefinitions(def)
    }

    useEffect(() => {
        if (available && available.length == 6 && must != null) {
            const requestOptions = {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ must, available })
            };
            fetch(API.getWordList(), requestOptions)
                .then(response => response.json())
                .then(data => {
                    setUsesAll(data.pop())
                    setList(data)
                });
        }
    }, [must, available])

    useEffect(() => {
        getDefinitions()
    }, [list])

    const remove = (word) => {
        let h = [...list]
        h.forEach((l, i) => {
            l.forEach((item, j) => {
                if (item.word == word) {
                    h[i].splice(j, 1)
                }
            })
        })
        setList(h)
    }

    const keyDown = (e) => {
        if (e.key === 'Enter') submit()
    }

    const submit = () => {
        const avl = (document.getElementById("avl") as HTMLInputElement).value.toLowerCase().split("")
        if (avl.length != 6) return;
        setMust((document.getElementById("must") as HTMLInputElement).value.toLowerCase())
        setAvailable(avl)
    }

    const newGame = () => {
        setMust(null)
        setAvailable(null)
    }

    return (
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1.25rem 4rem' }}>

            {/* ── Page Header ── */}
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <p style={eyebrowStyle}>Word Puzzle Helper</p>
                <h1 style={pageTitleStyle}>Blossom</h1>
                <hr style={ruleStyle} />
            </div>

            {/* ── Explainer ── */}
            <div style={cardStyle}>
                <div style={cardHeaderStyle}>
                    <span style={cardTitleStyle}>How to Play Blossom</span>
                </div>
                <div style={cardBodyStyle}>
                    <p style={bioStyle}>
                        Blossom is a daily word puzzle by the New York Times. You are given <strong>7 letters</strong> arranged
                        in a flower — one <strong>center letter</strong> (which every word must contain) and six
                        <strong> petal letters</strong>. Your goal is to find as many valid words as possible using only
                        those letters, with no length limit and letters reusable within a word.
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(250px,1fr))', gap: '0.75rem', marginTop: '1rem' }}>
                        {[
                            {
                                term: 'Center Letter',
                                def: 'Every word you submit must contain the center letter at least once. Words that omit it are rejected regardless of how long they are.',
                            },
                            {
                                term: 'Petal Letters',
                                def: 'The six surrounding letters can be used freely in any order or repeated. You are not required to use all six — just the center letter.',
                            },
                            {
                                term: 'Scoring',
                                def: '4-letter words score 1 point. Longer words score 1 point per letter. Words that use all 7 letters are "Blossom Words" and earn a large bonus.',
                            },
                            {
                                term: 'Blossom Words',
                                def: 'Any word that uses all 7 letters (center + all 6 petals, each at least once) earns a big bonus. These are the high-value targets to hunt for.',
                            },
                            {
                                term: 'How This Tool Helps',
                                def: 'Enter the must-use (center) letter and the 6 petal letters. The tool returns the best candidate words grouped by petal letter, plus all Blossom Words. Click any word to dismiss it.',
                            },
                            {
                                term: 'Definitions',
                                def: 'After results load, definitions are fetched for any word marked "(from other list)" so you can verify unfamiliar words before playing them.',
                            },
                        ].map(({ term, def }) => (
                            <div key={term} style={glossaryItemStyle}>
                                <div style={glossaryTermStyle}>{term}</div>
                                <div style={glossaryDefStyle}>{def}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {available?.length > 0 ? (
                <>
                    {/* ── Active Puzzle Info ── */}
                    <div style={cardStyle}>
                        <div style={cardHeaderStyle}>
                            <span style={cardTitleStyle}>Active Puzzle</span>
                            <span style={cardYearStyle}>
                                must: <strong style={{ color: '#f59e0b' }}>{must?.toUpperCase()}</strong>
                                &nbsp;&nbsp;available:&nbsp;
                                {available?.map((l, i) => (
                                    <strong key={i} style={{ color: '#f59e0b' }}>
                                        {l.toUpperCase()}{i < available.length - 1 ? ', ' : ''}
                                    </strong>
                                ))}
                            </span>
                        </div>
                        <div style={cardBodyStyle}>
                            <button onClick={newGame} style={secondaryBtnStyle}>New Puzzle</button>
                        </div>
                    </div>

                    {/* ── Word List ── */}
                    <div style={cardStyle}>
                        <div style={cardHeaderStyle}>
                            <span style={cardTitleStyle}>Word List</span>
                            <span style={cardYearStyle}>click a word to remove it</span>
                        </div>
                        <div style={cardBodyStyle}>
                            {list.map((item, index) => (
                                <div key={index} style={rowStyle}>
                                    <span style={highlightLabelStyle}>
                                        {available[index]?.toUpperCase()}
                                    </span>
                                    <span>
                                        {item.map((w, j) => {
                                            if (j > 4) return null;
                                            return (
                                                <span
                                                    key={j}
                                                    onClick={() => remove(w.word)}
                                                    style={wordChipStyle}
                                                    title="click to remove"
                                                >
                                                    {w.word}
                                                    <span style={scoreStyle}>({w.score})</span>
                                                    {j < Math.min(item.length, 5) - 1 ? ' ' : ''}
                                                </span>
                                            )
                                        })}
                                    </span>
                                </div>
                            ))}

                            {usesAll?.length > 0 && (
                                <div style={{ ...rowStyle, borderTop: '2px solid rgba(245,158,11,0.4)', marginTop: '0.5rem', paddingTop: '0.75rem' }}>
                                    <span style={{ ...highlightLabelStyle, color: '#f59e0b' }}>ALL</span>
                                    <span>
                                        {usesAll.map((w, j) => (
                                            <span
                                                key={j}
                                                onClick={() => remove(w.word)}
                                                style={{ ...wordChipStyle, color: '#f59e0b' }}
                                                title="click to remove"
                                            >
                                                {w.word}
                                                <span style={scoreStyle}>({w.score})</span>
                                                {j < usesAll.length - 1 ? ' ' : ''}
                                            </span>
                                        ))}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── Definitions ── */}
                    {definitions.length > 0 && (
                        <div style={cardStyle}>
                            <div style={cardHeaderStyle}>
                                <span style={cardTitleStyle}>Definitions</span>
                            </div>
                            <div style={cardBodyStyle}>
                                {definitions.map((w, j) => (
                                    <div key={j} style={defItemStyle}>
                                        <div style={defWordStyle}>{w.word}</div>
                                        {Array.isArray(w.defs)
                                            ? w.defs.map((m, i) => (
                                                <div key={i} style={defLineStyle}>{m}</div>
                                            ))
                                            : null}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            ) : (
                /* ── Input Form ── */
                <div style={cardStyle}>
                    <div style={cardHeaderStyle}>
                        <span style={cardTitleStyle}>Enter Puzzle Letters</span>
                    </div>
                    <div style={cardBodyStyle}>
                        <p style={bioStyle}>
                            Enter the required letter and the six available letters from today's Blossom puzzle.
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: 340 }}>
                            <div>
                                <div style={labelStyle}>Must-use letter</div>
                                <input
                                    type="text"
                                    id="must"
                                    name="must"
                                    maxLength={1}
                                    style={inputStyle}
                                    placeholder="e.g. A"
                                />
                            </div>
                            <div>
                                <div style={labelStyle}>Available letters (6, no spaces)</div>
                                <input
                                    type="text"
                                    id="avl"
                                    name="avl"
                                    maxLength={6}
                                    onKeyDown={keyDown}
                                    style={inputStyle}
                                    placeholder="e.g. BCDEFG"
                                />
                            </div>
                            <button onClick={submit} style={runBtnStyle}>Find Words</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

// ─────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────
const eyebrowStyle:       React.CSSProperties = { fontFamily: 'Share Tech Mono,monospace', fontSize: '0.7rem', letterSpacing: '0.35em', textTransform: 'uppercase', color: '#f59e0b', margin: '0 0 0.3rem' };
const pageTitleStyle:     React.CSSProperties = { fontFamily: 'Rajdhani,sans-serif', fontSize: '2.6rem', fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', color: '#001830', margin: '0 0 0.5rem', lineHeight: 1 };
const ruleStyle:          React.CSSProperties = { width: 56, height: 2, background: 'linear-gradient(90deg,transparent,#f59e0b,transparent)', margin: '0 auto', border: 'none' };
const cardStyle:          React.CSSProperties = { background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(0,24,48,0.12)', borderRadius: '2px 2px 8px 8px', marginBottom: '2rem', overflow: 'hidden', boxShadow: '0 2px 16px rgba(0,24,48,0.09)' };
const cardHeaderStyle:    React.CSSProperties = { background: '#001830', borderBottom: '2px solid #f59e0b', padding: '0.85rem 1.5rem', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' };
const cardTitleStyle:     React.CSSProperties = { fontFamily: 'Rajdhani,sans-serif', fontSize: '1.2rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#dde6f0' };
const cardYearStyle:      React.CSSProperties = { fontFamily: 'Share Tech Mono,monospace', fontSize: '0.75rem', color: '#dde6f0', letterSpacing: '0.1em' };
const cardBodyStyle:      React.CSSProperties = { padding: '1.5rem 1.75rem' };
const bioStyle:           React.CSSProperties = { fontSize: '0.95rem', lineHeight: 1.78, color: '#1a2a3a', margin: '0 0 1rem' };
const labelStyle:         React.CSSProperties = { fontFamily: 'Rajdhani,sans-serif', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.25em', textTransform: 'uppercase', color: '#6a9ac4', marginBottom: '0.4rem' };
const inputStyle:         React.CSSProperties = { fontFamily: 'Share Tech Mono,monospace', fontSize: '1rem', border: '1.5px solid rgba(0,24,48,0.25)', borderRadius: 4, padding: '0.45rem 0.75rem', width: '100%', outline: 'none', color: '#001830', background: '#f5f8fb', textTransform: 'uppercase' };
const runBtnStyle:        React.CSSProperties = { fontFamily: 'Rajdhani,sans-serif', fontWeight: 700, fontSize: '0.9rem', letterSpacing: '0.12em', textTransform: 'uppercase', background: '#001830', color: '#f59e0b', border: '1.5px solid #001830', borderRadius: 4, padding: '0.5rem 1.4rem', cursor: 'pointer' };
const secondaryBtnStyle:  React.CSSProperties = { fontFamily: 'Rajdhani,sans-serif', fontWeight: 700, fontSize: '0.85rem', letterSpacing: '0.12em', textTransform: 'uppercase', background: 'transparent', color: '#001830', border: '1.5px solid #001830', borderRadius: 4, padding: '0.42rem 1.1rem', cursor: 'pointer' };
const rowStyle:           React.CSSProperties = { display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginBottom: '0.45rem', flexWrap: 'wrap' };
const highlightLabelStyle: React.CSSProperties = { fontFamily: 'Rajdhani,sans-serif', fontWeight: 700, fontSize: '0.8rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#6a9ac4', minWidth: '2.2rem' };
const wordChipStyle:      React.CSSProperties = { fontFamily: 'Share Tech Mono,monospace', fontSize: '0.9rem', color: '#1a5fa8', cursor: 'pointer', userSelect: 'none', display: 'inline-block', marginRight: '0.3rem' };
const scoreStyle:         React.CSSProperties = { fontSize: '0.7rem', color: '#999', marginLeft: '0.1rem' };
const defItemStyle:       React.CSSProperties = { borderLeft: '3px solid rgba(245,158,11,0.5)', paddingLeft: '0.85rem', marginBottom: '1rem' };
const defWordStyle:       React.CSSProperties = { fontFamily: 'Rajdhani,sans-serif', fontWeight: 700, fontSize: '0.9rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#001830', marginBottom: '0.2rem' };
const defLineStyle:       React.CSSProperties = { fontSize: '0.85rem', color: '#334', lineHeight: 1.6, marginLeft: '0.5rem' };
const glossaryItemStyle:  React.CSSProperties = { background: 'rgba(0,24,48,0.04)', borderLeft: '3px solid rgba(245,158,11,0.5)', borderRadius: '0 4px 4px 0', padding: '0.75rem 1rem' };
const glossaryTermStyle:  React.CSSProperties = { fontFamily: 'Rajdhani,sans-serif', fontWeight: 700, fontSize: '0.85rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#001830', marginBottom: '0.3rem' };
const glossaryDefStyle:   React.CSSProperties = { fontSize: '0.83rem', lineHeight: 1.65, color: '#334' };
