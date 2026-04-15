import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameState } from "../hooks/useGameState.js";
import { useSocket } from "../hooks/useSocket.js";
import { PlayerRing } from "../components/PlayerRing.js";
import { RECOMMENDED_DISTRIBUTIONS, RoleName } from "@werewolf/shared";

interface LobbyScreenProps {
  onGameStart: () => void;
}

export function LobbyScreen({ onGameStart: _onGameStart }: LobbyScreenProps) {
  const { session, playerId, isHost, myPlayer } = useGameState();
  const { sendReady, sendHostStart, sendHostKick } = useSocket();
  const [copied, setCopied] = useState(false);
  const [roleConfig, setRoleConfig] = useState<Record<string, number>>({});
  const [showRoleConfig, setShowRoleConfig] = useState(false);

  if (!session || !playerId) return null;

  const players = session.players;
  const allReady = players.every((p) => p.isReady);
  const canStart = isHost && players.length >= 6;

  const shareLink = `${window.location.origin}/join/${session.code}`;

  async function copyLink() {
    await navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleStart() {
    // Build role config: use custom or recommended default
    const playerCount = players.length;
    const recommended = RECOMMENDED_DISTRIBUTIONS[playerCount];
    const config: Record<string, number> = Object.keys(roleConfig).length > 0
      ? roleConfig
      : recommended
      ? {
          ...Object.fromEntries(recommended.werewolves.map((r) => [r, (recommended.werewolves.filter((x) => x === r).length)])),
          ...Object.fromEntries(recommended.villageSpecial.map((r) => [r, 1])),
          [RoleName.Villager]: recommended.villagers,
          ...Object.fromEntries(recommended.neutral.map((r) => [r, 1])),
        }
      : { [RoleName.Werewolf]: 2, [RoleName.Seer]: 1, [RoleName.Doctor]: 1, [RoleName.Villager]: players.length - 3 };

    sendHostStart(config);
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={styles.header}
      >
        <div>
          <h1 style={styles.title}>Lobby</h1>
          <div style={styles.codeRow}>
            <span style={styles.codeLabel}>Room Code:</span>
            <span style={styles.code}>{session.code}</span>
          </div>
        </div>
        <div style={styles.headerRight}>
          <button style={styles.copyBtn} onClick={copyLink}>
            {copied ? "✓ Copied!" : "📋 Copy Link"}
          </button>
        </div>
      </motion.div>

      {/* Player ring */}
      <div style={styles.ringSection}>
        <PlayerRing
          players={players}
          myPlayerId={playerId}
          size="md"
        />
      </div>

      {/* Player list */}
      <div style={styles.playerList}>
        <AnimatePresence>
          {players.map((player) => (
            <motion.div
              key={player.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              style={styles.playerRow}
            >
              <div
                style={{
                  ...styles.playerAvatar,
                  background: player.color,
                }}
              >
                {player.name.charAt(0).toUpperCase()}
              </div>
              <div style={styles.playerInfo}>
                <span style={{ fontWeight: 600, color: "#e8e8f0" }}>
                  {player.name}
                  {player.id === playerId && " (you)"}
                  {player.id === session.hostPlayerId && " 👑"}
                </span>
                <div style={styles.playerMeta}>
                  <span style={{ ...styles.dot, background: player.isConnected ? "#2A9D8F" : "#666" }} />
                  <span style={{ fontSize: "12px", color: "#888" }}>
                    {player.isConnected ? "Online" : "Offline"}
                  </span>
                </div>
              </div>
              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "8px" }}>
                {player.isReady && (
                  <span style={styles.readyBadge}>Ready</span>
                )}
                {isHost && player.id !== playerId && (
                  <button
                    style={styles.kickBtn}
                    onClick={() => sendHostKick(player.id)}
                    title="Kick player"
                  >
                    ✕
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Actions */}
      <div style={styles.actions}>
        {!myPlayer?.isReady && (
          <button style={styles.readyBtn} onClick={() => sendReady(playerId)}>
            Ready Up ✓
          </button>
        )}
        {myPlayer?.isReady && (
          <div style={styles.waitingText}>
            Waiting for others... ({players.filter((p) => p.isReady).length}/{players.length} ready)
          </div>
        )}
        {isHost && (
          <button
            style={{ ...styles.startBtn, opacity: canStart ? 1 : 0.4 }}
            onClick={handleStart}
            disabled={!canStart}
          >
            {players.length < 6
              ? `Need ${6 - players.length} more players`
              : "Start Game"}
          </button>
        )}
      </div>

      {/* Share URL bar */}
      <div style={styles.shareBar}>
        <span style={styles.shareLabel}>Share link:</span>
        <span style={styles.shareUrl}>{shareLink}</span>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    background: "radial-gradient(ellipse at top, #1a0a2e 0%, #0a0a0f 60%)",
    padding: "24px 20px",
    display: "flex",
    flexDirection: "column" as const,
    gap: "20px",
    maxWidth: "700px",
    margin: "0 auto",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  title: {
    fontSize: "28px",
    fontWeight: 800,
    color: "#e8e8f0",
  },
  codeRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginTop: "4px",
  },
  codeLabel: {
    fontSize: "13px",
    color: "#888",
  },
  code: {
    fontSize: "20px",
    fontWeight: 800,
    letterSpacing: "0.2em",
    color: "#F4A261",
    background: "rgba(244,162,97,0.1)",
    padding: "2px 12px",
    borderRadius: "8px",
    border: "1px solid rgba(244,162,97,0.2)",
  },
  headerRight: {
    display: "flex",
    gap: "10px",
  },
  copyBtn: {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "10px",
    padding: "10px 14px",
    minHeight: "44px",
    color: "#e8e8f0",
    fontSize: "13px",
    cursor: "pointer",
  },
  ringSection: {
    display: "flex",
    justifyContent: "center",
    paddingTop: "10px",
  },
  playerList: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "8px",
  },
  playerRow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: "12px",
    padding: "12px 16px",
  },
  playerAvatar: {
    width: 40,
    height: 40,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "18px",
    fontWeight: 700,
    color: "#fff",
    flexShrink: 0,
  },
  playerInfo: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "2px",
  },
  playerMeta: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
  },
  dot: {
    display: "inline-block",
    width: 7,
    height: 7,
    borderRadius: "50%",
  },
  readyBadge: {
    background: "rgba(167,201,87,0.15)",
    border: "1px solid rgba(167,201,87,0.3)",
    color: "#A7C957",
    borderRadius: "8px",
    padding: "3px 10px",
    fontSize: "12px",
    fontWeight: 600,
  },
  kickBtn: {
    background: "rgba(230,57,70,0.1)",
    border: "1px solid rgba(230,57,70,0.2)",
    color: "#E63946",
    borderRadius: "6px",
    padding: "10px 14px",
    minHeight: "44px",
    minWidth: "44px",
    cursor: "pointer",
    fontSize: "13px",
  },
  actions: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "10px",
  },
  readyBtn: {
    background: "linear-gradient(135deg, #2A9D8F, #264653)",
    border: "none",
    borderRadius: "12px",
    padding: "14px",
    color: "#fff",
    fontSize: "16px",
    fontWeight: 700,
    cursor: "pointer",
  },
  waitingText: {
    textAlign: "center" as const,
    color: "#888",
    fontSize: "14px",
    padding: "10px",
  },
  startBtn: {
    background: "linear-gradient(135deg, #6A0572, #E63946)",
    border: "none",
    borderRadius: "12px",
    padding: "14px",
    color: "#fff",
    fontSize: "16px",
    fontWeight: 700,
    cursor: "pointer",
    transition: "opacity 0.2s",
  },
  shareBar: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: "10px",
    padding: "10px 14px",
    overflow: "hidden",
  },
  shareLabel: {
    fontSize: "12px",
    color: "#888",
    whiteSpace: "nowrap" as const,
    flexShrink: 0,
  },
  shareUrl: {
    fontSize: "12px",
    color: "#4361EE",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
  },
} as const;
