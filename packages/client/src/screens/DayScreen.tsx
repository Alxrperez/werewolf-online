import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameState } from "../hooks/useGameState.js";
import { useSocket } from "../hooks/useSocket.js";
import { PlayerRing } from "../components/PlayerRing.js";
import { ChatPanel } from "../components/ChatPanel.js";
import { VotePanel } from "../components/VotePanel.js";
import { Timer } from "../components/Timer.js";
import { SessionState } from "@werewolf/shared";
import { color, font, space, radius, shadow, layout, z } from "../design/tokens.js";
import { useBreakpoint } from "../design/useBreakpoint.js";

export function DayScreen() {
  const {
    session,
    playerId,
    myPlayer,
    alivePlayers,
    isAlive,
    phase,
    timerSecondsRemaining,
    chatMessages,
    currentAccusation,
    voteUpdate,
    lynchResult,
    lastError,
  } = useGameState();

  const { sendChat, sendAccuse, sendSecond, sendVote } = useSocket();
  const { isDesktopUp } = useBreakpoint();
  const [accuseTarget, setAccuseTarget] = useState<string | null>(null);
  const [showDeathCard, setShowDeathCard] = useState(!!lynchResult);

  React.useEffect(() => {
    if (lynchResult) setShowDeathCard(true);
  }, [lynchResult]);

  if (!session || !playerId) return null;

  const isVotePhase = phase === SessionState.DAY_VOTE;
  const isDiscussion = phase === SessionState.DAY_DISCUSSION;
  const myVote = myPlayer?.voteTarget ?? null;
  const tally = voteUpdate?.tally ?? {};

  // ─── Composable pieces (reused by mobile + desktop layouts) ────────────────

  const header = (
    <div style={styles.header}>
      <div>
        <p style={styles.eyebrow}>Round {session.round}</p>
        <h1 style={styles.title}>
          {isVotePhase ? "⚖️ Vote" : "☀️ Day Discussion"}
        </h1>
      </div>
      {timerSecondsRemaining !== null && (
        <Timer seconds={timerSecondsRemaining} urgent={15} />
      )}
    </div>
  );

  const errorToast = (
    <AnimatePresence>
      {lastError && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          style={styles.errorToast}
        >
          {lastError.message}
        </motion.div>
      )}
    </AnimatePresence>
  );

  const ring = (
    <div style={styles.ringSection}>
      <PlayerRing
        players={session.players}
        myPlayerId={playerId}
        {...(isDiscussion && isAlive ? { onSelect: (id: string) => setAccuseTarget(id) } : {})}
        selectedId={accuseTarget}
        showVotes={isVotePhase}
        voteTarget={Object.fromEntries(
          session.players.filter((p) => p.voteTarget).map((p) => [p.id, p.voteTarget!])
        )}
        size={isDesktopUp ? "lg" : "md"}
      />
    </div>
  );

  const accusationBanner = (
    <AnimatePresence>
      {currentAccusation && isDiscussion && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          style={styles.accusationBanner}
        >
          <p style={styles.accusationTitle}>
            <span style={{ color: color.state.warning }}>{currentAccusation.accuserName}</span>
            {" accuses "}
            <span style={{ color: color.accent.base }}>{currentAccusation.targetName}</span>
          </p>
          <p style={styles.accusationHint}>
            Someone must second this accusation within 15 seconds to proceed to vote.
          </p>
          {isAlive && currentAccusation.accuserId !== playerId && (
            <button
              style={styles.secondBtn}
              onClick={() => sendSecond(playerId, currentAccusation.targetId)}
            >
              Second the Accusation ⚖️
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );

  const accuseBtn = isDiscussion && isAlive && accuseTarget && (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={styles.accuseBtn}
      onClick={() => {
        sendAccuse(playerId, accuseTarget);
        setAccuseTarget(null);
      }}
    >
      Accuse {session.players.find((p) => p.id === accuseTarget)?.name}
    </motion.button>
  );

  const votePanel = isVotePhase && isAlive && myPlayer?.hasVotingRights !== false && (
    <VotePanel
      alivePlayers={alivePlayers}
      myPlayerId={playerId}
      myVote={myVote}
      onVote={(targetId) => sendVote(playerId, targetId)}
      tally={tally}
      disabled={false}
    />
  );

  const deadVoteBanner = isVotePhase && !isAlive && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={styles.deadBanner}
    >
      <span style={{ fontSize: font.size.xl }}>💀</span>
      <span>You are dead — observe only</span>
    </motion.div>
  );

  const lynchCard = (
    <AnimatePresence>
      {showDeathCard && lynchResult && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          style={styles.lynchCard}
        >
          <h3 style={styles.lynchTitle}>
            {lynchResult.villageIdiotRevealed ? "🤪 Village Idiot Revealed!" : "⚖️ Lynch Result"}
          </h3>
          <p style={styles.lynchBody}>
            <strong style={{ color: color.accent.base }}>{lynchResult.targetName}</strong>{" "}
            {lynchResult.villageIdiotRevealed
              ? "is the Village Idiot — they survive but lose their vote!"
              : `was the ${lynchResult.role?.replace(/([A-Z])/g, " $1").trim()}.`}
          </p>
          {lynchResult.elderPunishmentActivated && (
            <p style={styles.lynchWarn}>
              ⚠️ The Elder was lynched. All Village special powers are disabled!
            </p>
          )}
          {lynchResult.jesterTriggered && (
            <p style={styles.lynchJester}>
              🃏 The Jester was lynched! Their accuser also dies...
            </p>
          )}
          <button style={styles.dismissBtn} onClick={() => setShowDeathCard(false)}>
            Continue
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );

  const chat = isAlive ? (
    <div style={styles.chatWrap}>
      <ChatPanel
        messages={chatMessages}
        onSend={(msg) => sendChat(playerId, msg)}
        disabled={!isDiscussion}
        placeholder="Speak your mind..."
        myPlayerId={playerId}
        title="Village Discussion"
        accentColor={color.moonlight.base}
      />
    </div>
  ) : (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={styles.deadObserveBox}
    >
      <p style={styles.deadObserveText}>
        👁️ You can observe the discussion but cannot participate.
      </p>
    </motion.div>
  );

  // ─── Desktop: three-column (ring · chat/accusations · votes) ───────────────
  if (isDesktopUp) {
    return (
      <div style={styles.pageDesktop}>
        <div style={styles.containerDesktop}>
          {header}
          {errorToast}
          <div style={styles.gridDesktop}>
            <div style={styles.colLeft}>{ring}</div>
            <div style={styles.colMid}>
              {accusationBanner}
              {accuseBtn}
              {lynchCard}
              {chat}
            </div>
            <div style={styles.colRight}>
              {votePanel}
              {deadVoteBanner}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Mobile: stacked ───────────────────────────────────────────────────────
  return (
    <div style={styles.container}>
      {header}
      {errorToast}
      {ring}
      {accusationBanner}
      {accuseBtn}
      {votePanel}
      {deadVoteBanner}
      {lynchCard}
      {chat}
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    background: color.bg.app,
    padding: `${space[6]} ${space[4]}`,
    display: "flex",
    flexDirection: "column" as const,
    gap: space[5],
    maxWidth: layout.maxWidthTablet,
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
    gap: space[6],
  } as React.CSSProperties,
  gridDesktop: {
    display: "grid",
    gridTemplateColumns: "1fr 1.2fr 1fr",
    gap: space[6],
    alignItems: "start",
  } as React.CSSProperties,
  colLeft: {
    position: "sticky" as const,
    top: space[6],
    display: "flex",
    flexDirection: "column" as const,
    gap: space[4],
  } as React.CSSProperties,
  colMid: {
    display: "flex",
    flexDirection: "column" as const,
    gap: space[4],
    minWidth: 0,
  } as React.CSSProperties,
  colRight: {
    display: "flex",
    flexDirection: "column" as const,
    gap: space[4],
    position: "sticky" as const,
    top: space[6],
  } as React.CSSProperties,

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
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
  title: {
    fontSize: font.size["2xl"],
    fontWeight: font.weight.black,
    color: color.text.primary,
    letterSpacing: font.letterSpacing.tight,
    lineHeight: font.lineHeight.tight,
  } as React.CSSProperties,

  errorToast: {
    background: color.accent.bg,
    border: `1px solid ${color.accent.border}`,
    borderRadius: radius.md,
    padding: `${space[2]} ${space[4]}`,
    color: color.accent.base,
    fontSize: font.size.sm,
  } as React.CSSProperties,

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

  accusationBanner: {
    background: color.state.warningBg,
    border: `1px solid ${color.state.warning}`,
    borderRadius: radius.lg,
    padding: `${space[4]} ${space[5]}`,
    display: "flex",
    flexDirection: "column" as const,
    gap: space[2],
  } as React.CSSProperties,
  accusationTitle: {
    fontSize: font.size.base,
    fontWeight: font.weight.semibold,
    color: color.text.primary,
  } as React.CSSProperties,
  accusationHint: {
    fontSize: font.size.sm,
    color: color.text.secondary,
  } as React.CSSProperties,
  secondBtn: {
    marginTop: space[2],
    background: color.state.warningBg,
    border: `1px solid ${color.state.warning}`,
    borderRadius: radius.md,
    padding: `${space[3]} ${space[4]}`,
    minHeight: layout.minTapTarget,
    color: color.state.warning,
    fontWeight: font.weight.bold,
    cursor: "pointer",
    fontSize: font.size.sm,
  } as React.CSSProperties,
  accuseBtn: {
    background: color.accent.base,
    border: "none",
    borderRadius: radius.md,
    padding: space[4],
    color: color.text.onAccent,
    fontSize: font.size.md,
    fontWeight: font.weight.bold,
    cursor: "pointer",
    width: "100%",
    minHeight: layout.minTapTarget,
    boxShadow: shadow.sm,
  } as React.CSSProperties,

  lynchCard: {
    background: color.accent.bg,
    border: `1px solid ${color.accent.border}`,
    borderRadius: radius.xl,
    padding: space[5],
    zIndex: z.dialog,
  } as React.CSSProperties,
  lynchTitle: {
    fontSize: font.size.lg,
    fontWeight: font.weight.black,
    color: color.text.primary,
    marginBottom: space[2],
  } as React.CSSProperties,
  lynchBody: {
    color: color.text.secondary,
    fontSize: font.size.sm,
    marginBottom: space[2],
    lineHeight: font.lineHeight.normal,
  } as React.CSSProperties,
  lynchWarn: {
    color: color.state.warning,
    fontSize: font.size.sm,
    marginTop: space[2],
  } as React.CSSProperties,
  lynchJester: {
    color: color.state.warning,
    fontSize: font.size.sm,
    marginTop: space[2],
  } as React.CSSProperties,
  dismissBtn: {
    marginTop: space[4],
    background: color.surface.raised,
    border: `1px solid ${color.border.default}`,
    borderRadius: radius.md,
    padding: `${space[3]} ${space[5]}`,
    minHeight: layout.minTapTarget,
    color: color.text.primary,
    cursor: "pointer",
    fontSize: font.size.sm,
    fontWeight: font.weight.semibold,
  } as React.CSSProperties,
  deadBanner: {
    display: "flex",
    alignItems: "center",
    gap: space[3],
    background: color.surface.card,
    border: `1px solid ${color.border.subtle}`,
    borderRadius: radius.lg,
    padding: `${space[4]} ${space[5]}`,
    color: color.text.muted,
    fontSize: font.size.sm,
    fontStyle: "italic" as const,
  } as React.CSSProperties,
  deadObserveBox: {
    background: color.surface.card,
    border: `1px solid ${color.border.subtle}`,
    borderRadius: radius.lg,
    padding: `${space[4]} ${space[5]}`,
    textAlign: "center" as const,
  } as React.CSSProperties,
  deadObserveText: {
    fontSize: font.size.sm,
    color: color.text.muted,
    margin: 0,
  } as React.CSSProperties,
  chatWrap: {
    height: "360px",
    background: color.surface.card,
    border: `1px solid ${color.border.subtle}`,
    borderRadius: radius.lg,
    overflow: "hidden",
  } as React.CSSProperties,
} as const;
