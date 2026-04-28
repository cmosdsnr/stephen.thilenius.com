import { useState, useEffect, useCallback, useRef } from "react";

// ─── constants ───────────────────────────────────────────────────────────────

const DIFF_NAMES  = ["Beginner", "Easy", "Medium", "Hard", "Expert"];
const DIFF_RANGES = [[0,25],[26,50],[51,100],[101,180],[181,500]];
const DIFF_CLUES  = [46, 38, 30, 26, 22];

// ─── pure sudoku logic (no React) ────────────────────────────────────────────

function rowOf(i)  { return Math.floor(i / 9); }
function colOf(i)  { return i % 9; }
function boxOf(i)  { return Math.floor(rowOf(i) / 3) * 3 + Math.floor(colOf(i) / 3); }

const PEER_CACHE = Array.from({ length: 81 }, (_, i) => {
  const peers = [];
  for (let k = 0; k < 81; k++) {
    if (k !== i && (rowOf(k) === rowOf(i) || colOf(k) === colOf(i) || boxOf(k) === boxOf(i))) {
      peers.push(k);
    }
  }
  return peers;
});

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function solveBT(grid) {
  const g = grid.slice();
  function bt() {
    const e = g.indexOf(0);
    if (e === -1) return true;
    const used = new Set(PEER_CACHE[e].map(p => g[p]));
    for (let d = 1; d <= 9; d++) {
      if (!used.has(d)) { g[e] = d; if (bt()) return true; g[e] = 0; }
    }
    return false;
  }
  bt();
  return g;
}

function generateFull() {
  const g = new Array(81).fill(0);
  function bt(pos) {
    if (pos === 81) return true;
    const used = new Set(PEER_CACHE[pos].map(p => g[p]));
    const cands = shuffle([1,2,3,4,5,6,7,8,9]).filter(d => !used.has(d));
    for (const d of cands) { g[pos] = d; if (bt(pos + 1)) return true; g[pos] = 0; }
    return false;
  }
  bt(0);
  return g;
}

function makePuzzle(clueCount) {
  const full = generateFull();
  const puzzle = full.slice();
  const order = shuffle(Array.from({ length: 81 }, (_, i) => i));
  let removed = 0;
  for (const i of order) {
    if (removed >= 81 - clueCount) break;
    const bk = puzzle[i];
    puzzle[i] = 0;
    const sol = solveBT(puzzle.slice());
    if (!sol.includes(0) && sol.every((v, j) => v === full[j])) removed++;
    else puzzle[i] = bk;
  }
  return { puzzle, full };
}

