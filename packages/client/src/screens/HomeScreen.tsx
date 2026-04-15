import React, { useState } from "react";
import { motion } from "framer-motion";
import { useGameStore } from "../stores/gameStore.js";

interface HomeScreenProps {
  onJoined: () => void;
}

export function HomeScreen({ onJoined }: HomeScreenProps) {
  const [mode, setMode] = useState<"home" | "create" | "join">("home");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [nightTimeSecs, setNightTimeSecs] = useState(45);
  const [discussionTimeSecs, setDiscussionTimeSecs] = useState(120);
  const [voteTimeSecs, setVoteTimeSecs] = useState(60);
  const store = useGameStore();

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || name.trim().length < 2) {
      setError("Name must be at least 2 characters.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostName: name.trim(), nightTimeSecs, discussionTimeSecs, voteTimeSecs }),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        setError(data.error ?? "Failed to create session.");
        return;
      }
      const data = await res.json() as { sessionId: string; sessionCode: string; playerId: string; shareableLink: string };
      store.setPlayerId(data.playerId);
      store.setSessionCode(data.sessionCode);
      onJoined();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || name.trim().length < 2) {
      setError("Name must be at least 2 characters.");
      return;
    }
    if (!code.trim() || code.trim().length !== 6) {
      setError("Enter a valid 6-character room code.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/sessions/${code.trim().toUpperCase()}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerName: name.trim() }),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        setError(data.error ?? "Failed to join session.");
        return;
      }
      const data = await res.json() as { playerId: string; sessionId: string };
      store.setPlayerId(data.playerId);
      store.setSessionCode(code.trim().toUpperCase());
      onJoined();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Auto-fill code from URL (shareable links: /join/XXXXXX)
  React.useEffect(() => {
    const match = window.location.pathname.match(/\/join\/([A-Z0-9]{6})/i);
    if (match?.[1]) {
      setCode(match[1].toUpperCase());
      setMode("join");
    }
  }, []);

  return (
    <div style={styles.container}>
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        style={styles.card}
      >
        <div style={styles.logo}>
          <span style={styles.logoIcon}>🐺</span>
          <h1 style={styles.title}>Werewolf Online</h1>
          <p style={styles.subtitle}>Social deduction for 6–20 players</p>
        </div>

        {mode === "home" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={styles.buttonGroup}
          >
            <button style={styles.btnPrimary} onClick={() => setMode("create")}>
              Create Room
            </button>
            <button style={styles.btnSecondary} onClick={() => setMode("join")}>
              Join Room
            </button>
          </motion.div>
        )}

        {mode === "create" && (
          <motion.form
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            onSubmit={handleCreate}
            style={styles.form}
          >
            <label htmlFor="create-name" style={styles.label}>Your Name</label>
            <input
              id="create-name"
              name="playerName"
              style={styles.input}
              type="text"
              placeholder="Enter your name..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={16}
              minLength={2}
              autoComplete="nickname"
              autoFocus
            />
            {/* Advanced phase timers */}
            <button
              type="button"
              style={styles.btnGhost}
              onClick={() => setShowAdvanced((v) => !v)}
            >
              {showAdvanced ? "▲ Hide" : "▼ Phase Timers"}
            </button>
            {showAdvanced && (
              <div style={styles.advancedBox}>
                <PhaseSlider label="🌙 Night phase" value={nightTimeSecs} min={15} max={180} onChange={setNightTimeSecs} />
                <PhaseSlider label="☀️ Discussion" value={discussionTimeSecs} min={30} max={600} onChange={setDiscussionTimeSecs} />
                <PhaseSlider label="⚖️ Vote phase" value={voteTimeSecs} min={15} max={180} onChange={setVoteTimeSecs} />
              </div>
            )}
            {error && <p style={styles.error}>{error}</p>}
            <button style={styles.btnPrimary} type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Room"}
            </button>
            <button style={styles.btnGhost} type="button" onClick={() => { setMode("home"); setError(null); }}>
              Back
            </button>
          </motion.form>
        )}

        {mode === "join" && (
          <motion.form
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            onSubmit={handleJoin}
            style={styles.form}
          >
            <label htmlFor="join-code" style={styles.label}>Room Code</label>
            <input
              id="join-code"
              name="roomCode"
              style={{ ...styles.input, textTransform: "uppercase", letterSpacing: "0.2em", textAlign: "center" }}
              type="text"
              placeholder="XXXXXX"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
              maxLength={6}
              autoComplete="off"
            />
            <label htmlFor="join-name" style={styles.label}>Your Name</label>
            <input
              id="join-name"
              name="playerName"
              style={styles.input}
              type="text"
              placeholder="Enter your name..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={16}
              minLength={2}
              autoComplete="nickname"
            />
            {error && <p style={styles.error}>{error}</p>}
            <button style={styles.btnPrimary} type="submit" disabled={loading}>
              {loading ? "Joining..." : "Join Room"}
            </button>
            <button style={styles.btnGhost} type="button" onClick={() => { setMode("home"); setError(null); }}>
              Back
            </button>
          </motion.form>
        )}
      </motion.div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "radial-gradient(ellipse at center, #1a0a2e 0%, #0a0a0f 70%)",
    padding: "20px",
  } as React.CSSProperties,
  card: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "20px",
    padding: "clamp(24px, 6vw, 48px) clamp(20px, 5vw, 40px)",
    width: "100%",
    maxWidth: "420px",
    backdropFilter: "blur(20px)",
    boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
  } as React.CSSProperties,
  logo: {
    textAlign: "center" as const,
    marginBottom: "36px",
  },
  logoIcon: {
    fontSize: "52px",
    display: "block",
    marginBottom: "12px",
  } as React.CSSProperties,
  title: {
    fontSize: "28px",
    fontWeight: 800,
    color: "#e8e8f0",
    letterSpacing: "-0.02em",
  } as React.CSSProperties,
  subtitle: {
    fontSize: "14px",
    color: "#888",
    marginTop: "6px",
  } as React.CSSProperties,
  buttonGroup: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "12px",
  },
  form: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "12px",
  },
  label: {
    fontSize: "13px",
    fontWeight: 600,
    color: "#aaa",
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
  } as React.CSSProperties,
  input: {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: "10px",
    padding: "12px 16px",
    color: "#e8e8f0",
    fontSize: "16px",
    outline: "none",
    transition: "border-color 0.2s",
    width: "100%",
  } as React.CSSProperties,
  btnPrimary: {
    background: "linear-gradient(135deg, #6A0572, #E63946)",
    border: "none",
    borderRadius: "10px",
    padding: "14px",
    color: "#fff",
    fontSize: "16px",
    fontWeight: 700,
    cursor: "pointer",
    transition: "opacity 0.2s",
    marginTop: "4px",
  } as React.CSSProperties,
  btnSecondary: {
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: "10px",
    padding: "14px",
    color: "#e8e8f0",
    fontSize: "16px",
    fontWeight: 600,
    cursor: "pointer",
  } as React.CSSProperties,
  btnGhost: {
    background: "none",
    border: "none",
    color: "#888",
    fontSize: "14px",
    cursor: "pointer",
    padding: "12px 8px",
    minHeight: "44px",
    textDecoration: "underline",
  } as React.CSSProperties,
  error: {
    color: "#E63946",
    fontSize: "13px",
    background: "rgba(230,57,70,0.1)",
    border: "1px solid rgba(230,57,70,0.3)",
    borderRadius: "8px",
    padding: "10px 14px",
  } as React.CSSProperties,
  advancedBox: {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "12px",
    padding: "16px",
    display: "flex",
    flexDirection: "column" as const,
    gap: "14px",
  } as React.CSSProperties,
} as const;

// ─── Phase timer slider sub-component ────────────────────────────────────────

function PhaseSlider({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  const fmt = (s: number) => s >= 60 ? `${Math.floor(s / 60)}m ${s % 60 > 0 ? `${s % 60}s` : ""}`.trim() : `${s}s`;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
        <span style={{ fontSize: "13px", color: "#aaa" }}>{label}</span>
        <span style={{ fontSize: "13px", fontWeight: 700, color: "#e8e8f0" }}>{fmt(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={15}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: "#6A0572", cursor: "pointer" }}
      />
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#555", marginTop: "2px" }}>
        <span>{fmt(min)}</span>
        <span>{fmt(max)}</span>
      </div>
    </div>
  );
}
