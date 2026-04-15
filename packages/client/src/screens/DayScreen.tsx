import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameState } from "../hooks/useGameState.js";
import { useSocket } from "../hooks/useSocket.js";
import { PlayerRing } from "../components/PlayerRing.js";
import { ChatPanel } from "../components/ChatPanel.js";
import { VotePanel } from "../components/VotePanel.js";
import { Timer } from "../components/Timer.js";
import { SessionState } from "@werewolf/shared";

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
    hunterRevengeTargets,
    lastError,
  } = useGameState();

  const { sendChat, sendAccuse, sendSecond, sendVote, sendHunterRevenge } = useSocket();
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

  // Hunter revenge overlay
  if (hunterRevengeTargets && isAlive) {
    return (
      <div style={styles.overlayContainer}>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          style={styles.overlayCard}
        >
          <h2 style={{ fontSize: "22px", fontWeight: 800, color: "#F4A261", marginBottom: "8px" }}>
            🏹 Hunter's Last Shot
          </h2>
          <p style={{ color: "#aaa", fontSize: "14px", marginBottom: "20px" }}>
            You've been killed. Choose one player to take with you:
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {hunterRevengeTargets.map((target) => (
              <motion.button
                key={target.id}
                whileHover={{ scale: 1.03 }}
                onClick={() => sendHunterRevenge(playerId, target.id)}
                style={{
                  background: `${target.color}20`,
                  border: `1px solid ${target.color}`,
                  borderRadius: "12px",
                  padding: "13px 16px",
                  minHeight: "44px",
                  cursor: "pointer",
                  color: "#e8e8f0",
                  fontSize: "15px",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: target.color }} />
                {target.name}
              </motion.button>
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>
            {isVotePhase ? "⚖️ Vote" : "☀️ Day Discussion"}
          </h1>
          <p style={{ color: "#888", fontSize: "14px" }}>Round {session.round}</p>
        </div>
        {timerSecondsRemaining !== null && (
          <Timer seconds={timerSecondsRemaining} urgent={15} />
        )}
      </div>

      {/* Error toast */}
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

      {/* Player ring */}
      <PlayerRing
        players={session.players}
        myPlayerId={playerId}
        {...(isDiscussion && isAlive ? { onSelect: (id: string) => setAccuseTarget(id) } : {})}
        selectedId={accuseTarget}
        showVotes={isVotePhase}
        voteTarget={Object.fromEntries(
          session.players.filter((p) => p.voteTarget).map((p) => [p.id, p.voteTarget!])
        )}
        size="md"
      />

      {/* Accusation banner */}
      <AnimatePresence>
        {currentAccusation && isDiscussion && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            style={styles.accusationBanner}
          >
            <p style={{ fontSize: "15px", fontWeight: 600, color: "#e8e8f0" }}>
              <span style={{ color: "#F4A261" }}>{currentAccusation.accuserName}</span> accuses{" "}
              <span style={{ color: "#E63946" }}>{currentAccusation.targetName}</span>
            </p>
            <p style={{ fontSize: "13px", color: "#aaa", marginTop: "4px" }}>
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

      {/* Accuse button */}
      {isDiscussion && isAlive && accuseTarget && (
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
      )}

      {/* Vote panel — hidden entirely for dead players */}
      {isVotePhase && isAlive && myPlayer?.hasVotingRights !== false && (
        <VotePanel
          alivePlayers={alivePlayers}
          myPlayerId={playerId}
          myVote={myVote}
          onVote={(targetId) => sendVote(playerId, targetId)}
          tally={tally}
          disabled={false}
        />
      )}

      {/* Dead-player observe banner (shown during vote phase when dead) */}
      {isVotePhase && !isAlive && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={styles.deadBanner}
        >
          <span style={{ fontSize: "20px" }}>💀</span>
          <span>You are dead — observe only</span>
        </motion.div>
      )}

      {/* Lynch result */}
      <AnimatePresence>
        {showDeathCard && lynchResult && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            style={styles.lynchCard}
          >
            <h3 style={{ fontSize: "18px", fontWeight: 800, color: "#e8e8f0", marginBottom: "8px" }}>
              {lynchResult.villageIdiotRevealed ? "🤪 Village Idiot Revealed!" : "⚖️ Lynch Result"}
            </h3>
            <p style={{ color: "#aaa", fontSize: "14px", marginBottom: "8px" }}>
              <strong style={{ color: "#E63946" }}>{lynchResult.targetName}</strong>{" "}
              {lynchResult.villageIdiotRevealed
                ? "is the Village Idiot — they survive but lose their vote!"
                : `was the ${lynchResult.role?.replace(/([A-Z])/g, " $1").trim()}.`}
            </p>
            {lynchResult.elderPunishmentActivated && (
              <p style={{ color: "#F4A261", fontSize: "13px" }}>
                ⚠️ The Elder was lynched. All Village special powers are disabled!
              </p>
            )}
            {lynchResult.jesterTriggered && (
              <p style={{ color: "#F72585", fontSize: "13px" }}>
                🃏 The Jester was lynched! Their accuser also dies...
              </p>
            )}
            <button style={styles.dismissBtn} onClick={() => setShowDeathCard(false)}>
              Continue
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat — hidden for dead players; they see a spectator notice instead */}
      {isAlive ? (
        <div style={{ height: "300px" }}>
          <ChatPanel
            messages={chatMessages}
            onSend={(msg) => sendChat(playerId, msg)}
            disabled={!isDiscussion}
            placeholder="Speak your mind..."
            myPlayerId={playerId}
            title="Village Discussion"
            accentColor="#4361EE"
          />
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={styles.deadObserveBox}
        >
          <p style={{ fontSize: "14px", color: "#666", margin: 0 }}>
            👁️ You can observe the discussion but cannot participate.
          </p>
        </motion.div>
      )}
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    background: "radial-gradient(ellipse at top, #1a1000 0%, #0a0a0f 60%)",
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
    alignItems: "center",
  },
  title: {
    fontSize: "26px",
    fontWeight: 800,
    color: "#e8e8f0",
  },
  errorToast: {
    background: "rgba(230,57,70,0.1)",
    border: "1px solid rgba(230,57,70,0.3)",
    borderRadius: "10px",
    padding: "10px 16px",
    color: "#E63946",
    fontSize: "14px",
  },
  accusationBanner: {
    background: "rgba(244,162,97,0.08)",
    border: "1px solid rgba(244,162,97,0.25)",
    borderRadius: "14px",
    padding: "16px 20px",
  },
  secondBtn: {
    marginTop: "12px",
    background: "rgba(244,162,97,0.15)",
    border: "1px solid rgba(244,162,97,0.4)",
    borderRadius: "10px",
    padding: "13px 16px",
    minHeight: "44px",
    color: "#F4A261",
    fontWeight: 700,
    cursor: "pointer",
    fontSize: "14px",
  },
  accuseBtn: {
    background: "rgba(230,57,70,0.15)",
    border: "1px solid rgba(230,57,70,0.35)",
    borderRadius: "12px",
    padding: "13px",
    color: "#E63946",
    fontSize: "15px",
    fontWeight: 700,
    cursor: "pointer",
    width: "100%",
  },
  lynchCard: {
    background: "rgba(230,57,70,0.07)",
    border: "1px solid rgba(230,57,70,0.2)",
    borderRadius: "16px",
    padding: "20px",
  },
  dismissBtn: {
    marginTop: "14px",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "10px",
    padding: "13px 20px",
    minHeight: "44px",
    color: "#e8e8f0",
    cursor: "pointer",
    fontSize: "14px",
  },
  deadBanner: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "12px",
    padding: "14px 18px",
    color: "#666",
    fontSize: "14px",
    fontStyle: "italic" as const,
  },
  deadObserveBox: {
    background: "rgba(255,255,255,0.02)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: "12px",
    padding: "16px 18px",
    textAlign: "center" as const,
  },
  overlayContainer: {
    position: "fixed" as const,
    inset: 0,
    background: "rgba(0,0,0,0.9)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
    padding: "20px",
  },
  overlayCard: {
    background: "rgba(10,10,20,0.98)",
    border: "1px solid rgba(244,162,97,0.3)",
    borderRadius: "24px",
    padding: "36px 28px",
    maxWidth: "400px",
    width: "100%",
  },
} as const;