function scorePuzzle(puz) {
  const g = puz.slice();
  const ns = Array.from({ length: 81 }, () => new Set());
  let score = 0;

  function rebuild() {
    for (let i = 0; i < 81; i++) {
      ns[i].clear();
      if (g[i] !== 0) continue;
      const used = new Set(PEER_CACHE[i].map(p => g[p]));
      for (let d = 1; d <= 9; d++) if (!used.has(d)) ns[i].add(d);
    }
  }

  function nakedSingles() {
    let found = false;
    for (let i = 0; i < 81; i++) {
      if (g[i] === 0 && ns[i].size === 1) {
        const d = [...ns[i]][0];
        g[i] = d;
        PEER_CACHE[i].forEach(p => ns[p].delete(d));
        ns[i].clear();
        score += 1; found = true;
      }
    }
    return found;
  }

  function hiddenSingles() {
    let found = false;
    const units = [];
    for (let r = 0; r < 9; r++) { const u = []; for (let c = 0; c < 9; c++) u.push(r*9+c); units.push(u); }
    for (let c = 0; c < 9; c++) { const u = []; for (let r = 0; r < 9; r++) u.push(r*9+c); units.push(u); }
    for (let b = 0; b < 9; b++) {
      const u = []; const br = Math.floor(b/3)*3, bc = (b%3)*3;
      for (let dr = 0; dr < 3; dr++) for (let dc = 0; dc < 3; dc++) u.push((br+dr)*9+(bc+dc));
      units.push(u);
    }
    for (const unit of units) {
      for (let d = 1; d <= 9; d++) {
        const cands = unit.filter(i => g[i] === 0 && ns[i].has(d));
        if (cands.length === 1) {
          const ci = cands[0];
          g[ci] = d;
          PEER_CACHE[ci].forEach(p => ns[p].delete(d));
          ns[ci].clear();
          score += 3; found = true;
        }
      }
    }
    return found;
  }

  function nakedPairs() {
    let found = false;
    const units = [];
    for (let r = 0; r < 9; r++) { const u = []; for (let c = 0; c < 9; c++) u.push(r*9+c); units.push(u); }
    for (let c = 0; c < 9; c++) { const u = []; for (let r = 0; r < 9; r++) u.push(r*9+c); units.push(u); }
    for (let b = 0; b < 9; b++) {
      const u = []; const br = Math.floor(b/3)*3, bc = (b%3)*3;
      for (let dr = 0; dr < 3; dr++) for (let dc = 0; dc < 3; dc++) u.push((br+dr)*9+(bc+dc));
      units.push(u);
    }
    for (const unit of units) {
      const pairs = unit.filter(i => g[i] === 0 && ns[i].size === 2);
      for (let a = 0; a < pairs.length; a++) {
        for (let b2 = a + 1; b2 < pairs.length; b2++) {
          const ia = pairs[a], ib = pairs[b2];
          const da = [...ns[ia]], db = [...ns[ib]];
          if (da[0] === db[0] && da[1] === db[1]) {
            let elim = false;
            unit.forEach(i => {
              if (i !== ia && i !== ib && g[i] === 0) {
                da.forEach(d => { if (ns[i].has(d)) { ns[i].delete(d); elim = true; } });
              }
            });
            if (elim) { score += 7; found = true; }
          }
        }
      }
    }
    return found;
  }

  rebuild();
  let iters = 0;
  while (g.includes(0) && iters < 200) {
    iters++;
    if (nakedSingles())  { rebuild(); continue; }
    if (hiddenSingles()) { rebuild(); continue; }
    if (nakedPairs())    { continue; }
    break;
  }
  if (g.includes(0)) score += 150;
  score += Math.max(0, (50 - puz.filter(v => v !== 0).length) * 0.5);
  return Math.round(score);
}

function diffFromScore(s) {
  for (let i = 0; i < 5; i++) if (s >= DIFF_RANGES[i][0] && s <= DIFF_RANGES[i][1]) return i;
  return s > DIFF_RANGES[4][1] ? 4 : 0;
}

function generateForDifficulty(targetD) {
  const attempts = targetD >= 3 ? 80 : 50;
  const [lo, hi] = DIFF_RANGES[targetD];
  let best = null, bestDist = Infinity;
  for (let att = 0; att < attempts; att++) {
    const { puzzle, full } = makePuzzle(DIFF_CLUES[targetD]);
    const score = scorePuzzle(puzzle.slice());
    const dist = score >= lo && score <= hi ? 0 : Math.min(Math.abs(score - lo), Math.abs(score - hi));
    if (dist < bestDist) { bestDist = dist; best = { puzzle, full, score }; }
    if (dist === 0) break;
  }
  return best;
}

// ─── component ───────────────────────────────────────────────────────────────

