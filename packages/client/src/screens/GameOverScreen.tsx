import React from "react";
import { motion } from "framer-motion";
import { useGameState } from "../hooks/useGameState.js";
import { useGameStore } from "../stores/gameStore.js";
import { useSocket } from "../hooks/useSocket.js";
import { Team, WinReason } from "@werewolf/shared";
import { color, font, space, radius, shadow, layout } from "../design/tokens.js";
import { useBreakpoint } from "../design/useBreakpoint.js";

interface WinnerConfig {
  label: string;
  icon: string;
  color: string;
  bg: string;
  border: string;
}

const WINNER_CONFIG: Record<string, WinnerConfig> = {
  [Team.VILLAGE]: {
    label: "Village Wins!",
    icon: "🧑‍🌾",
    color: color.team.village,
    bg: color.team.villageBg,
    border: color.team.villageBorder,
  },
  [Team.WEREWOLF]: {
    label: "Werewolves Win!",
    icon: "🐺",
    color: color.team.werewolf,
    bg: color.team.werewolfBg,
    border: color.team.werewolfBorder,
  },
  TANNER: {
    label: "Tanner Wins!",
    icon: "🪡",
    color: color.team.neutral,
    bg: color.team.neutralBg,
    border: color.team.neutralBorder,
  },
  SERIAL_KILLER: {
    label: "Serial Killer Wins!",
    icon: "🔪",
    color: color.team.neutral,
    bg: color.team.neutralBg,
    border: color.team.neutralBorder,
  },
  LOVERS: {
    label: "Lovers Win!",
    icon: "💘",
    color: color.moonlight.base,
    bg: color.moonlight.bg,
    border: color.moonlight.border,
  },
};

