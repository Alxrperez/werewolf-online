import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { SessionState, ROLE_REVEAL_DURATION_MS } from "@werewolf/shared";
import { soundManager } from "./lib/sounds.js";
import { useSocket } from "./hooks/useSocket.js";
import { useGameStore } from "./stores/gameStore.js";
import { useGameState } from "./hooks/useGameState.js";
import { HomeScreen } from "./screens/HomeScreen.js";
import { LobbyScreen } from "./screens/LobbyScreen.js";
import { NightScreen } from "./screens/NightScreen.js";
import { DayScreen } from "./screens/DayScreen.js";
import { GameOverScreen } from "./screens/GameOverScreen.js";
import { RoleCard } from "./components/RoleCard.js";
import { DeathAnimation } from "./components/DeathAnimation.js";
import { HunterRevengeOverlay } from "./components/HunterRevengeOverlay.js";
import { Timer } from "./components/Timer.js";

export default function App() {
  const { socket } = useSocket();

  const [showDawn, setShowDawn] = useState(false);
  const [muted, setMuted] = useState(false);

  const {
    session,
    playerId,
    myRole,
    myRoleDescription,
    myTeam,
    myLoverId,
    myLoverName,
    masonIds,
    lastDawnDeaths,
    phase,
    isConnected,
    timerSecondsRemaining,
  } = useGameState();

  // Show dawn overlay whenever we enter DAWN_REPORT
  React.useEffect(() => {
    if (phase === SessionState.DAWN_REPORT) setShowDawn(true);
  }, [phase]);

  // Recovery: if still on ROLE_REVEAL after the server timer should have fired,
  // force a player:reconnect to pull the current state from the server.
  React.useEffect(() => {
    if (phase !== SessionState.ROLE_REVEAL) return;
    const t = setTimeout(() => {
      if (useGameStore.getState().session?.state !== SessionState.ROLE_REVEAL) return;
      const { playerId, sessionCode } = useGameStore.getState();
      if (playerId && sessionCode && socket.connected) {
        socket.emit("player:reconnect", { playerId, sessionCode });
      }
    }, ROLE_REVEAL_DURATION_MS + 3000); // 10s timer + 3s grace
    return () => clearTimeout(t);
  }, [phase, socket]);

  // Derive current screen directly from server state — no stale localScreen
  function currentScreen() {
    if (!playerId || !session) return "home";
    switch (phase) {
      case SessionState.LOBBY:       return "lobby";
      case SessionState.ROLE_REVEAL: return "role_reveal";
      case SessionState.NIGHT:
      case SessionState.DAWN_REPORT: return "night";
      case SessionState.DAY_DISCUSSION:
      case SessionState.DAY_VOTE:    return "day";
      case SessionState.GAME_OVER:   return "game_over";
      default:                       return "lobby";
    }
  }

  const screen = currentScreen();

  function handleDawnDismiss() {
    setShowDawn(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f" }}>
      {/* Mute toggle */}
      <button
        onClick={() => {
          const next = !muted;
          setMuted(next);
          soundManager.setMuted(next);
        }}
        style={{
          position: "fixed",
          top: "12px",
          left: "12px",
          zIndex: 2000,
          background: "rgba(0,0,0,0.5)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: "20px",
          padding: "10px 14px",
          minHeight: "44px",
          minWidth: "44px",
          fontSize: "16px",
          cursor: "pointer",
          color: "#888",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        title={muted ? "Unmute" : "Mute"}
      >
        {muted ? "🔇" : "🔊"}
      </button>

      {/* Connection indicator */}
      {session && (
        <div
          style={{
            position: "fixed",
            top: "12px",
            right: "12px",
            zIndex: 2000,
            display: "flex",
            alignItems: "center",
            gap: "6px",
            background: "rgba(0,0,0,0.6)",
            border: `1px solid ${isConnected ? "rgba(42,157,143,0.3)" : "rgba(230,57,70,0.3)"}`,
            borderRadius: "20px",
            padding: "4px 12px",
            fontSize: "12px",
            color: isConnected ? "#2A9D8F" : "#E63946",
          }}
        >
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: isConnected ? "#2A9D8F" : "#E63946" }} />
          {isConnected ? "Connected" : "Reconnecting..."}
        </div>
      )}

      {/* Dawn death overlay */}
      <DeathAnimation
        deaths={lastDawnDeaths}
        visible={showDawn}
        onDismiss={handleDawnDismiss}
      />

      {/* Hunter revenge prompt (overlay on top of any screen) */}
      <HunterRevengeOverlay />

      {/* Main screen routing — keyed by screen so AnimatePresence transitions on change */}
      <AnimatePresence mode="wait">
        {screen === "home" && (
          <PageWrapper key="home">
            <HomeScreen onJoined={() => {/* session:update drives transition */}} />
          </PageWrapper>
        )}

        {screen === "lobby" && (
          <PageWrapper key="lobby">
            <LobbyScreen onGameStart={() => {/* server drives transition */}} />
          </PageWrapper>
        )}

        {screen === "role_reveal" && myRole && myTeam && myRoleDescription && (
          <PageWrapper key="role_reveal">
            <div
              style={{
                minHeight: "100vh",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "24px",
                gap: "20px",
                background: "radial-gradient(ellipse at center, #0d0020 0%, #030308 70%)",
              }}
            >
              <motion.h2
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ fontSize: "18px", color: "#888", letterSpacing: "0.1em", textTransform: "uppercase" }}
              >
                Your Secret Role
              </motion.h2>
              <RoleCard
                role={myRole}
                team={myTeam}
                description={myRoleDescription}
                loverId={myLoverId}
                loverName={myLoverName}
                masonIds={masonIds}
                {...(playerId ? { myId: playerId } : {})}
                flipped
              />
              {timerSecondsRemaining !== null && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
                  <Timer seconds={timerSecondsRemaining} urgent={5} />
                </motion.div>
              )}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5 }}
                style={{ fontSize: "13px", color: "#666" }}
              >
                Night begins in a moment...
              </motion.p>
            </div>
          </PageWrapper>
        )}

        {screen === "night" && (
          <PageWrapper key="night">
            <NightScreen />
          </PageWrapper>
        )}

        {screen === "day" && (
          <PageWrapper key="day">
            <DayScreen />
          </PageWrapper>
        )}

        {screen === "game_over" && (
          <PageWrapper key="game_over">
            <GameOverScreen />
          </PageWrapper>
        )}
      </AnimatePresence>
    </div>
  );
}

function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.div>
  );
}