export default function Sudoku({ className = "" }) {
  const [targetDiff, setTargetDiff] = useState(0);
  const [given,   setGiven]   = useState([]);
  const [values,  setValues]  = useState([]);
  const [notes,   setNotes]   = useState([]);
  const [selected, setSelected] = useState(-1);
  const [solving,  setSolving]  = useState(false);
  const [score,    setScore]    = useState(null);
  const [actualD,  setActualD]  = useState(0);
  const [status,   setStatus]   = useState("");
  const [generating, setGenerating] = useState(false);
  const [noteMode,   setNoteMode]   = useState(false);
  const [solution,   setSolution]   = useState([]);
  const solveTimer = useRef(null);
  const stateRef   = useRef({ values: [], notes: [] });
  const historyRef = useRef([]);

  useEffect(() => { stateRef.current = { values, notes }; }, [values, notes]);

  const pushHistory = useCallback(() => {
    const { values: v, notes: n } = stateRef.current;
    historyRef.current.push({ values: v.slice(), notes: n.map(s => new Set(s)) });
  }, []);

  const handleUndo = useCallback(() => {
    const last = historyRef.current.pop();
    if (!last) return;
    setValues(last.values);
    setNotes(last.notes);
  }, []);

  const startNewGame = useCallback((diff) => {
    clearTimeout(solveTimer.current);
    setSolving(false);
    setGenerating(true);
    setStatus("");
    setSelected(-1);
    setTimeout(() => {
      const result = generateForDifficulty(diff);
      setGiven(result.puzzle.slice());
      setValues(result.puzzle.slice());
      setNotes(Array.from({ length: 81 }, () => new Set()));
      setScore(result.score);
      setActualD(diffFromScore(result.score));
      setSolution(result.full.slice());
      setGenerating(false);
    }, 20);
  }, []);

  useEffect(() => { startNewGame(0); }, []);

  const handleFillNotes = useCallback(() => {
    setNotes(prev => {
      const next = Array.from({ length: 81 }, () => new Set());
      for (let i = 0; i < 81; i++) {
        if (values[i] !== 0) continue;
        const used = new Set(PEER_CACHE[i].map(p => values[p]));
        for (let d = 1; d <= 9; d++) if (!used.has(d)) next[i].add(d);
      }
      return next;
    });
  }, [values]);

  const doSolveStep = useCallback(() => {
    const { values: v, notes: n } = stateRef.current;
    const newValues = v.slice();
    const newNotes  = n.map(s => new Set(s));
    let progress = false;
    for (let i = 0; i < 81; i++) {
      if (newValues[i] !== 0) continue;
      if (newNotes[i].size === 1) {
        const d = [...newNotes[i]][0];
        newValues[i] = d;
        newNotes[i].clear();
        PEER_CACHE[i].forEach(p => newNotes[p].delete(d));
        progress = true;
      }
    }
    setValues(newValues);
    setNotes(newNotes);
    if (!progress) {
      setSolving(false);
      if (!newValues.includes(0)) setStatus("Solved!");
      else setStatus("Stuck — needs advanced logic");
    } else {
      solveTimer.current = setTimeout(doSolveStep, 160);
    }
  }, []);

  const handleAutoSolve = useCallback(() => {
    setSolving(true);
    setStatus("");
    solveTimer.current = setTimeout(doSolveStep, 160);
  }, [doSolveStep]);

  const handleCellClick = useCallback((i) => {
    setSelected(s => s === i ? -1 : i);
  }, []);

  const handleKeyDown = useCallback((e) => {
    if (e.key === "n" || e.key === "N") { setNoteMode(m => !m); return; }
    if (e.key === "z" && (e.ctrlKey || e.metaKey)) { handleUndo(); return; }
    if (selected < 0 || given[selected] !== 0 || solving) return;
    const d = parseInt(e.key);
    if (d >= 1 && d <= 9) {
      pushHistory();
      if (noteMode) {
        setNotes(n => {
          const nn = n.map(s => new Set(s));
          if (nn[selected].has(d)) nn[selected].delete(d);
          else nn[selected].add(d);
          return nn;
        });
      } else {
        setValues(v => {
          const nv = v.slice(); nv[selected] = d; return nv;
        });
        setNotes(n => {
          const nn = n.map(s => new Set(s));
          nn[selected].clear();
          PEER_CACHE[selected].forEach(p => nn[p].delete(d));
          return nn;
        });
      }
    } else if (e.key === "Backspace" || e.key === "Delete") {
      pushHistory();
      setValues(v => { const nv = v.slice(); nv[selected] = 0; return nv; });
      setNotes(n => { const nn = n.map(s => new Set(s)); nn[selected].clear(); return nn; });
    } else if (e.key === "ArrowRight") setSelected(s => Math.min(80, s + 1));
    else if (e.key === "ArrowLeft")  setSelected(s => Math.max(0,  s - 1));
    else if (e.key === "ArrowDown")  setSelected(s => Math.min(80, s + 9));
    else if (e.key === "ArrowUp")    setSelected(s => Math.max(0,  s - 9));
  }, [selected, given, solving, noteMode, pushHistory, handleUndo]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const peerSet = selected >= 0 ? new Set(PEER_CACHE[selected]) : new Set();
  const notesReady = notes.some(s => s.size > 0);

  return (
    <div className={className} style={{ maxWidth: 960, margin: "0 auto", padding: "2rem 1.25rem 4rem" }}>

      {/* ── Page Header ── */}
      <div style={{ textAlign: "center", marginBottom: "2rem" }}>
        <p style={eyebrowStyle}>Puzzle Game</p>
        <h1 style={pageTitleStyle}>Sudoku</h1>
        <hr style={ruleStyle} />
      </div>

      {/* ── Difficulty card (above board) ── */}
      <div style={{ maxWidth: 700, margin: "0 auto 1.5rem" }}>
        <div style={cardStyle}>
          <div style={cardHeaderStyle}>
            <span style={cardTitleStyle}>Difficulty</span>
            {score !== null && (
              <span style={cardYearStyle}>{DIFF_NAMES[actualD]} · Score {score}</span>
            )}
          </div>
          <div style={{ ...cardBodyStyle, display: "flex", alignItems: "center", gap: "1.25rem", flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {DIFF_NAMES.map((name, d) => (
                <button key={d}
                  onClick={() => setTargetDiff(d)}
                  style={{
                    ...pillBtnStyle,
                    background: targetDiff === d ? "#001830" : "transparent",
                    color:      targetDiff === d ? "#f59e0b" : "#001830",
                  }}
                >{name}</button>
              ))}
            </div>
            <button
              onClick={() => startNewGame(targetDiff)}
              disabled={generating || solving}
              style={{ ...runBtnStyle, cursor: generating || solving ? "default" : "pointer", opacity: generating || solving ? 0.6 : 1 }}
            >
              {generating ? "Generating…" : "New Game"}
            </button>
          </div>
        </div>
      </div>

      {/* ── Input mode toggle ── */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.25rem", gap: "0.5rem" }}>
        {[{ label: "Number", notes: false }, { label: "Notes", notes: true }].map(({ label, notes }) => (
          <button key={label}
            onClick={() => setNoteMode(notes)}
            style={{
              ...pillBtnStyle,
              background: noteMode === notes ? "#001830" : "transparent",
              color:      noteMode === notes ? "#f59e0b" : "#001830",
              padding: "0.45rem 1.4rem",
              fontSize: "0.9rem",
            }}
          >
            {label}
          </button>
        ))}
        <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.72rem", color: "#6a9ac4", alignSelf: "center", marginLeft: "0.5rem" }}>
          or press N to toggle
        </span>
      </div>

      {/* ── Board (centered) ── */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.5rem" }}>
        <div style={{ flex: "0 0 auto" }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(9, 1fr)",
            border: "2px solid #001830",
            borderRadius: 4,
            overflow: "hidden",
            width: "min(630px, 92vw)",
            aspectRatio: "1",
            boxShadow: "0 4px 24px rgba(0,24,48,0.18)",
          }}>
            {values.map((val, i) => {
              const r = rowOf(i), c = colOf(i);
              const isSelected = i === selected;
              const isPeer     = peerSet.has(i);
              const isGiven    = given[i] !== 0;
              const isConflict = selected >= 0 && values[selected] !== 0 && val !== 0 && val === values[selected] && i !== selected;
              const hasError   = !isGiven && val !== 0 && solution.length > 0 && val !== solution[i];
              const borderRight  = (c + 1) % 3 === 0 && c !== 8 ? "2px solid #001830" : c === 8 ? "none" : "0.5px solid #c8d8e4";
              const borderBottom = (r + 1) % 3 === 0 && r !== 8 ? "2px solid #001830" : r === 8 ? "none" : "0.5px solid #c8d8e4";
              const bg = hasError
                ? (isSelected ? "#f87171" : "#fecaca")
                : isSelected
                  ? "#fde68a"
                  : isPeer
                    ? "#cdd5de"
                    : "#ffffff";

              return (
                <div key={i}
                  onClick={() => handleCellClick(i)}
                  style={{
                    position: "relative",
                    borderRight, borderBottom,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer",
                    background: bg,
                    userSelect: "none",
                  }}
                >
                  {val !== 0 ? (
                    <span style={{
                      fontFamily: isGiven ? "Rajdhani, sans-serif" : "Share Tech Mono, monospace",
                      fontSize: "clamp(20px, 4.2vw, 34px)",
                      lineHeight: 1,
                      fontWeight: isGiven ? 700 : 400,
                      color: hasError ? "#000000" : isConflict ? "#ea580c" : isGiven ? "#001830" : "#6a9ac4",
                    }}>
                      {val}
                    </span>
                  ) : notes[i] && notes[i].size > 0 ? (
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, 1fr)",
                      gridTemplateRows: "repeat(3, 1fr)",
                      width: "100%", height: "100%",
                      padding: 1,
                    }}>
                      {[1,2,3,4,5,6,7,8,9].map(d => (
                        <div key={d} style={{
                          fontFamily: "Share Tech Mono, monospace",
                          fontSize: "clamp(11px, 2vw, 16px)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          color: "#6a9ac4", lineHeight: 1,
                        }}>
                          {notes[i].has(d) ? d : ""}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          <p style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "0.72rem", color: "#6a9ac4", marginTop: "0.75rem", textAlign: "center" }}>
            Click cell + type 1–9 · Backspace to clear · Arrow keys to move · N = toggle notes · Ctrl+Z = undo
          </p>
        </div>
      </div>

      {/* ── Tools + Legend row ── */}
      <div style={{ maxWidth: 700, margin: "0 auto", display: "flex", gap: "1.5rem", flexWrap: "wrap", alignItems: "flex-start" }}>

          {/* Tools card */}
          <div style={{ ...cardStyle, flex: "1 1 280px" }}>
            <div style={cardHeaderStyle}>
              <span style={cardTitleStyle}>Tools</span>
              {given.length > 0 && (
                <span style={cardYearStyle}>{given.filter(v => v !== 0).length} clues given</span>
              )}
            </div>
            <div style={cardBodyStyle}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: "0.75rem" }}>
                <button
                  onClick={handleUndo}
                  disabled={generating || solving}
                  style={{ ...secondaryBtnStyle, cursor: generating || solving ? "default" : "pointer", opacity: generating || solving ? 0.5 : 1 }}
                >
                  Undo
                </button>
                <button
                  onClick={handleFillNotes}
                  disabled={generating || solving || given.length === 0}
                  style={{ ...secondaryBtnStyle, cursor: generating || solving || given.length === 0 ? "default" : "pointer", opacity: generating || solving || given.length === 0 ? 0.5 : 1 }}
                >
                  Fill Notes
                </button>
                <button
                  onClick={handleAutoSolve}
                  disabled={generating || solving || !notesReady}
                  style={{ ...secondaryBtnStyle, cursor: generating || solving || !notesReady ? "default" : "pointer", opacity: generating || solving || !notesReady ? 0.5 : 1 }}
                >
                  Auto-Solve
                </button>
              </div>

              {status && (
                <div style={{
                  fontFamily: "Share Tech Mono, monospace",
                  fontSize: "0.82rem",
                  color: status === "Solved!" ? "#166534" : status.startsWith("Stuck") ? "#dc2626" : "#6a9ac4",
                  padding: "0.5rem 0.75rem",
                  background: status === "Solved!" ? "rgba(22,101,52,0.08)" : status.startsWith("Stuck") ? "rgba(220,38,38,0.08)" : "rgba(106,154,196,0.08)",
                  borderLeft: `3px solid ${status === "Solved!" ? "#166534" : status.startsWith("Stuck") ? "#dc2626" : "#6a9ac4"}`,
                  borderRadius: "0 4px 4px 0",
                }}>
                  {status}
                </div>
              )}
            </div>
          </div>

          {/* Legend card */}
          <div style={{ ...cardStyle, flex: "1 1 200px" }}>
            <div style={cardHeaderStyle}>
              <span style={cardTitleStyle}>Legend</span>
            </div>
            <div style={cardBodyStyle}>
              {[
                { swatch: "#001830", label: "Given clue", font: "Rajdhani, sans-serif", fw: 700 },
                { swatch: "#6a9ac4", label: "Your entry", font: "Share Tech Mono, monospace", fw: 400 },
                { swatch: "#dc2626", label: "Conflict",   font: "Share Tech Mono, monospace", fw: 400 },
              ].map(({ swatch, label, font, fw }) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.5rem" }}>
                  <span style={{ fontFamily: font, fontWeight: fw, fontSize: "1rem", color: swatch, width: 18, textAlign: "center" }}>5</span>
                  <span style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "0.8rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#334" }}>{label}</span>
                </div>
              ))}
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.5rem" }}>
                <span style={{ display: "inline-block", width: 18, height: 18, background: "rgba(245,158,11,0.22)", border: "1px solid #f59e0b", borderRadius: 2 }} />
                <span style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "0.8rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#334" }}>Selected cell</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <span style={{ display: "inline-block", width: 18, height: 18, background: "rgba(0,24,48,0.07)", border: "1px solid rgba(0,24,48,0.2)", borderRadius: 2 }} />
                <span style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "0.8rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#334" }}>Peer cells</span>
              </div>
            </div>
          </div>

        </div>
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const eyebrowStyle     = { fontFamily: "Share Tech Mono,monospace", fontSize: "0.7rem", letterSpacing: "0.35em", textTransform: "uppercase", color: "#f59e0b", margin: "0 0 0.3rem" };
const pageTitleStyle   = { fontFamily: "Rajdhani,sans-serif", fontSize: "2.6rem", fontWeight: 700, letterSpacing: "0.3em", textTransform: "uppercase", color: "#001830", margin: "0 0 0.5rem", lineHeight: 1 };
const ruleStyle        = { width: 56, height: 2, background: "linear-gradient(90deg,transparent,#f59e0b,transparent)", margin: "0 auto", border: "none" };
const cardStyle        = { background: "rgba(255,255,255,0.9)", border: "1px solid rgba(0,24,48,0.12)", borderRadius: "2px 2px 8px 8px", marginBottom: "1.5rem", overflow: "hidden", boxShadow: "0 2px 16px rgba(0,24,48,0.09)" };
const cardHeaderStyle  = { background: "#001830", borderBottom: "2px solid #f59e0b", padding: "0.85rem 1.5rem", display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" };
const cardTitleStyle   = { fontFamily: "Rajdhani,sans-serif", fontSize: "1.1rem", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "#dde6f0" };
const cardYearStyle    = { fontFamily: "Share Tech Mono,monospace", fontSize: "0.75rem", color: "#f59e0b", letterSpacing: "0.1em" };
const cardBodyStyle    = { padding: "1.25rem 1.5rem" };
const labelStyle       = { fontFamily: "Rajdhani,sans-serif", fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.25em", textTransform: "uppercase", color: "#6a9ac4", marginBottom: "0.5rem" };
const pillBtnStyle     = { fontFamily: "Rajdhani,sans-serif", fontWeight: 700, fontSize: "0.82rem", letterSpacing: "0.1em", textTransform: "uppercase", border: "1.5px solid #001830", borderRadius: 4, padding: "0.38rem 0.9rem", transition: "background 0.15s,color 0.15s", cursor: "pointer" };
const runBtnStyle      = { fontFamily: "Rajdhani,sans-serif", fontWeight: 700, fontSize: "0.88rem", letterSpacing: "0.12em", textTransform: "uppercase", background: "#001830", color: "#f59e0b", border: "1.5px solid #001830", borderRadius: 4, padding: "0.5rem 1.3rem" };
const secondaryBtnStyle = { fontFamily: "Rajdhani,sans-serif", fontWeight: 700, fontSize: "0.88rem", letterSpacing: "0.12em", textTransform: "uppercase", background: "transparent", color: "#001830", border: "1.5px solid #001830", borderRadius: 4, padding: "0.5rem 1.1rem" };