const FALLBACK_CONFIG: WinnerConfig = {
  label: "Game Over",
  icon: "🎮",
  color: color.text.secondary,
  bg: color.surface.raised,
  border: color.border.subtle,
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
  const { isDesktopUp } = useBreakpoint();
  const isHost = session?.hostPlayerId === playerId;

  if (!gameOverData) return null;

  const { winner, winReason, winningPlayerIds, allRoles } = gameOverData;
  const cfg: WinnerConfig = winner ? WINNER_CONFIG[winner] ?? FALLBACK_CONFIG : FALLBACK_CONFIG;

  const didIWin = !!playerId && winningPlayerIds.includes(playerId);

  const teamColorFor = (team: Team): { fg: string; bg: string; border: string } => {
    switch (team) {
      case Team.VILLAGE:
        return { fg: color.team.village, bg: color.team.villageBg, border: color.team.villageBorder };
      case Team.WEREWOLF:
        return { fg: color.team.werewolf, bg: color.team.werewolfBg, border: color.team.werewolfBorder };
      case Team.NEUTRAL:
      default:
        return { fg: color.team.neutral, bg: color.team.neutralBg, border: color.team.neutralBorder };
    }
  };

  // ─── Composable pieces ─────────────────────────────────────────────────────

  const winnerBanner = (
    <motion.div
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 100, damping: 15 }}
      style={{
        ...styles.bannerCard,
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
      }}
    >
      <motion.div
        animate={{ rotate: [0, -5, 5, -5, 0] }}
        transition={{ repeat: 2, duration: 0.5, delay: 0.5 }}
        style={styles.bannerIcon}
      >
        {cfg.icon}
      </motion.div>
      <h1 style={{ ...styles.bannerLabel, color: cfg.color }}>{cfg.label}</h1>
      {winReason && (
        <p style={styles.bannerReason}>
          {WIN_REASON_LABELS[winReason] ?? winReason}
        </p>
      )}
      {playerId && (
        <div
          style={{
            ...styles.outcomePill,
            background: didIWin ? cfg.bg : color.surface.raised,
            border: `1px solid ${didIWin ? cfg.border : color.border.subtle}`,
            color: didIWin ? cfg.color : color.text.muted,
          }}
        >
          {didIWin ? "🏆 You won!" : "😔 You lost"}
        </div>
      )}
    </motion.div>
  );

  const winningTeamList = (
    <section style={styles.teamListSection}>
      <h2 style={styles.sectionTitle}>Winning Team</h2>
      <div style={styles.teamListWrap}>
        {allRoles
          .filter((entry) => winningPlayerIds.includes(entry.playerId))
          .map((entry) => {
            const tc = teamColorFor(entry.team);
            return (
              <div
                key={entry.playerId}
                style={{
                  ...styles.teamRow,
                  background: tc.bg,
                  border: `1px solid ${tc.border}`,
                }}
              >
                <span style={styles.teamName}>{entry.playerName}</span>
                <span style={{ ...styles.teamRole, color: tc.fg }}>
                  {entry.role.replace(/([A-Z])/g, " $1").trim()}
                </span>
              </div>
            );
          })}
        {winningPlayerIds.length === 0 && (
          <p style={styles.emptyTeam}>No surviving winners.</p>
        )}
      </div>
    </section>
  );

  const allRolesList = (
    <section>
      <h2 style={styles.sectionTitle}>All Roles</h2>
      <div style={styles.rolesGrid}>
        {allRoles.map((entry, i) => {
          const isWinner = winningPlayerIds.includes(entry.playerId);
          const tc = teamColorFor(entry.team);

          return (
            <motion.div
              key={entry.playerId}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              style={{
                ...styles.roleCard,
                background: isWinner ? tc.bg : color.surface.card,
                border: `1px solid ${isWinner ? tc.border : color.border.subtle}`,
              }}
            >
              {/* Role Hierarchy: role name first (most important), then player */}
              <div style={styles.roleTop}>
                <span style={{ ...styles.roleName, color: tc.fg }}>
                  {entry.role.replace(/([A-Z])/g, " $1").trim()}
                </span>
                {isWinner && <span style={styles.trophy}>🏆</span>}
              </div>
              <div style={styles.rolePlayerRow}>
                <span style={styles.rolePlayerName}>
                  {entry.playerName}
                  {entry.playerId === playerId && (
                    <span style={styles.youTag}> (you)</span>
                  )}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );

  const actions = (
    <div style={styles.actions}>
      {isHost && (
        <button style={styles.playAgainBtn} onClick={sendHostReset}>
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
  );

  // ─── Desktop: two-column (banner+team · role grid) ─────────────────────────
  if (isDesktopUp) {
    return (
      <div style={styles.pageDesktop}>
        <div style={styles.containerDesktop}>
          <div style={styles.gridDesktop}>
            <div style={styles.colLeft}>
              {winnerBanner}
              {winningTeamList}
              {actions}
            </div>
            <div style={styles.colRight}>
              {allRolesList}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Mobile: stacked ───────────────────────────────────────────────────────
  return (
    <div style={styles.container}>
      {winnerBanner}
      {allRolesList}
      {actions}
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    background: color.bg.app,
    padding: `${space[6]} ${space[4]} ${space[8]}`,
    display: "flex",
    flexDirection: "column" as const,
    gap: space[6],
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
  } as React.CSSProperties,
  gridDesktop: {
    display: "grid",
    gridTemplateColumns: "1fr 1.3fr",
    gap: space[7],
    alignItems: "start",
  } as React.CSSProperties,
  colLeft: {
    display: "flex",
    flexDirection: "column" as const,
    gap: space[6],
    position: "sticky" as const,
    top: space[6],
  } as React.CSSProperties,
  colRight: {
    display: "flex",
    flexDirection: "column" as const,
    gap: space[4],
  } as React.CSSProperties,

  // Banner
  bannerCard: {
    textAlign: "center" as const,
    padding: `${space[7]} ${space[5]}`,
    borderRadius: radius["2xl"],
    boxShadow: shadow.lg,
  } as React.CSSProperties,
  bannerIcon: {
    fontSize: "64px",
    display: "block",
    marginBottom: space[3],
    filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.5))",
  } as React.CSSProperties,
  bannerLabel: {
    fontSize: font.size["3xl"],
    fontWeight: font.weight.black,
    letterSpacing: font.letterSpacing.tight,
    lineHeight: font.lineHeight.tight,
  } as React.CSSProperties,
  bannerReason: {
    color: color.text.secondary,
    fontSize: font.size.sm,
    marginTop: space[2],
  } as React.CSSProperties,
  outcomePill: {
    display: "inline-block",
    marginTop: space[3],
    borderRadius: radius.pill,
    padding: `${space[1]} ${space[5]}`,
    fontSize: font.size.sm,
    fontWeight: font.weight.bold,
    letterSpacing: font.letterSpacing.wide,
  } as React.CSSProperties,

  // Winning team list (desktop only)
  teamListSection: {
    background: color.surface.card,
    border: `1px solid ${color.border.subtle}`,
    borderRadius: radius.xl,
    padding: space[5],
  } as React.CSSProperties,
  teamListWrap: {
    display: "flex",
    flexDirection: "column" as const,
    gap: space[2],
  } as React.CSSProperties,
  teamRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: `${space[3]} ${space[4]}`,
    borderRadius: radius.md,
    gap: space[3],
  } as React.CSSProperties,
  teamName: {
    fontSize: font.size.base,
    fontWeight: font.weight.semibold,
    color: color.text.primary,
  } as React.CSSProperties,
  teamRole: {
    fontSize: font.size.sm,
    fontWeight: font.weight.bold,
  } as React.CSSProperties,
  emptyTeam: {
    color: color.text.muted,
    fontSize: font.size.sm,
    fontStyle: "italic" as const,
    margin: 0,
  } as React.CSSProperties,

  // Role reveal grid
  sectionTitle: {
    fontSize: font.size.xs,
    fontWeight: font.weight.bold,
    color: color.text.muted,
    textTransform: "uppercase" as const,
    letterSpacing: font.letterSpacing.wider,
    marginBottom: space[3],
  } as React.CSSProperties,
  rolesGrid: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: space[2],
  } as React.CSSProperties,
  roleCard: {
    display: "flex",
    flexDirection: "column" as const,
    gap: space[1],
    borderRadius: radius.lg,
    padding: `${space[3]} ${space[4]}`,
  } as React.CSSProperties,
  roleTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: space[3],
  } as React.CSSProperties,
  roleName: {
    fontSize: font.size.base,
    fontWeight: font.weight.bold,
    letterSpacing: font.letterSpacing.tight,
  } as React.CSSProperties,
  trophy: {
    fontSize: font.size.base,
  } as React.CSSProperties,
  rolePlayerRow: {
    display: "flex",
    alignItems: "center",
    gap: space[2],
  } as React.CSSProperties,
  rolePlayerName: {
    fontSize: font.size.sm,
    fontWeight: font.weight.medium,
    color: color.text.secondary,
  } as React.CSSProperties,
  youTag: {
    color: color.text.muted,
    fontSize: font.size.xs,
    marginLeft: space[1],
    fontWeight: font.weight.regular,
  } as React.CSSProperties,

  // Actions
  actions: {
    display: "flex",
    flexDirection: "column" as const,
    gap: space[3],
  } as React.CSSProperties,
  playAgainBtn: {
    background: color.accent.base,
    border: "none",
    borderRadius: radius.md,
    padding: space[4],
    color: color.text.onAccent,
    fontSize: font.size.md,
    fontWeight: font.weight.bold,
    cursor: "pointer",
    minHeight: layout.minTapTarget,
    boxShadow: shadow.accentGlow,
    letterSpacing: "0.01em",
  } as React.CSSProperties,
  leaveBtn: {
    background: color.surface.raised,
    border: `1px solid ${color.border.default}`,
    borderRadius: radius.md,
    padding: space[4],
    color: color.text.primary,
    fontSize: font.size.md,
    fontWeight: font.weight.semibold,
    cursor: "pointer",
    minHeight: layout.minTapTarget,
  } as React.CSSProperties,
} as const;
