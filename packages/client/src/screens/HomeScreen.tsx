import React, { useState } from "react";
import { motion } from "framer-motion";
import { useGameStore } from "../stores/gameStore.js";
import { color, font, space, radius, shadow, layout } from "../design/tokens.js";

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
      {/* Atmospheric moon vignette — desktop only, sits behind card. */}
      <div aria-hidden style={styles.vignette} />

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        style={styles.card}
      >
        <header style={styles.logo}>
          <span style={styles.logoIcon}>🐺</span>
          <h1 style={styles.title}>Werewolf Online</h1>
          <p style={styles.subtitle}>Social deduction for 6–20 players</p>
        </header>

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
            initial={{ opacity: 0, x: 12 }}
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
              placeholder="Enter your name…"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={16}
              minLength={2}
              autoComplete="nickname"
              autoFocus
            />
            <button
              type="button"
              style={styles.btnGhost}
              onClick={() => setShowAdvanced((v) => !v)}
              aria-expanded={showAdvanced}
            >
              {showAdvanced ? "▲ Hide phase timers" : "▼ Phase timers"}
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
              {loading ? "Creating…" : "Create Room"}
            </button>
            <button style={styles.btnGhost} type="button" onClick={() => { setMode("home"); setError(null); }}>
              ← Back
            </button>
          </motion.form>
        )}

        {mode === "join" && (
          <motion.form
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            onSubmit={handleJoin}
            style={styles.form}
          >
            <label htmlFor="join-code" style={styles.label}>Room Code</label>
            <input
              id="join-code"
              name="roomCode"
              style={{ ...styles.input, textTransform: "uppercase", letterSpacing: "0.25em", textAlign: "center", fontWeight: 700 }}
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
              placeholder="Enter your name…"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={16}
              minLength={2}
              autoComplete="nickname"
            />
            {error && <p style={styles.error}>{error}</p>}
            <button style={styles.btnPrimary} type="submit" disabled={loading}>
              {loading ? "Joining…" : "Join Room"}
            </button>
            <button style={styles.btnGhost} type="button" onClick={() => { setMode("home"); setError(null); }}>
              ← Back
            </button>
          </motion.form>
        )}
      </motion.div>

      <footer style={styles.footer}>
        <span>v1.0</span>
        <span aria-hidden>·</span>
        <span>No accounts · No tracking</span>
      </footer>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    background: color.bg.app,
    padding: space[5],
    position: "relative" as const,
    overflow: "hidden",
  } as React.CSSProperties,
  vignette: {
    position: "absolute",
    top: "-20%",
    left: "50%",
    transform: "translateX(-50%)",
    width: "min(800px, 120vw)",
    height: "min(800px, 120vw)",
    background: `radial-gradient(circle, ${color.moonlight.bg} 0%, transparent 60%)`,
    pointerEvents: "none",
    zIndex: 0,
  } as React.CSSProperties,
  card: {
    position: "relative",
    zIndex: 2,
    background: color.surface.card,
    border: `1px solid ${color.border.subtle}`,
    borderRadius: radius["3xl"],
    padding: `clamp(${space[6]}, 6vw, ${space[8]}) clamp(${space[5]}, 5vw, ${space[7]})`,
    width: "100%",
    maxWidth: layout.maxWidthMobile,
    boxShadow: shadow.xl,
  } as React.CSSProperties,
  logo: {
    textAlign: "center" as const,
    marginBottom: space[7],
  },
  logoIcon: {
    fontSize: "48px",
    display: "block",
    marginBottom: space[3],
    filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.5))",
  } as React.CSSProperties,
  title: {
    fontSize: font.size["2xl"],
    fontWeight: font.weight.black,
    color: color.text.primary,
    letterSpacing: font.letterSpacing.tight,
    lineHeight: font.lineHeight.tight,
  } as React.CSSProperties,
  subtitle: {
    fontSize: font.size.sm,
    color: color.text.muted,
    marginTop: space[2],
  } as React.CSSProperties,
  buttonGroup: {
    display: "flex",
    flexDirection: "column" as const,
    gap: space[3],
  },
  form: {
    display: "flex",
    flexDirection: "column" as const,
    gap: space[3],
  },
  label: {
    fontSize: font.size.xs,
    fontWeight: font.weight.semibold,
    color: color.text.secondary,
    textTransform: "uppercase" as const,
    letterSpacing: font.letterSpacing.wide,
  } as React.CSSProperties,
  input: {
    background: color.surface.input,
    border: `1px solid ${color.border.subtle}`,
    borderRadius: radius.md,
    padding: `${space[3]} ${space[4]}`,
    color: color.text.primary,
    fontSize: font.size.md,           // 16px min to prevent iOS zoom
    outline: "none",
    transition: "border-color 150ms ease, background 150ms ease",
    width: "100%",
    minHeight: layout.minTapTarget,
  } as React.CSSProperties,
  btnPrimary: {
    background: color.accent.base,
    border: "none",
    borderRadius: radius.md,
    padding: space[4],
    color: color.text.onAccent,
    fontSize: font.size.md,
    fontWeight: font.weight.bold,
    cursor: "pointer",
    transition: "background 150ms ease, transform 80ms ease",
    minHeight: layout.minTapTarget,
    letterSpacing: "0.01em",
    boxShadow: shadow.sm,
  } as React.CSSProperties,
  btnSecondary: {
    background: color.surface.raised,
    border: `1px solid ${color.border.default}`,
    borderRadius: radius.md,
    padding: space[4],
    color: color.text.primary,
    fontSize: font.size.md,
    fontWeight: font.weight.semibold,
    cursor: "pointer",
    transition: "background 150ms ease",
    minHeight: layout.minTapTarget,
  } as React.CSSProperties,
  btnGhost: {
    background: "transparent",
    border: "none",
    color: color.text.secondary,
    fontSize: font.size.sm,
    cursor: "pointer",
    padding: space[2],
    minHeight: layout.minTapTarget,
    textAlign: "center" as const,
  } as React.CSSProperties,
  error: {
    color: color.accent.base,
    fontSize: font.size.sm,
    background: color.accent.bg,
    border: `1px solid ${color.accent.border}`,
    borderRadius: radius.md,
    padding: `${space[3]} ${space[4]}`,
  } as React.CSSProperties,
  advancedBox: {
    background: color.bg.elevated,
    border: `1px solid ${color.border.subtle}`,
    borderRadius: radius.lg,
    padding: space[4],
    display: "flex",
    flexDirection: "column" as const,
    gap: space[4],
  } as React.CSSProperties,
  footer: {
    position: "relative",
    zIndex: 2,
    marginTop: space[6],
    display: "flex",
    gap: space[2],
    fontSize: font.size.xs,
    color: color.text.muted,
    letterSpacing: font.letterSpacing.wide,
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
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: space[2] }}>
        <span style={{ fontSize: font.size.sm, color: color.text.secondary }}>{label}</span>
        <span style={{ fontSize: font.size.sm, fontWeight: font.weight.bold, color: color.text.primary }}>{fmt(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={15}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: color.accent.base, cursor: "pointer" }}
        aria-label={label}
      />
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: font.size.xs, color: color.text.muted, marginTop: space[1] }}>
        <span>{fmt(min)}</span>
        <span>{fmt(max)}</span>
      </div>
    </div>
  );
}
