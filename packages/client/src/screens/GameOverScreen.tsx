import React from "react";
import { motion } from "framer-motion";
import { useGameState } from "../hooks/useGameState.js";
import { useGameStore } from "../stores/gameStore.js";
import { useSocket } from "../hooks/useSocket.js";
import { Team, RoleName, WinReason } from "@werewolf/shared";

const WINNER_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  [Team.VILLAGE]: { label: "Village Wins!", icon: "🧑‍🌾", color: "#2A9D8F" },
  [Team.WEREWOLF]: { label: "Werewolves Win!", icon: "🐺", color: "#E63946" },
  TANNER: { label: "Tanner Wins!", icon: "🪡", color: "#F4A261" },
  SERIAL_KILLER: { label: "Serial Killer Wins!", icon: "🔪", color: "#6A0572" },
  LOVERS: { label: "Lovers Win!", icon: "💘", color: "#F72585" },
};

const WIN_REASON_LABELS: Partial<Record<WinReason, string>> = {
  [WinReason.AllWerewolvesDead]: "All werewolves were eliminated",
  [WinReason.WerewolvesOutnumber]: "Werewolves outnumbered the village",
  [WinReason.TannerLynched]: "The Tanner was lynched",
  [WinReason.SerialKillerLast]: "Serial Killer was the last one standing",
  [WinReason.LoversLast]: "Cross-team Lovers were the last two alive",
};

export function GameOverScreen() {
  const { gameOverData, playerId, session } = useGameState();
  const reset = useGameStore((s) => s.reset);
  const { sendHostReset } = useSocket();
  const isHost = session?.hostPlayerId === playerId;

  if (!gameOverData) return null;

  const { winner, winReason, winningPlayerIds, allRoles } = gameOverData;
  const config = winner ? WINNER_CONFIG[winner] ?? { label: "Game Over", icon: "🎮", color: "#888" } : { label: "Game Over", icon: "🎮", color: "#888" };

  const didIWin = playerId && winningPlayerIds.includes(playerId);

  return (
    <div style={styles.container}>
      {/* Victory banner */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 100, damping: 15 }}
        style={{ textAlign: "center", padding: "20px 0" }}
      >
        <motion.div
          animate={{ rotate: [0, -5, 5, -5, 0] }}
          transition={{ repeat: 2, duration: 0.5, delay: 0.5 }}
          style={{ fontSize: "64px", display: "block", marginBottom: "12px" }}
        >
          {config.icon}
        </motion.div>
        <h1 style={{ fontSize: "32px", fontWeight: 900, color: config.color }}>
          {config.label}
        </h1>
        {winReason && (
          <p style={{ color: "#888", fontSize: "14px", marginTop: "8px" }}>
            {WIN_REASON_LABELS[winReason] ?? winReason}
          </p>
        )}
        {playerId && (
          <div
            style={{
              display: "inline-block",
              marginTop: "12px",
              background: didIWin ? `${config.color}20` : "rgba(255,255,255,0.05)",
              border: `1px solid ${didIWin ? `${config.color}50` : "rgba(255,255,255,0.1)"}`,
              borderRadius: "20px",
              padding: "6px 18px",
              fontSize: "14px",
              fontWeight: 700,
              color: didIWin ? config.color : "#888",
            }}
          >
            {didIWin ? "🏆 You won!" : "😔 You lost"}
          </div>
        )}
      </motion.div>

      {/* Full role reveal */}
      <section>
        <h2 style={styles.sectionTitle}>All Roles</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {allRoles.map((entry, i) => {
            const isWinner = winningPlayerIds.includes(entry.playerId);
            const teamColors: Record<Team, string> = {
              [Team.VILLAGE]: "#2A9D8F",
              [Team.WEREWOLF]: "#E63946",
              [Team.NEUTRAL]: "#F4A261",
            };
            const color = teamColors[entry.team];

            return (
              <motion.div
                key={entry.playerId}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: isWinner ? `${color}0f` : "rgba(255,255,255,0.02)",
                  border: `1px solid ${isWinner ? `${color}30` : "rgba(255,255,255,0.06)"}`,
                  borderRadius: "12px",
                  padding: "12px 16px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "15px", fontWeight: 600, color: "#e8e8f0" }}>
                    {entry.playerName}
                    {entry.playerId === playerId && (
                      <span style={{ color: "#888", fontSize: "12px", marginLeft: "6px" }}>(you)</span>
                    )}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ color, fontSize: "13px", fontWeight: 600 }}>
                    {entry.role.replace(/([A-Z])/g, " $1").trim()}
                  </span>
                  {isWinner && <span style={{ fontSize: "14px" }}>🏆</span>}
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Action buttons */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {isHost && (
          <button
            style={styles.playAgainBtn}
            onClick={sendHostReset}
          >
            🔄 Play Again (same room)
          </button>
        )}
        <button
          style={styles.leaveBtn}
          onClick={() => {
            reset();
            window.location.href = "/";
          }}
        >
          {isHost ? "🚪 End Session" : "🚪 Leave Game"}
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    background: "radial-gradient(ellipse at center, #0a0a1e 0%, #030308 70%)",
    padding: "24px 20px 40px",
    display: "flex",
    flexDirection: "column" as const,
    gap: "28px",
    maxWidth: "600px",
    margin: "0 auto",
  },
  sectionTitle: {
    fontSize: "13px",
    fontWeight: 700,
    color: "#888",
    textTransform: "uppercase" as const,
    letterSpacing: "0.1em",
    marginBottom: "12px",
  },
  playAgainBtn: {
    background: "linear-gradient(135deg, #6A0572, #4361EE)",
    border: "none",
    borderRadius: "14px",
    padding: "16px",
    color: "#fff",
    fontSize: "16px",
    fontWeight: 800,
    cursor: "pointer",
  },
  leaveBtn: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "14px",
    padding: "14px",
    color: "#888",
    fontSize: "15px",
    fontWeight: 600,
    cursor: "pointer",
  },
} as const;
