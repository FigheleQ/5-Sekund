import { useState, useRef, useEffect } from "react";
import { CATEGORY_LABELS, DIFFICULTY_LABELS, poolFor, countFor } from "./src/questions.js";

const DIFFICULTIES = ["easy", "medium", "hard"];
const DIFF_COLORS = { easy: "#22c55e", medium: "#f59e0b", hard: "#f43f5e" };
const CATEGORY_KEYS = Object.keys(CATEGORY_LABELS);

// palette used when adding players
const PLAYER_COLORS = [
  "#8b5cf6", "#06b6d4", "#22c55e", "#f43f5e",
  "#f59e0b", "#3b82f6", "#ec4899", "#14b8a6",
];

const DEFAULT_PLAYERS = [
  { name: "Gracz 1", color: PLAYER_COLORS[0] },
  { name: "Gracz 2", color: PLAYER_COLORS[1] },
  { name: "Gracz 3", color: PLAYER_COLORS[2] },
];

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

const sectionLabel = {
  color: "#5d5a8a", fontSize: 11, fontWeight: 700,
  letterSpacing: 2, textTransform: "uppercase",
  margin: "0 0 10px",
};

export default function App() {
  const [started, setStarted] = useState(false);
  const [difficulty, setDifficulty] = useState("medium");
  const [cats, setCats] = useState([...CATEGORY_KEYS]); // all selected by default
  const [players, setPlayers] = useState(DEFAULT_PLAYERS);
  const [qs, setQs] = useState([]);
  const [qIdx, setQIdx] = useState(0);
  const [scores, setScores] = useState({});
  const [flash, setFlash] = useState(null);
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [locked, setLocked] = useState(false);
  const itvRef = useRef(null);
  const alarmRef = useRef(null);

  // preload the time-over sound once
  useEffect(() => {
    alarmRef.current = new Audio("/time_over_sound.mp3");
    alarmRef.current.preload = "auto";
    return () => clearInterval(itvRef.current);
  }, []);

  function playAlarm() {
    const a = alarmRef.current;
    if (!a) return;
    try {
      a.currentTime = 0;
      a.play().catch(() => {});
      // cap playback at 2600ms
      setTimeout(() => { a.pause(); a.currentTime = 0; }, 2600);
    } catch { /* ignore */ }
  }

  useEffect(() => {
    if (seconds >= 5) {
      clearInterval(itvRef.current);
      setRunning(false);
      setLocked(true);
      playAlarm();
    }
  }, [seconds]);

  function startStop() {
    if (locked) return;
    if (running) {
      clearInterval(itvRef.current);
      setRunning(false);
    } else {
      itvRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
      setRunning(true);
    }
  }

  function resetTimer() {
    clearInterval(itvRef.current);
    setRunning(false);
    setSeconds(0);
    setLocked(false);
  }

  function goNext() {
    resetTimer();
    setQIdx(i => i + 1);
  }

  function addPoint(idx) {
    setScores(s => ({ ...s, [idx]: (s[idx] ?? 0) + 1 }));
    setFlash(idx);
    setTimeout(() => setFlash(null), 600);
  }

  function removePoint(idx, e) {
    e.stopPropagation();
    setScores(s => ({ ...s, [idx]: Math.max(0, (s[idx] ?? 0) - 1) }));
  }

  function reset() {
    if (!confirm("Zresetować wszystkie wyniki?")) return;
    setScores(Object.fromEntries(players.map((p, i) => [i, 0])));
    setQIdx(0);
    resetTimer();
  }

  function startGame() {
    const pool = poolFor(difficulty, cats);
    if (pool.length === 0 || players.length === 0) return;
    setQs(shuffle(pool));
    setQIdx(0);
    setScores(Object.fromEntries(players.map((_, i) => [i, 0])));
    resetTimer();
    setStarted(true);
  }

  function backToSetup() {
    resetTimer();
    setStarted(false);
  }

  // ── player editing (setup screen) ──
  function addPlayer() {
    setPlayers(ps => [
      ...ps,
      { name: `Gracz ${ps.length + 1}`, color: PLAYER_COLORS[ps.length % PLAYER_COLORS.length] },
    ]);
  }
  function removePlayer(idx) {
    setPlayers(ps => ps.filter((_, i) => i !== idx));
  }
  function renamePlayer(idx, name) {
    setPlayers(ps => ps.map((p, i) => (i === idx ? { ...p, name } : p)));
  }

  // ── category toggles (setup screen) ──
  function toggleCat(key) {
    setCats(cs => (cs.includes(key) ? cs.filter(c => c !== key) : [...cs, key]));
  }
  function toggleAllCats() {
    setCats(cs => (cs.length === CATEGORY_KEYS.length ? [] : [...CATEGORY_KEYS]));
  }

  const topScore = players.length ? Math.max(...players.map((_, i) => scores[i] ?? 0)) : 0;
  const setupPoolCount = countFor(difficulty, cats);

  // ── Setup screen (difficulty + categories + players) ──────
  if (!started) {
    const allCats = cats.length === CATEGORY_KEYS.length;
    const canStart = players.length > 0 && setupPoolCount > 0;
    return (
      <div style={{
        minHeight: "100vh",
        background: "#08080f",
        fontFamily: "system-ui, -apple-system, sans-serif",
        display: "flex", flexDirection: "column",
        padding: "24px",
        boxSizing: "border-box",
        color: "#eeeeff",
        maxWidth: 560, margin: "0 auto", width: "100%",
      }}>
        <div style={{ textAlign: "center", marginBottom: 22 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🎯</div>
          <h1 style={{ fontSize: 30, fontWeight: 900, color: "#fff", margin: 0, letterSpacing: -1 }}>
            5 Sekund
          </h1>
        </div>

        {/* Difficulty */}
        <p style={sectionLabel}>Poziom trudności</p>
        <div style={{ display: "flex", gap: 10, marginBottom: 22 }}>
          {DIFFICULTIES.map(d => {
            const active = difficulty === d;
            return (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                style={{
                  flex: 1,
                  background: active ? DIFF_COLORS[d] : "#0e0e24",
                  border: `2px solid ${DIFF_COLORS[d]}`,
                  borderRadius: 14, padding: "14px 8px",
                  cursor: "pointer", fontFamily: "inherit",
                  color: active ? "#08080f" : "#fff",
                  fontSize: 15, fontWeight: 800,
                }}
              >
                {DIFFICULTY_LABELS[d]}
              </button>
            );
          })}
        </div>

        {/* Categories */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <p style={sectionLabel}>Kategorie</p>
          <button onClick={toggleAllCats} style={{
            background: "none", border: "none", color: "#a5b4fc",
            fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
          }}>
            {allCats ? "Odznacz wszystkie" : "Zaznacz wszystkie"}
          </button>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 22 }}>
          {CATEGORY_KEYS.map(key => {
            const active = cats.includes(key);
            return (
              <button
                key={key}
                onClick={() => toggleCat(key)}
                style={{
                  background: active ? "#2d2a6a" : "#0e0e24",
                  border: `1px solid ${active ? "#7c6cf5" : "#22205a"}`,
                  color: active ? "#fff" : "#5d5a8a",
                  borderRadius: 20, padding: "8px 14px",
                  fontSize: 13, fontWeight: 700,
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                {CATEGORY_LABELS[key]}
              </button>
            );
          })}
        </div>

        {/* Players */}
        <p style={sectionLabel}>Gracze</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
          {players.map((p, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 12, height: 12, borderRadius: 6, background: p.color, flexShrink: 0 }} />
              <input
                value={p.name}
                onChange={e => renamePlayer(i, e.target.value)}
                maxLength={16}
                style={{
                  flex: 1, background: "#0e0e24", border: "1px solid #22205a",
                  color: "#fff", borderRadius: 10, padding: "10px 12px",
                  fontSize: 15, fontWeight: 600, fontFamily: "inherit",
                }}
              />
              <button
                onClick={() => removePlayer(i)}
                disabled={players.length <= 1}
                style={{
                  background: "rgba(244,63,94,0.12)", border: "1px solid #4a1526",
                  color: players.length <= 1 ? "#4a1526" : "#f87083",
                  width: 38, height: 38, borderRadius: 10, fontSize: 18,
                  cursor: players.length <= 1 ? "not-allowed" : "pointer",
                  fontFamily: "inherit", flexShrink: 0,
                }}
              >−</button>
            </div>
          ))}
        </div>
        <button onClick={addPlayer} style={{
          background: "#0e0e24", border: "1px dashed #2d2a6a",
          color: "#a5b4fc", borderRadius: 12, padding: "12px",
          fontSize: 14, fontWeight: 700, cursor: "pointer",
          fontFamily: "inherit", marginBottom: 24,
        }}>
          + Dodaj gracza
        </button>

        {/* Start */}
        <button
          onClick={startGame}
          disabled={!canStart}
          style={{
            background: canStart ? "linear-gradient(135deg, #7c3aed, #a855f7)" : "#1a1830",
            border: "none", color: canStart ? "#fff" : "#4b4870",
            borderRadius: 50, padding: "18px",
            fontSize: 18, fontWeight: 800,
            cursor: canStart ? "pointer" : "not-allowed",
            fontFamily: "inherit",
          }}
        >
          Start · {setupPoolCount} pytań
        </button>
        {setupPoolCount === 0 && (
          <p style={{ color: "#f87083", fontSize: 12, textAlign: "center", marginTop: 10 }}>
            Wybierz przynajmniej jedną kategorię
          </p>
        )}
      </div>
    );
  }

  // ── Quiz screen ───────────────────────────────────────────
  return (
    <div style={{
      minHeight: "100vh",
      background: "#08080f",
      fontFamily: "system-ui, -apple-system, sans-serif",
      display: "flex", flexDirection: "column",
      padding: "16px",
      boxSizing: "border-box",
      color: "#eeeeff",
    }}>

      {/* Top bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <span style={{ color: "#5d5a8a", fontSize: 13, fontWeight: 600 }}>
          {qIdx + 1} / {qs.length}
        </span>
        <button onClick={backToSetup} title="Zmień ustawienia" style={{
          background: "none", border: `1px solid ${DIFF_COLORS[difficulty]}`,
          color: DIFF_COLORS[difficulty], borderRadius: 20, padding: "4px 14px",
          fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "inherit",
        }}>
          {DIFFICULTY_LABELS[difficulty]} ⚙
        </button>
        <button onClick={reset} style={{
          background: "none", border: "1px solid #22205a",
          color: "#5d5a8a", borderRadius: 20, padding: "4px 12px",
          fontSize: 12, cursor: "pointer", fontFamily: "inherit",
        }}>
          Resetuj
        </button>
      </div>

      {/* Question card */}
      <div style={{
        background: "#0e0e24",
        border: "2px solid #2d2a6a",
        borderRadius: 24,
        padding: "28px 24px",
        textAlign: "center",
        marginBottom: 16,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
      }}>
        <div style={{ fontSize: 30, marginBottom: 12 }}>🎯</div>
        <p style={{ fontSize: 24, fontWeight: 900, margin: "0 0 20px", lineHeight: 1.35, color: "#fff" }}>
          {qs[qIdx]?.q}
        </p>

        {/* Stopwatch */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{
            fontSize: 34, fontWeight: 900, minWidth: 60, textAlign: "right",
            color: locked ? "#ef4444" : running ? "#f59e0b" : seconds > 0 ? "#a5b4fc" : "#2d2a6a",
            fontVariantNumeric: "tabular-nums",
            transition: "color 0.2s",
          }}>
            {locked ? "⛔ 5s" : `${seconds}s`}
          </span>
          <button onClick={startStop} disabled={locked} style={{
            background: locked ? "#3a0a0a" : running ? "#7f1d1d" : "#14532d",
            border: `2px solid ${locked ? "#7f1d1d" : running ? "#ef4444" : "#22c55e"}`,
            color: locked ? "#7f1d1d" : running ? "#fca5a5" : "#86efac",
            borderRadius: 50, padding: "8px 18px",
            fontSize: 15, fontWeight: 800,
            cursor: locked ? "not-allowed" : "pointer",
            fontFamily: "inherit",
          }}>
            {locked ? "🔒 CZAS!" : running ? "⏸ Stop" : "▶ Start"}
          </button>
          <button onClick={resetTimer} style={{
            background: "none", border: "1px solid #22205a",
            color: "#5d5a8a", borderRadius: 50,
            padding: "8px 14px", fontSize: 14,
            cursor: "pointer", fontFamily: "inherit",
          }}>↺</button>
        </div>
      </div>

      {/* Label */}
      <p style={{
        color: "#5d5a8a", fontSize: 11, textAlign: "center",
        margin: "0 0 10px", fontWeight: 700, letterSpacing: 2,
        textTransform: "uppercase",
      }}>
        Kto odpowiedział?
      </p>

      {/* Player grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        gap: 10,
        marginBottom: 14,
        flex: 1,
      }}>
        {players.map((p, i) => {
          const isFlash = flash === i;
          const isLeader = (scores[i] ?? 0) === topScore && topScore > 0;
          return (
            <div key={i} style={{ position: "relative" }}>
              <button
                onClick={() => addPoint(i)}
                style={{
                  width: "100%", height: "100%",
                  background: isFlash ? p.color : "#0e0e24",
                  border: `2px solid ${p.color}`,
                  borderRadius: 16,
                  padding: "16px 6px 12px",
                  color: "#fff",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "background 0.15s, transform 0.1s",
                  transform: isFlash ? "scale(1.05)" : "scale(1)",
                  display: "flex", flexDirection: "column",
                  alignItems: "center", gap: 4,
                  boxSizing: "border-box",
                }}
              >
                {isLeader && !isFlash && (
                  <span style={{ position: "absolute", top: 6, left: 8, fontSize: 12 }}>👑</span>
                )}
                <span style={{ fontSize: 14, fontWeight: 700, color: isFlash ? "#fff" : "#c4c0f0" }}>
                  {p.name}
                </span>
                <span style={{ fontSize: 32, fontWeight: 900, color: isFlash ? "#fff" : p.color, lineHeight: 1 }}>
                  {isFlash ? "🎉" : (scores[i] ?? 0)}
                </span>
              </button>
              <button
                onClick={(e) => removePoint(i, e)}
                style={{
                  position: "absolute", top: 6, right: 7,
                  background: "rgba(0,0,0,0.4)",
                  border: "none", color: "#888",
                  width: 20, height: 20, borderRadius: 10,
                  fontSize: 14, lineHeight: "18px",
                  cursor: "pointer", fontFamily: "inherit",
                  padding: 0, textAlign: "center",
                }}
              >−</button>
            </div>
          );
        })}
      </div>

      {/* Navigation */}
      <div style={{ display: "flex", gap: 10 }}>
        <button
          onClick={() => { if (qIdx > 0) { resetTimer(); setQIdx(i => i - 1); } }}
          disabled={qIdx === 0}
          style={{
            background: "#0e0e24", border: "1px solid #22205a",
            color: qIdx === 0 ? "#333" : "#a5b4fc",
            borderRadius: 50, padding: "14px 20px",
            fontSize: 20, cursor: qIdx === 0 ? "default" : "pointer",
            fontFamily: "inherit",
          }}
        >←</button>
        <button
          onClick={() => qIdx < qs.length - 1 && goNext()}
          disabled={qIdx === qs.length - 1}
          style={{
            flex: 1,
            background: qIdx < qs.length - 1 ? "linear-gradient(135deg, #7c3aed, #a855f7)" : "#1a1830",
            border: "none", color: "#fff",
            borderRadius: 50, padding: "16px",
            fontSize: 18, fontWeight: 700,
            cursor: qIdx < qs.length - 1 ? "pointer" : "default",
            fontFamily: "inherit",
          }}
        >
          Następne pytanie →
        </button>
      </div>
    </div>
  );
}
