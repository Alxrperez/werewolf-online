import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameState } from "../hooks/useGameState.js";
import { useSocket } from "../hooks/useSocket.js";
import { RoleCard } from "../components/RoleCard.js";
import { ChatPanel } from "../components/ChatPanel.js";
import { RoleName, ROLES, NightAction } from "@werewolf/shared";
import { Timer } from "../components/Timer.js";

export function NightScreen() {
  const {
    session,
    playerId,
    myRole,
    myRoleDescription,
    myTeam,
    myLoverId,
    myLoverName,
    masonIds,
    nightWakeInfo,
    hasSubmittedNightAction,
    seerResult,
    sorceressResult,
    wwChatMessages,
    isAlive,
    littleGirlPeekColor,
    caughtPeeking,
    peekCaughtInfo,
    timerSecondsRemaining,
  } = useGameState();

  const { sendNightAction, sendWWChat, sendWWCheckPeek } = useSocket();
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [witchChoice, setWitchChoice] = useState<"heal" | "kill" | "pass" | null>(null);
  const [cupidA, setCupidA] = useState<string | null>(null);
  const [cupidB, setCupidB] = useState<string | null>(null);

  if (!session || !playerId || !myRole || !myTeam || !myRoleDescription) return null;

  const role = ROLES[myRole];
  const isWerewolf = role?.flags.isWerewolf === true;
  const isSeer = role?.flags.isSeer === true;
  const isDoctor = role?.flags.isDoctor === true;
  const isBodyguard = role?.flags.isBodyguard === true;
  const isWitch = role?.flags.isWitch === true;
  const isCupid = role?.flags.isCupid === true;
  const isSK = role?.flags.isSerialKiller === true;
  const isSorceress = role?.flags.isSorceress === true;
  const isLittleGirl = role?.flags.isLittleGirl === true;
  const canCheckPeek = (nightWakeInfo as Record<string, unknown> | null)?.["canCheckPeek"] === true;

  const aliveTargets = nightWakeInfo?.aliveTargets ?? [];
  const wwTarget = nightWakeInfo?.wwTarget ?? null;
  const witchHealUsed = nightWakeInfo?.witchHealUsed ?? false;
  const witchKillUsed = nightWakeInfo?.witchKillUsed ?? false;
  const isMyTurn = nightWakeInfo?.yourTurn === true && !hasSubmittedNightAction;

  function submitAction(action: NightAction) {
    sendNightAction(playerId!, action);
    setSelectedTarget(null);
  }

  function renderActionUI() {
    if (!isMyTurn) {
      return (
        <div style={styles.waitingBox}>
          <motion.div
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ repeat: Infinity, duration: 2 }}
            style={{ fontSize: "32px", marginBottom: "8px" }}
          >
            🌙
          </motion.div>
          <p style={{ color: "#888", fontSize: "15px" }}>
            {hasSubmittedNightAction ? "Action submitted. Waiting for others..." : "Waiting for your turn..."}
          </p>
        </div>
      );
    }

    // ── Witch ──────────────────────────────────────────────────────────────
    if (isWitch) {
      return (
        <div style={styles.actionBox}>
          <p style={{ color: "#aaa", marginBottom: "16px", fontSize: "14px" }}>
            {wwTarget
              ? `The werewolves targeted: ${aliveTargets.find((t) => t.id === wwTarget)?.name ?? "unknown"}`
              : "No werewolf kill tonight."}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {!witchHealUsed && wwTarget && (
              <button style={styles.actionBtn} onClick={() => submitAction({ type: "witch_heal" })}>
                🧪 Heal (save WW target)
              </button>
            )}
            {!witchKillUsed && (
              <>
                <p style={{ color: "#aaa", fontSize: "13px" }}>Kill target:</p>
                <TargetSelector targets={aliveTargets} selected={selectedTarget} onSelect={setSelectedTarget} />
                {selectedTarget && (
                  <button style={styles.actionBtnDanger} onClick={() => submitAction({ type: "witch_kill", targetId: selectedTarget })}>
                    ☠️ Use Kill Potion
                  </button>
                )}
              </>
            )}
            <button style={styles.actionBtnGhost} onClick={() => submitAction({ type: "witch_pass" })}>
              Pass (use no potions)
            </button>
          </div>
        </div>
      );
    }

    // ── Cupid ──────────────────────────────────────────────────────────────
    if (isCupid) {
      return (
        <div style={styles.actionBox}>
          <p style={{ color: "#aaa", marginBottom: "12px", fontSize: "14px" }}>
            Choose two players to link as Lovers:
          </p>
          <TargetSelector
            targets={aliveTargets}
            selected={cupidA}
            onSelect={(id) => {
              if (cupidA === id) { setCupidA(null); return; }
              if (cupidB === id) { setCupidB(null); return; }
              if (!cupidA) setCupidA(id);
              else if (!cupidB) setCupidB(id);
            }}
            highlightIds={[cupidA, cupidB].filter(Boolean) as string[]}
          />
          {cupidA && cupidB && (
            <button
              style={{ ...styles.actionBtn, marginTop: "12px" }}
              onClick={() => submitAction({ type: "cupid_link", targetAId: cupidA, targetBId: cupidB })}
            >
              💘 Link as Lovers
            </button>
          )}
        </div>
      );
    }

    // ── Single-target actions ───────────────────────────────────────────────
    const targetLabel = isWerewolf
      ? "Choose your kill target:"
      : isSeer
      ? "Investigate a player:"
      : isDoctor
      ? "Protect a player:"
      : isBodyguard
      ? "Guard a player (you cannot guard yourself):"
      : isSK
      ? "Choose your victim:"
      : isSorceress
      ? "Check if this player is the Seer:"
      : "Choose a target:";

    const actionLabel = isWerewolf
      ? "🐺 Kill"
      : isSeer
      ? "👁️ Investigate"
      : isDoctor
      ? "⚕️ Protect"
      : isBodyguard
      ? "🛡️ Guard"
      : isSK
      ? "🔪 Kill"
      : isSorceress
      ? "🔮 Investigate"
      : "Confirm";

    const filteredTargets = isBodyguard
      ? aliveTargets.filter((t) => t.id !== playerId)
      : aliveTargets;

    function doSingleTargetAction() {
      if (!selectedTarget) return;
      const action: NightAction = isWerewolf
        ? { type: "ww_kill", targetId: selectedTarget }
        : isSeer
        ? { type: "seer_investigate", targetId: selectedTarget }
        : isDoctor
        ? { type: "doctor_protect", targetId: selectedTarget }
        : isBodyguard
        ? { type: "bodyguard_guard", targetId: selectedTarget }
        : isSK
        ? { type: "sk_kill", targetId: selectedTarget }
        : isSorceress
        ? { type: "sorceress_investigate", targetId: selectedTarget }
        : { type: "ww_kill", targetId: selectedTarget };
      submitAction(action);
    }

    return (
      <div style={styles.actionBox}>
        <p style={{ color: "#aaa", marginBottom: "12px", fontSize: "14px" }}>{targetLabel}</p>
        <TargetSelector targets={filteredTargets} selected={selectedTarget} onSelect={setSelectedTarget} />
        {selectedTarget && (
          <button style={{ ...styles.actionBtn, marginTop: "12px" }} onClick={doSingleTargetAction}>
            {actionLabel}
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Night ambiance header */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={styles.nightHeader}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
          <div>
            <span style={{ fontSize: "32px" }}>🌙</span>
            <h1 style={styles.title}>Night Falls</h1>
            <p style={{ color: "#888", fontSize: "14px" }}>Round {session.round}</p>
          </div>
          {timerSecondsRemaining !== null && (
            <Timer seconds={timerSecondsRemaining} urgent={10} />
          )}
        </div>
      </motion.div>

      {/* Role card */}
      {myRole && myTeam && myRoleDescription && (
        <div style={{ display: "flex", justifyContent: "center" }}>
          <RoleCard
            role={myRole}
            team={myTeam}
            description={myRoleDescription}
            loverId={myLoverId}
            loverName={myLoverName}
            masonIds={masonIds}
            myId={playerId}
          />
        </div>
      )}

      {/* Dead players cannot act */}
      {!isAlive ? (
        <div style={styles.waitingBox}>
          <p style={{ color: "#888" }}>You are dead. Rest in peace.</p>
        </div>
      ) : (
        renderActionUI()
      )}

      {/* Little Girl passive peek panel */}
      {isLittleGirl && isAlive && (
        <AnimatePresence>
          {caughtPeeking ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{
                background: "rgba(230,57,70,0.12)",
                border: "1px solid rgba(230,57,70,0.4)",
                borderRadius: "12px",
                padding: "14px 18px",
                color: "#E63946",
                fontSize: "14px",
              }}
            >
              👧 You were caught peeking! The werewolves are coming for you...
            </motion.div>
          ) : littleGirlPeekColor ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: "12px",
                padding: "14px 18px",
                fontSize: "14px",
                color: "#e8e8f0",
                display: "flex",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <span>👧 You peeked! The werewolves are targeting someone with this color:</span>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: littleGirlPeekColor,
                  border: "2px solid rgba(255,255,255,0.3)",
                  flexShrink: 0,
                  boxShadow: `0 0 12px ${littleGirlPeekColor}80`,
                }}
              />
            </motion.div>
          ) : (
            <div style={{ color: "#666", fontSize: "13px", textAlign: "center" as const, padding: "8px" }}>
              👧 You are the Little Girl. You will see partial info if the werewolves select a target.
            </div>
          )}
        </AnimatePresence>
      )}

      {/* WW: check for peekers button */}
      {isWerewolf && isMyTurn && canCheckPeek && !peekCaughtInfo && (
        <button
          style={{
            background: "rgba(230,57,70,0.1)",
            border: "1px solid rgba(230,57,70,0.3)",
            borderRadius: "12px",
            padding: "11px 16px",
            color: "#E63946",
            fontSize: "14px",
            fontWeight: 600,
            cursor: "pointer",
          }}
          onClick={() => sendWWCheckPeek(playerId!)}
        >
          🔍 Check for peekers (kills Little Girl if she's watching)
        </button>
      )}

      {/* WW: peek result */}
      {isWerewolf && peekCaughtInfo !== null && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: peekCaughtInfo.littleGirlId
              ? "rgba(230,57,70,0.1)"
              : "rgba(42,157,143,0.1)",
            border: `1px solid ${peekCaughtInfo.littleGirlId ? "rgba(230,57,70,0.3)" : "rgba(42,157,143,0.3)"}`,
            borderRadius: "12px",
            padding: "12px 16px",
            fontSize: "14px",
            color: peekCaughtInfo.littleGirlId ? "#E63946" : "#2A9D8F",
          }}
        >
          {peekCaughtInfo.littleGirlId
            ? `👁️ Caught! ${peekCaughtInfo.littleGirlName} was peeking — she's your new target.`
            : "✓ No peekers detected."}
        </motion.div>
      )}

      {/* Seer result */}
      <AnimatePresence>
        {seerResult && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              background: "rgba(42,157,143,0.1)",
              border: "1px solid rgba(42,157,143,0.3)",
              borderRadius: "12px",
              padding: "14px 18px",
              fontSize: "14px",
              color: "#2A9D8F",
            }}
          >
            👁️ Investigation result:{" "}
            <strong>{aliveTargets.find((t) => t.id === seerResult.targetId)?.name}</strong> is a{" "}
            <strong>{seerResult.role.replace(/([A-Z])/g, " $1").trim()}</strong>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sorceress result */}
      <AnimatePresence>
        {sorceressResult && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              background: "rgba(106,5,114,0.1)",
              border: "1px solid rgba(106,5,114,0.3)",
              borderRadius: "12px",
              padding: "14px 18px",
              fontSize: "14px",
              color: "#6A0572",
            }}
          >
            🔮{" "}
            {aliveTargets.find((t) => t.id === sorceressResult.targetId)?.name}{" "}
            {sorceressResult.isSeer ? "IS the Seer!" : "is not the Seer."}
          </motion.div>
        )}
      </AnimatePresence>

      {/* WW chat */}
      {isWerewolf && (
        <div style={{ height: "250px" }}>
          <ChatPanel
            messages={wwChatMessages}
            onSend={(msg) => sendWWChat(playerId, msg)}
            myPlayerId={playerId}
            title="Wolf Pack Chat"
            accentColor="#E63946"
          />
        </div>
      )}

      {/* Mason acknowledgment */}
      {ROLES[myRole]?.flags.isMason && isMyTurn && (
        <button
          style={styles.actionBtn}
          onClick={() => submitAction({ type: "mason_acknowledge" })}
        >
          🔨 Acknowledge (Mason confirm)
        </button>
      )}
    </div>
  );
}

