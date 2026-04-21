import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameState } from "../hooks/useGameState.js";
import { useSocket } from "../hooks/useSocket.js";
import { PlayerRing } from "../components/PlayerRing.js";
import { RECOMMENDED_DISTRIBUTIONS, RoleName } from "@werewolf/shared";
import { color, font, space, radius, shadow, layout } from "../design/tokens.js";
import { useBreakpoint } from "../design/useBreakpoint.js";

interface LobbyScreenProps {
  onGameStart: () => void;
}

export function LobbyScreen({ onGameStart: _onGameStart }: LobbyScreenProps) {
  const { session, playerId, isHost, myPlayer } = useGameState();
  const { sendReady, sendHostStart, sendHostKick } = useSocket();
  const { isDesktopUp } = useBreakpoint();
  const [copied, setCopied] = useState(false);
  const [roleConfig] = useState<Record<string, number>>({});

  if (!session || !playerId) return null;

  const players = session.players;
  const readyCount = players.filter((p) => p.isReady).length;
  const canStart = isHost && players.length >= 6;

  const shareLink = `${window.location.origin}/join/${session.code}`;

  async function copyLink() {
    await navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleStart() {
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

  // ─── Composable pieces (reused by both mobile + desktop layouts) ───────────

  const header = (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      style={styles.header}
    >
      <div>
        <p style={styles.eyebrow}>Lobby</p>
        <div style={styles.codeRow}>
          <span style={styles.codeLabel}>Room</span>
          <span style={styles.code}>{session.code}</span>
        </div>
      </div>
      <button style={styles.copyBtn} onClick={copyLink} aria-label="Copy share link">
        {copied ? "✓ Copied" : "Copy link"}
      </button>
    </motion.header>
  );

  const ring = (
    <div style={styles.ringSection}>
      <PlayerRing players={players} myPlayerId={playerId} size={isDesktopUp ? "lg" : "md"} />
      <div style={styles.ringMeta}>
        <span style={styles.ringCount}>{players.length}/20</span>
        <span style={styles.ringReady}>
          <span style={styles.dotReady} />
          {readyCount} ready
        </span>
      </div>
    </div>
  );

  const playerList = (
    <section style={styles.playerList} aria-label="Players in lobby">
      <AnimatePresence>
        {players.map((player) => (
          <motion.div
            key={player.id}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 12 }}
            style={styles.playerRow}
          >
            <div style={{ ...styles.playerAvatar, background: player.color }}>
              {player.name.charAt(0).toUpperCase()}
            </div>
            <div style={styles.playerInfo}>
              <span style={styles.playerName}>
                {player.name}
                {player.id === playerId && <span style={styles.youTag}> (you)</span>}
                {player.id === session.hostPlayerId && <span style={styles.crown}>👑</span>}
              </span>
              <div style={styles.playerMeta}>
                <span style={{ ...styles.dot, background: player.isConnected ? color.state.success : color.text.muted }} />
                <span style={styles.metaText}>{player.isConnected ? "Online" : "Offline"}</span>
              </div>
            </div>
            <div style={styles.rowActions}>
              {player.isReady && <span style={styles.readyBadge}>Ready</span>}
              {isHost && player.id !== playerId && (
                <button
                  style={styles.kickBtn}
                  onClick={() => sendHostKick(player.id)}
                  aria-label={`Kick ${player.name}`}
                  title="Kick player"
                >
                  ✕
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </section>
  );

  const actions = (
    <div style={styles.actions}>
      {!myPlayer?.isReady && (
        <button style={styles.readyBtn} onClick={() => sendReady(playerId)}>
          I'm Ready
        </button>
      )}
      {myPlayer?.isReady && (
        <div style={styles.waitingText}>
          Waiting for others… <strong>{readyCount}/{players.length}</strong> ready
        </div>
      )}
      {isHost && (
        <button
          style={{ ...styles.startBtn, opacity: canStart ? 1 : 0.4, cursor: canStart ? "pointer" : "not-allowed" }}
          onClick={handleStart}
          disabled={!canStart}
        >
          {players.length < 6 ? `Need ${6 - players.length} more players` : "Start Game"}
        </button>
      )}
      <div style={styles.shareBar}>
        <span style={styles.shareLabel}>Link</span>
        <span style={styles.shareUrl} title={shareLink}>{shareLink}</span>
      </div>
    </div>
  );

  // ─── Desktop: two-column (ring left · list+actions right) ──────────────────
  if (isDesktopUp) {
    return (
      <div style={styles.pageDesktop}>
        <div style={styles.containerDesktop}>
          {header}
          <div style={styles.gridDesktop}>
            <div style={styles.colLeft}>{ring}</div>
            <div style={styles.colRight}>
              {playerList}
              {actions}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Mobile: single column, ring up top, list below, actions bottom ────────
  return (
    <div style={styles.pageMobile}>
      {header}
      {ring}
      {playerList}
      {actions}
    </div>
  );
}

const styles = {
  // Page containers
  pageMobile: {
    minHeight: "100vh",
    background: color.bg.app,
    padding: `${space[5]} ${space[4]}`,
    display: "flex",
    flexDirection: "column" as const,
    gap: space[5],
    maxWidth: layout.maxWidthMobile,
    margin: "0 auto",
  } as React.CSSProperties,
  pageDesktop: {
    minHeight: "100vh",
    background: color.bg.app,
    padding: `${space[7]} ${space[6]}`,
    display: "flex",
    justifyContent: "center",
  } as React.CSSProperties,
  containerDesktop: {
    width: "100%",
    maxWidth: layout.maxWidthDesktop,
    display: "flex",
    flexDirection: "column" as const,
    gap: space[7],
  } as React.CSSProperties,
  gridDesktop: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: space[8],
    alignItems: "start",
  } as React.CSSProperties,
  colLeft: {
    position: "sticky" as const,
    top: space[6],
  },
  colRight: {
    display: "flex",
    flexDirection: "column" as const,
    gap: space[5],
  } as React.CSSProperties,

  // Header
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: space[4],
  } as React.CSSProperties,
  eyebrow: {
    fontSize: font.size.xs,
    fontWeight: font.weight.semibold,
    color: color.text.muted,
    textTransform: "uppercase" as const,
    letterSpacing: font.letterSpacing.wider,
    marginBottom: space[1],
  } as React.CSSProperties,
  codeRow: {
    display: "flex",
    alignItems: "baseline",
    gap: space[3],
  } as React.CSSProperties,
  codeLabel: {
    fontSize: font.size.sm,
    color: color.text.secondary,
  } as React.CSSProperties,
  code: {
    fontFamily: font.family.mono,
    fontSize: font.size.xl,
    fontWeight: font.weight.bold,
    letterSpacing: "0.25em",
    color: color.text.primary,
    background: color.surface.input,
    padding: `${space[1]} ${space[3]}`,
    borderRadius: radius.md,
    border: `1px solid ${color.border.subtle}`,
  } as React.CSSProperties,
  copyBtn: {
    background: color.surface.raised,
    border: `1px solid ${color.border.default}`,
    borderRadius: radius.md,
    padding: `${space[2]} ${space[4]}`,
    minHeight: layout.minTapTarget,
    color: color.text.primary,
    fontSize: font.size.sm,
    fontWeight: font.weight.semibold,
    cursor: "pointer",
    transition: "background 150ms ease",
  } as React.CSSProperties,

  // Ring
  ringSection: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    gap: space[4],
    padding: space[4],
    background: color.surface.card,
    border: `1px solid ${color.border.subtle}`,
    borderRadius: radius.xl,
  } as React.CSSProperties,
  ringMeta: {
    display: "flex",
    gap: space[5],
    alignItems: "center",
    fontSize: font.size.sm,
    color: color.text.secondary,
  } as React.CSSProperties,
  ringCount: {
    fontWeight: font.weight.bold,
    color: color.text.primary,
    fontFamily: font.family.mono,
  } as React.CSSProperties,
  ringReady: {
    display: "inline-flex",
    alignItems: "center",
    gap: space[2],
  } as React.CSSProperties,
  dotReady: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: color.state.success,
    boxShadow: `0 0 8px ${color.state.success}`,
  } as React.CSSProperties,

  // Player list
  playerList: {
    display: "flex",
    flexDirection: "column" as const,
    gap: space[2],
  } as React.CSSProperties,
  playerRow: {
    display: "flex",
    alignItems: "center",
    gap: space[3],
    background: color.surface.card,
    border: `1px solid ${color.border.subtle}`,
    borderRadius: radius.lg,
    padding: `${space[3]} ${space[4]}`,
    minHeight: layout.minTapTarget,
  } as React.CSSProperties,
  playerAvatar: {
    width: 40,
    height: 40,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: font.size.lg,
    fontWeight: font.weight.bold,
    color: color.text.onAccent,
    flexShrink: 0,
    boxShadow: shadow.sm,
  } as React.CSSProperties,
  playerInfo: {
    display: "flex",
    flexDirection: "column" as const,
    gap: space[1],
    minWidth: 0,
    flex: 1,
  } as React.CSSProperties,
  playerName: {
    fontWeight: font.weight.semibold,
    color: color.text.primary,
    fontSize: font.size.base,
  } as React.CSSProperties,
  youTag: {
    color: color.text.muted,
    fontWeight: font.weight.regular,
  } as React.CSSProperties,
  crown: {
    marginLeft: space[2],
  } as React.CSSProperties,
  playerMeta: {
    display: "flex",
    alignItems: "center",
    gap: space[2],
  } as React.CSSProperties,
  dot: {
    display: "inline-block",
    width: 6,
    height: 6,
    borderRadius: "50%",
  } as React.CSSProperties,
  metaText: {
    fontSize: font.size.xs,
    color: color.text.muted,
  } as React.CSSProperties,
  rowActions: {
    marginLeft: "auto",
    display: "flex",
    alignItems: "center",
    gap: space[2],
  } as React.CSSProperties,
  readyBadge: {
    background: color.state.successBg,
    border: `1px solid ${color.state.success}`,
    color: color.state.success,
    borderRadius: radius.pill,
    padding: `${space[1]} ${space[3]}`,
    fontSize: font.size.xs,
    fontWeight: font.weight.semibold,
    letterSpacing: font.letterSpacing.wide,
    textTransform: "uppercase" as const,
  } as React.CSSProperties,
  kickBtn: {
    background: "transparent",
    border: `1px solid ${color.border.subtle}`,
    color: color.text.muted,
    borderRadius: radius.md,
    minWidth: layout.minTapTarget,
    minHeight: layout.minTapTarget,
    cursor: "pointer",
    fontSize: font.size.base,
    transition: "all 150ms ease",
  } as React.CSSProperties,

  // Actions
  actions: {
    display: "flex",
    flexDirection: "column" as const,
    gap: space[3],
  } as React.CSSProperties,
  readyBtn: {
    background: color.accent.base,
    border: "none",
    borderRadius: radius.md,
    padding: space[4],
    color: color.text.onAccent,
    fontSize: font.size.md,
    fontWeight: font.weight.bold,
    cursor: "pointer",
    minHeight: layout.minTapTarget,
    boxShadow: shadow.sm,
    transition: "background 150ms ease",
  } as React.CSSProperties,
  waitingText: {
    textAlign: "center" as const,
    color: color.text.secondary,
    fontSize: font.size.sm,
    padding: space[3],
    background: color.bg.elevated,
    borderRadius: radius.md,
    border: `1px solid ${color.border.subtle}`,
  } as React.CSSProperties,
  startBtn: {
    background: color.accent.base,
    border: "none",
    borderRadius: radius.md,
    padding: space[4],
    color: color.text.onAccent,
    fontSize: font.size.md,
    fontWeight: font.weight.bold,
    minHeight: layout.minTapTarget,
    transition: "opacity 150ms ease, background 150ms ease",
    boxShadow: shadow.accentGlow,
  } as React.CSSProperties,
  shareBar: {
    display: "flex",
    alignItems: "center",
    gap: space[3],
    background: color.surface.input,
    border: `1px solid ${color.border.subtle}`,
    borderRadius: radius.md,
    padding: `${space[2]} ${space[4]}`,
    overflow: "hidden",
  } as React.CSSProperties,
  shareLabel: {
    fontSize: font.size.xs,
    color: color.text.muted,
    textTransform: "uppercase" as const,
    letterSpacing: font.letterSpacing.wide,
    fontWeight: font.weight.semibold,
    flexShrink: 0,
  } as React.CSSProperties,
  shareUrl: {
    fontSize: font.size.sm,
    color: color.moonlight.base,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
    fontFamily: font.family.mono,
  } as React.CSSProperties,
} as const;
