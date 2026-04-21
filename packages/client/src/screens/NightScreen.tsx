import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameState } from "../hooks/useGameState.js";
import { useSocket } from "../hooks/useSocket.js";
import { RoleCard } from "../components/RoleCard.js";
import { ChatPanel } from "../components/ChatPanel.js";
import { RoleName, ROLES, NightAction } from "@werewolf/shared";
import { Timer } from "../components/Timer.js";
import { color, font, space, radius, shadow, layout } from "../design/tokens.js";
import { useBreakpoint } from "../design/useBreakpoint.js";

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
  const { isDesktopUp } = useBreakpoint();
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [_witchChoice, _setWitchChoice] = useState<"heal" | "kill" | "pass" | null>(null);
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
            style={styles.waitingIcon}
          >
            🌙
          </motion.div>
          <p style={styles.waitingText}>
            {hasSubmittedNightAction ? "Action submitted. Waiting for others..." : "Waiting for your turn..."}
          </p>
        </div>
      );
    }

    // ── Witch ──────────────────────────────────────────────────────────────
    if (isWitch) {
      return (
        <div style={styles.actionBox}>
          <p style={styles.actionIntro}>
            {wwTarget
              ? `The werewolves targeted: ${aliveTargets.find((t) => t.id === wwTarget)?.name ?? "unknown"}`
              : "No werewolf kill tonight."}
          </p>
          <div style={styles.actionStack}>
            {!witchHealUsed && wwTarget && (
              <button style={styles.actionBtn} onClick={() => submitAction({ type: "witch_heal" })}>
                🧪 Heal (save WW target)
              </button>
            )}
            {!witchKillUsed && (
              <>
                <p style={styles.actionSubIntro}>Kill target:</p>
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
          <p style={styles.actionIntro}>Choose two players to link as Lovers:</p>
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
              style={{ ...styles.actionBtn, marginTop: space[3] }}
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
        <p style={styles.actionIntro}>{targetLabel}</p>
        <TargetSelector targets={filteredTargets} selected={selectedTarget} onSelect={setSelectedTarget} />
        {selectedTarget && (
          <button style={{ ...styles.actionBtn, marginTop: space[3] }} onClick={doSingleTargetAction}>
            {actionLabel}
          </button>
        )}
      </div>
    );
  }

  // ─── Composable pieces ────────────────────────────────────────────────────

  const header = (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={styles.nightHeader}
    >
      <div style={styles.headerRow}>
        <div>
          <span style={styles.moonGlyph}>🌙</span>
          <h1 style={styles.title}>Night Falls</h1>
          <p style={styles.round}>Round {session.round}</p>
        </div>
        {timerSecondsRemaining !== null && (
          <Timer seconds={timerSecondsRemaining} urgent={10} />
        )}
      </div>
    </motion.div>
  );

  const roleCardBlock = (
    <div style={styles.roleCardWrap}>
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
  );

  const actionBlock = !isAlive ? (
    <div style={styles.waitingBox}>
      <p style={styles.deadText}>You are dead. Rest in peace.</p>
    </div>
  ) : (
    renderActionUI()
  );

  const littleGirlPanel = isLittleGirl && isAlive && (
    <AnimatePresence>
      {caughtPeeking ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          style={styles.peekCaught}
        >
          👧 You were caught peeking! The werewolves are coming for you...
        </motion.div>
      ) : littleGirlPeekColor ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          style={styles.peekInfo}
        >
          <span>👧 You peeked! The werewolves are targeting someone with this color:</span>
          <div
            style={{
              ...styles.peekColorDot,
              background: littleGirlPeekColor,
              boxShadow: `0 0 12px ${littleGirlPeekColor}80`,
            }}
          />
        </motion.div>
      ) : (
        <div style={styles.peekHint}>
          👧 You are the Little Girl. You will see partial info if the werewolves select a target.
        </div>
      )}
    </AnimatePresence>
  );

  const wwPeekButton = isWerewolf && isMyTurn && canCheckPeek && !peekCaughtInfo && (
    <button style={styles.peekCheckBtn} onClick={() => sendWWCheckPeek(playerId!)}>
      🔍 Check for peekers (kills Little Girl if she's watching)
    </button>
  );

  const wwPeekResult = isWerewolf && peekCaughtInfo !== null && (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      style={peekCaughtInfo.littleGirlId ? styles.peekResultDanger : styles.peekResultSafe}
    >
      {peekCaughtInfo.littleGirlId
        ? `👁️ Caught! ${peekCaughtInfo.littleGirlName} was peeking — she's your new target.`
        : "✓ No peekers detected."}
    </motion.div>
  );

  const seerResultBlock = (
    <AnimatePresence>
      {seerResult && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={styles.moonlightResult}
        >
          👁️ Investigation result:{" "}
          <strong>{aliveTargets.find((t) => t.id === seerResult.targetId)?.name}</strong> is a{" "}
          <strong>{seerResult.role.replace(/([A-Z])/g, " $1").trim()}</strong>
        </motion.div>
      )}
    </AnimatePresence>
  );

  const sorceressResultBlock = (
    <AnimatePresence>
      {sorceressResult && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={styles.moonlightResult}
        >
          🔮{" "}
          {aliveTargets.find((t) => t.id === sorceressResult.targetId)?.name}{" "}
          {sorceressResult.isSeer ? "IS the Seer!" : "is not the Seer."}
        </motion.div>
      )}
    </AnimatePresence>
  );

  const wwChatBlock = isWerewolf && (
    <div style={styles.wwChatWrap}>
      <ChatPanel
        messages={wwChatMessages}
        onSend={(msg) => sendWWChat(playerId, msg)}
        myPlayerId={playerId}
        title="Wolf Pack Chat"
        accentColor={color.team.werewolf}
      />
    </div>
  );

  const masonAckBlock = ROLES[myRole]?.flags.isMason && isMyTurn && (
    <button
      style={styles.actionBtn}
      onClick={() => submitAction({ type: "mason_acknowledge" })}
    >
      🔨 Acknowledge (Mason confirm)
    </button>
  );

  // ─── Desktop layout: role card left, action panel right, WW chat bottom ──
  if (isDesktopUp) {
    return (
      <div style={styles.pageDesktop}>
        <div style={styles.containerDesktop}>
          {header}
          <div style={styles.gridDesktop}>
            <div style={styles.colLeft}>
              {roleCardBlock}
              {littleGirlPanel}
              {seerResultBlock}
              {sorceressResultBlock}
            </div>
            <div style={styles.colRight}>
              {actionBlock}
              {wwPeekButton}
              {wwPeekResult}
              {masonAckBlock}
            </div>
          </div>
          {wwChatBlock}
        </div>
      </div>
    );
  }

  // ─── Mobile layout: stacked ───────────────────────────────────────────────
  return (
    <div style={styles.container}>
      {header}
      {roleCardBlock}
      {actionBlock}
      {littleGirlPanel}
      {wwPeekButton}
      {wwPeekResult}
      {seerResultBlock}
      {sorceressResultBlock}
      {wwChatBlock}
      {masonAckBlock}
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
    <div style={styles.targetGrid}>
      {targets.map((t) => {
        const isSelected = selected === t.id || highlightIds.includes(t.id);
        return (
          <motion.button
            key={t.id}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => onSelect(t.id)}
            style={{
              background: isSelected ? `${t.color}30` : color.surface.input,
              border: `1px solid ${isSelected ? t.color : color.border.subtle}`,
              borderRadius: radius.md,
              padding: `${space[3]} ${space[4]}`,
              minHeight: layout.minTapTarget,
              cursor: "pointer",
              color: color.text.primary,
              fontSize: font.size.sm,
              fontWeight: isSelected ? font.weight.bold : font.weight.regular,
              display: "flex",
              alignItems: "center",
              gap: space[2],
              boxShadow: isSelected ? `0 0 12px ${t.color}40` : shadow.none,
              transition: "background 150ms ease, border-color 150ms ease",
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

// ─── Reference role name to avoid unused-import TS warnings ──────────────────
void RoleName;

const styles = {
  // Page containers
  container: {
    minHeight: "100vh",
    background: color.bg.app,
    padding: `${space[6]} ${space[5]}`,
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
    gap: space[6],
  } as React.CSSProperties,
  gridDesktop: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
    gap: space[7],
    alignItems: "start",
  } as React.CSSProperties,
  colLeft: {
    position: "sticky" as const,
    top: space[6],
    display: "flex",
    flexDirection: "column" as const,
    gap: space[4],
  } as React.CSSProperties,
  colRight: {
    display: "flex",
    flexDirection: "column" as const,
    gap: space[4],
  } as React.CSSProperties,

  // Header
  nightHeader: {
    textAlign: "center" as const,
    paddingTop: space[2],
  } as React.CSSProperties,
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    gap: space[4],
  } as React.CSSProperties,
  moonGlyph: {
    fontSize: "32px",
    filter: `drop-shadow(${shadow.moonGlow})`,
  } as React.CSSProperties,
  title: {
    fontSize: font.size["2xl"],
    fontWeight: font.weight.black,
    color: color.text.primary,
    marginTop: space[1],
    letterSpacing: font.letterSpacing.tight,
  } as React.CSSProperties,
  round: {
    color: color.text.muted,
    fontSize: font.size.sm,
    fontWeight: font.weight.medium,
    marginTop: space[1],
    letterSpacing: font.letterSpacing.wide,
    textTransform: "uppercase" as const,
  } as React.CSSProperties,

  // Role card wrapper
  roleCardWrap: {
    display: "flex",
    justifyContent: "center",
  } as React.CSSProperties,

  // Waiting / dead states
  waitingBox: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    padding: space[7],
    background: color.surface.card,
    border: `1px dashed ${color.border.subtle}`,
    borderRadius: radius.xl,
    minHeight: "120px",
  } as React.CSSProperties,
  waitingIcon: {
    fontSize: "32px",
    marginBottom: space[2],
  } as React.CSSProperties,
  waitingText: {
    color: color.text.secondary,
    fontSize: font.size.base,
  } as React.CSSProperties,
  deadText: {
    color: color.text.muted,
    fontSize: font.size.base,
    fontStyle: "italic" as const,
  } as React.CSSProperties,

  // Action panels
  actionBox: {
    background: color.surface.card,
    border: `1px solid ${color.border.subtle}`,
    borderRadius: radius.xl,
    padding: space[5],
    boxShadow: shadow.md,
  } as React.CSSProperties,
  actionIntro: {
    color: color.text.secondary,
    marginBottom: space[3],
    fontSize: font.size.sm,
  } as React.CSSProperties,
  actionSubIntro: {
    color: color.text.secondary,
    fontSize: font.size.sm,
    marginTop: space[2],
  } as React.CSSProperties,
  actionStack: {
    display: "flex",
    flexDirection: "column" as const,
    gap: space[2],
  } as React.CSSProperties,

  // Buttons
  actionBtn: {
    width: "100%",
    background: color.accent.base,
    border: "none",
    borderRadius: radius.md,
    padding: space[3],
    color: color.text.onAccent,
    fontSize: font.size.base,
    fontWeight: font.weight.bold,
    cursor: "pointer",
    minHeight: layout.minTapTarget,
    boxShadow: shadow.accentGlow,
    transition: "background 150ms ease",
  } as React.CSSProperties,
  actionBtnDanger: {
    width: "100%",
    background: color.accent.bg,
    border: `1px solid ${color.accent.border}`,
    borderRadius: radius.md,
    padding: space[3],
    color: color.accent.base,
    fontSize: font.size.base,
    fontWeight: font.weight.bold,
    cursor: "pointer",
    minHeight: layout.minTapTarget,
    transition: "background 150ms ease",
  } as React.CSSProperties,
  actionBtnGhost: {
    width: "100%",
    background: "transparent",
    border: `1px dashed ${color.border.subtle}`,
    borderRadius: radius.md,
    padding: space[3],
    color: color.text.muted,
    fontSize: font.size.sm,
    cursor: "pointer",
    minHeight: layout.minTapTarget,
  } as React.CSSProperties,

  // Target grid
  targetGrid: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: space[2],
  } as React.CSSProperties,

  // Little Girl panels
  peekCaught: {
    background: color.accent.bg,
    border: `1px solid ${color.accent.border}`,
    borderRadius: radius.lg,
    padding: `${space[3]} ${space[4]}`,
    color: color.accent.base,
    fontSize: font.size.sm,
    fontWeight: font.weight.semibold,
  } as React.CSSProperties,
  peekInfo: {
    background: color.surface.card,
    border: `1px solid ${color.border.subtle}`,
    borderRadius: radius.lg,
    padding: `${space[3]} ${space[4]}`,
    fontSize: font.size.sm,
    color: color.text.primary,
    display: "flex",
    alignItems: "center",
    gap: space[3],
  } as React.CSSProperties,
  peekColorDot: {
    width: 28,
    height: 28,
    borderRadius: "50%",
    border: `2px solid ${color.border.strong}`,
    flexShrink: 0,
  } as React.CSSProperties,
  peekHint: {
    color: color.text.muted,
    fontSize: font.size.xs,
    textAlign: "center" as const,
    padding: space[2],
  } as React.CSSProperties,

  // WW peek check
  peekCheckBtn: {
    background: color.accent.bg,
    border: `1px solid ${color.accent.border}`,
    borderRadius: radius.lg,
    padding: `${space[3]} ${space[4]}`,
    color: color.accent.base,
    fontSize: font.size.sm,
    fontWeight: font.weight.semibold,
    cursor: "pointer",
    minHeight: layout.minTapTarget,
  } as React.CSSProperties,
  peekResultDanger: {
    background: color.accent.bg,
    border: `1px solid ${color.accent.border}`,
    borderRadius: radius.lg,
    padding: `${space[3]} ${space[4]}`,
    fontSize: font.size.sm,
    color: color.accent.base,
    fontWeight: font.weight.semibold,
  } as React.CSSProperties,
  peekResultSafe: {
    background: color.team.villageBg,
    border: `1px solid ${color.team.villageBorder}`,
    borderRadius: radius.lg,
    padding: `${space[3]} ${space[4]}`,
    fontSize: font.size.sm,
    color: color.team.village,
  } as React.CSSProperties,

  // Info results — calm moonlight palette
  moonlightResult: {
    background: color.moonlight.bg,
    border: `1px solid ${color.moonlight.border}`,
    borderRadius: radius.lg,
    padding: `${space[3]} ${space[4]}`,
    fontSize: font.size.sm,
    color: color.moonlight.base,
    boxShadow: shadow.moonGlow,
  } as React.CSSProperties,

  // WW chat wrapper
  wwChatWrap: {
    height: "250px",
  } as React.CSSProperties,
} as const;