function TargetSelector({
  targets,
  selected,
  onSelect,
  highlightIds = [],
}: {
  targets: Array<{ id: string; name: string; color: string }>;
  selected: string | null;
  onSelect: (id: string) => void;
  highlightIds?: string[];
}) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "8px" }}>
      {targets.map((t) => {
        const isSelected = selected === t.id || highlightIds.includes(t.id);
        return (
          <motion.button
            key={t.id}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => onSelect(t.id)}
            style={{
              background: isSelected ? `${t.color}30` : "rgba(255,255,255,0.05)",
              border: `1px solid ${isSelected ? t.color : "rgba(255,255,255,0.12)"}`,
              borderRadius: "10px",
              padding: "12px 16px",
              minHeight: "44px",
              cursor: "pointer",
              color: "#e8e8f0",
              fontSize: "14px",
              fontWeight: isSelected ? 700 : 400,
              display: "flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: isSelected ? `0 0 12px ${t.color}40` : "none",
            }}
          >
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: t.color, flexShrink: 0 }} />
            {t.name}
          </motion.button>
        );
      })}
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    background: "radial-gradient(ellipse at top, #0d0020 0%, #030308 70%)",
    padding: "24px 20px",
    display: "flex",
    flexDirection: "column" as const,
    gap: "20px",
    maxWidth: "600px",
    margin: "0 auto",
  },
  nightHeader: {
    textAlign: "center" as const,
    paddingTop: "10px",
  },
  title: {
    fontSize: "28px",
    fontWeight: 800,
    color: "#e8e8f0",
    marginTop: "6px",
  },
  waitingBox: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    padding: "32px",
    background: "rgba(255,255,255,0.02)",
    border: "1px dashed rgba(255,255,255,0.08)",
    borderRadius: "16px",
    minHeight: "120px",
  },
  actionBox: {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "16px",
    padding: "20px",
  },
  actionBtn: {
    width: "100%",
    background: "linear-gradient(135deg, #6A0572, #E63946)",
    border: "none",
    borderRadius: "12px",
    padding: "13px",
    color: "#fff",
    fontSize: "15px",
    fontWeight: 700,
    cursor: "pointer",
  },
  actionBtnDanger: {
    width: "100%",
    background: "rgba(230,57,70,0.2)",
    border: "1px solid rgba(230,57,70,0.4)",
    borderRadius: "12px",
    padding: "13px",
    color: "#E63946",
    fontSize: "15px",
    fontWeight: 700,
    cursor: "pointer",
  },
  actionBtnGhost: {
    width: "100%",
    background: "transparent",
    border: "1px dashed rgba(255,255,255,0.15)",
    borderRadius: "12px",
    padding: "13px",
    color: "#888",
    fontSize: "14px",
    cursor: "pointer",
  },
} as const;
