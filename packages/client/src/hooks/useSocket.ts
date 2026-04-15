import { useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { v4 as uuidv4 } from "uuid";
import { NightAction, SessionState } from "@werewolf/shared";
import { useGameStore } from "../stores/gameStore.js";
import { soundManager } from "../lib/sounds.js";

// In dev, connect directly to the server on port 3000 to avoid Vite's WebSocket
// proxy which throws ECONNABORTED errors and causes constant disconnect/reconnect
// cycles. In production, use the current origin (served from the same host).
const SOCKET_URL = (() => {
  if (typeof window === "undefined") return "http://localhost:3000";
  const { hostname, origin, port } = window.location;
  if (port === "5173") return `http://${hostname}:3000`;
  return origin;
})();

// Pin socket + listener-registered flag to window so Vite HMR module reloads
// neither create a second socket nor tear down the event listeners we need.
const _win = window as unknown as {
  __ww_socket?: Socket;
  __ww_listeners_registered?: boolean;
};

function getSocket(): Socket {
  if (!_win.__ww_socket) {
    _win.__ww_socket = io(SOCKET_URL, {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
  }
  return _win.__ww_socket;
}

/**
 * Register all socket event handlers ONCE, at module scope. Survives HMR,
 * React strict mode, and component unmount/remount — the handlers never get
 * torn down, so events can never be missed.
 *
 * Every handler reads/writes via `useGameStore.getState()` so there's no
 * stale-closure risk from capturing a snapshot of the store.
 */
function registerSocketListeners(socket: Socket): void {
  if (_win.__ww_listeners_registered) return;
  _win.__ww_listeners_registered = true;

  // ── Debug: log every inbound event ────────────────────────────────────────
  socket.onAny((event, ...args) => {
    const firstArg = args[0];
    let summary = "";
    if (firstArg && typeof firstArg === "object" && "session" in firstArg) {
      const s = (firstArg as { session?: { state?: string; round?: number } }).session;
      summary = s ? ` state=${s.state} round=${s.round}` : "";
    }
    // eslint-disable-next-line no-console
    console.log(`[socket ←] ${event}${summary}`);
  });

  // ── Connection ────────────────────────────────────────────────────────────
  socket.on("connect", () => {
    useGameStore.getState().setConnected(true);
    const { playerId, sessionCode } = useGameStore.getState();
    if (playerId && sessionCode) {
      socket.emit("player:reconnect", { playerId, sessionCode });
    }
  });

  socket.on("disconnect", () => {
    useGameStore.getState().setConnected(false);
  });

  // ── Role reveal ───────────────────────────────────────────────────────────
  socket.on("game:roleReveal", (payload: Parameters<ReturnType<typeof useGameStore.getState>["setRoleReveal"]>[0]) => {
    useGameStore.getState().setRoleReveal(payload);
    soundManager.play("role_reveal");
  });

  // ── Lover reveal ──────────────────────────────────────────────────────────
  socket.on("game:loverReveal", ({ loverId, loverName }: { loverId: string; loverName: string }) => {
    useGameStore.getState().setLoverReveal(loverId, loverName);
  });

  // ── Session update (LOBBY → ROLE_REVEAL → NIGHT → ...) ────────────────────
  socket.on("session:update", ({ session }: { session: Parameters<ReturnType<typeof useGameStore.getState>["setSession"]>[0] }) => {
    const prev = useGameStore.getState().session?.state;
    // eslint-disable-next-line no-console
    console.log(`[session:update] ${prev ?? "null"} → ${session.state} (round ${session.round})`);
    useGameStore.getState().setSession(session);
    if (prev !== session.state) {
      if (session.state === SessionState.NIGHT) soundManager.play("wolf_howl");
      if (session.state === SessionState.DAY_DISCUSSION) soundManager.play("dawn_chime");
      if (session.state === SessionState.DAY_VOTE) soundManager.play("vote_drum");
      if (session.state === SessionState.GAME_OVER) {
        const { playerId, gameOverData } = useGameStore.getState();
        const didWin = playerId && gameOverData?.winningPlayerIds.includes(playerId);
        soundManager.play(didWin ? "game_over_win" : "game_over_lose");
      }
    }
  });

  // ── Night ─────────────────────────────────────────────────────────────────
  socket.on("night:wake", (payload: {
    yourTurn: boolean;
    aliveTargets: Array<{ id: string; name: string; color: string }>;
    wwTarget?: string | null;
    witchHealUsed?: boolean;
    witchKillUsed?: boolean;
    isWolfCubRage?: boolean;
    rageKillsRemaining?: number;
    masonIds?: string[];
  }) => {
    useGameStore.getState().setNightWakeInfo({
      yourTurn: payload.yourTurn,
      aliveTargets: payload.aliveTargets,
      wwTarget: payload.wwTarget ?? null,
      witchHealUsed: payload.witchHealUsed ?? false,
      witchKillUsed: payload.witchKillUsed ?? false,
      isWolfCubRage: payload.isWolfCubRage ?? false,
      rageKillsRemaining: payload.rageKillsRemaining ?? 0,
      masonIds: payload.masonIds ?? [],
    });
  });

  socket.on("night:seerResult", (payload: { targetId: string; role: Parameters<ReturnType<typeof useGameStore.getState>["setSeerResult"]>[0]["role"] }) => {
    useGameStore.getState().setSeerResult(payload);
  });

  socket.on("night:sorceressResult", (payload: { targetId: string; isSeer: boolean }) => {
    useGameStore.getState().setSorceressResult(payload);
  });

  socket.on("night:wwChat", (payload: { from: string; fromName: string; message: string }) => {
    useGameStore.getState().addWWChatMessage({
      id: uuidv4(),
      playerId: payload.from,
      playerName: payload.fromName,
      message: payload.message,
      timestamp: Date.now(),
      isWWChat: true,
    });
  });

  // ── Little Girl ───────────────────────────────────────────────────────────
  socket.on("night:littleGirlPeek", ({ targetColor }: { targetColor: string }) => {
    useGameStore.getState().setLittleGirlPeek(targetColor);
  });

  socket.on("night:caughtPeeking", () => {
    useGameStore.getState().setCaughtPeeking();
  });

  socket.on("night:peekCaught", (payload: { littleGirlId: string | null; littleGirlName: string | null }) => {
    useGameStore.getState().setPeekCaughtInfo(payload);
  });

  // ── Dawn ──────────────────────────────────────────────────────────────────
  socket.on("dawn:report", ({ deaths }: { deaths: Parameters<ReturnType<typeof useGameStore.getState>["setDawnDeaths"]>[0]; round: number }) => {
    const s = useGameStore.getState();
    s.setDawnDeaths(deaths);
    s.clearNightWakeInfo();
    if (deaths.length > 0) soundManager.play("death_sting");
    else soundManager.play("dawn_chime");
  });

  // ── Day ───────────────────────────────────────────────────────────────────
  socket.on("day:timerSync", ({ secondsRemaining, phase }: { secondsRemaining: number; phase: SessionState }) => {
    useGameStore.getState().setTimer(secondsRemaining, phase);
  });

  socket.on("day:chatMessage", (payload: { playerId: string; playerName: string; message: string; timestamp: number }) => {
    useGameStore.getState().addChatMessage({ id: uuidv4(), ...payload });
  });

  socket.on("day:accusation", (payload: {
    accuserId: string;
    accuserName: string;
    targetId: string;
    targetName: string;
    secondsToSecond: number;
  }) => {
    useGameStore.getState().setAccusation({ ...payload, timestamp: Date.now() });
  });

  socket.on("day:voteUpdate", (payload: { votes: Record<string, string>; tally: Record<string, number> }) => {
    useGameStore.getState().setVoteUpdate(payload);
  });

  socket.on("day:lynchResult", (payload: NonNullable<Parameters<ReturnType<typeof useGameStore.getState>["setLynchResult"]>[0]>) => {
    useGameStore.getState().setLynchResult(payload);
  });

  socket.on("day:noLynch", () => {
    useGameStore.getState().setLynchResult(null);
  });

  // ── Hunter ────────────────────────────────────────────────────────────────
  socket.on("hunter:revengePrompt", ({ aliveTargets }: { aliveTargets: Array<{ id: string; name: string; color: string }> }) => {
    useGameStore.getState().setHunterRevengeTargets(aliveTargets);
  });

  // ── Game over ─────────────────────────────────────────────────────────────
  socket.on("game:over", (payload: NonNullable<Parameters<ReturnType<typeof useGameStore.getState>["setGameOver"]>[0]>) => {
    useGameStore.getState().setGameOver(payload);
  });

  // ── Session lost (server restart / session expired) ───────────────────────
  socket.on("game:sessionLost", ({ reason }: { reason: string }) => {
    console.warn(`[session lost] ${reason} — resetting to home`);
    useGameStore.getState().reset();
    setTimeout(() => { window.location.href = "/"; }, 100);
  });

  // ── Errors ────────────────────────────────────────────────────────────────
  socket.on("error", (payload: { code: string; message: string }) => {
    useGameStore.getState().setError(payload);
    console.error(`[socket error] ${payload.code}: ${payload.message}`);
  });
}

// Register listeners + init sound manager once at module load
const _socket = getSocket();
soundManager.init();
registerSocketListeners(_socket);
if (!_socket.connected) _socket.connect();

export function useSocket() {
  const socketRef = useRef<Socket>(_socket);

  // Join session room whenever sessionCode is set (handles the case where
  // the socket was already connected when a session is created/joined via REST)
  const sessionCode = useGameStore((s) => s.sessionCode);
  const playerId = useGameStore((s) => s.playerId);
  useEffect(() => {
    if (sessionCode && playerId) {
      const socket = socketRef.current;
      if (socket.connected) {
        socket.emit("player:reconnect", { playerId, sessionCode });
      }
    }
  }, [sessionCode, playerId]);

  // ── Emitters ─────────────────────────────────────────────────────────────

  const sendReady = useCallback((playerId: string) => {
    socketRef.current.emit("player:ready", { playerId });
  }, []);

  const sendNightAction = useCallback((playerId: string, action: NightAction) => {
    socketRef.current.emit("night:action", { playerId, action });
    useGameStore.getState().setHasSubmittedNightAction(true);
  }, []);

  const sendWWChat = useCallback((playerId: string, message: string) => {
    socketRef.current.emit("night:wwChat", { playerId, message });
  }, []);

  const sendAccuse = useCallback((playerId: string, targetId: string) => {
    socketRef.current.emit("day:accuse", { playerId, targetId });
  }, []);

  const sendSecond = useCallback((playerId: string, targetId: string) => {
    socketRef.current.emit("day:second", { playerId, targetId });
  }, []);

  const sendVote = useCallback((playerId: string, targetId: string | "skip") => {
    socketRef.current.emit("day:vote", { playerId, targetId });
  }, []);

  const sendChat = useCallback((playerId: string, message: string) => {
    socketRef.current.emit("day:chat", { playerId, message });
  }, []);

  const sendHunterRevenge = useCallback((playerId: string, targetId: string) => {
    socketRef.current.emit("hunter:revenge", { playerId, targetId });
    useGameStore.getState().setHunterRevengeTargets(null);
  }, []);

  const sendHostStart = useCallback(
    (roleConfig: Record<string, number>) => {
      socketRef.current.emit("host:start", { roleConfig });
    },
    []
  );

  const sendHostKick = useCallback((targetPlayerId: string) => {
    socketRef.current.emit("host:kick", { targetPlayerId });
  }, []);

  const sendWWCheckPeek = useCallback((playerId: string) => {
    socketRef.current.emit("night:wwCheckPeek", { playerId });
  }, []);

  const sendHostReset = useCallback(() => {
    socketRef.current.emit("host:resetGame");
  }, []);

  return {
    socket: socketRef.current,
    sendReady,
    sendNightAction,
    sendWWChat,
    sendAccuse,
    sendSecond,
    sendVote,
    sendChat,
    sendHunterRevenge,
    sendHostStart,
    sendHostKick,
    sendWWCheckPeek,
    sendHostReset,
  };
}
