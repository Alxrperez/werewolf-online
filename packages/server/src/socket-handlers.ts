import { Server as IOServer, Socket } from "socket.io";
import { v4 as uuidv4 } from "uuid";
import {
  Session,
  Player,
  SessionState,
  RoleName,
  Team,
  NightAction,
  ROLES,
  getNightWakeOrder,
  roleSeenBySeer,
  checkWinConditions,
  getLoverChainDeathId,
  WinReason,
  ROLE_REVEAL_DURATION_MS,
  DAWN_REPORT_DURATION_MS,
  HUNTER_REVENGE_TIMEOUT_MS,
  MIN_PLAYERS,
  DeathRecord,
} from "@werewolf/shared";
import {
  getSession,
  getSessionByCode,
  getAllSessions,
  setPlayerConnected,
  setPlayerReady,
  destroySession,
  resetSession,
} from "./session-manager.js";
import {
  assignRoles,
  transitionState,
  resolveDayVote,
  resolveHunterRevenge,
  toPublicSession,
} from "./game-engine.js";
import { resolveNight } from "./night-resolver.js";
import { startTimer, clearTimer } from "./timer-manager.js";
import { validateSocketPayload, emitSocketError } from "./middleware/validate.js";
import { isSocketChatRateLimited, cleanupChatRateLimit } from "./middleware/rate-limit.js";

// ─── Server-side HTML stripping (defence-in-depth alongside client DOMPurify) ─

/**
 * Strip all HTML/XML tags and decode the five dangerous HTML entities.
 * This runs on every chat message before it is relayed to other clients.
 */
function stripHtml(input: string): string {
  return input
    .replace(/<[^>]*>/g, "")        // remove any <tag ...> or </tag>
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#x27;/gi, "'")
    .trim();
}

// ─── Per-session async queue (prevents race conditions on concurrent events) ──

const sessionQueues = new Map<string, Promise<void>>();

function enqueue(sessionId: string, fn: () => Promise<void>): void {
  const current = sessionQueues.get(sessionId) ?? Promise.resolve();
  const next = current.then(fn).catch((err: unknown) => {
    console.error(`[session ${sessionId}] queue error:`, err);
  });
  sessionQueues.set(sessionId, next);
}

// ─── Socket ID → Player ID mapping ───────────────────────────────────────────

const socketToPlayer = new Map<string, { playerId: string; sessionId: string }>();

// ─── Broadcast helpers ────────────────────────────────────────────────────────

function broadcastSession(io: IOServer, sessionId: string): void {
  const session = getSession(sessionId);
  if (!session) return;
  const payload = { session: toPublicSession(session) };
  // Send to every mapped socket for this session AND the room, so no socket
  // can miss the update regardless of whether socket.join() has completed.
  const sent: string[] = [];
  for (const [socketId, info] of socketToPlayer) {
    if (info.sessionId === sessionId) {
      io.to(socketId).emit("session:update", payload);
      sent.push(socketId);
    }
  }
  io.to(sessionId).emit("session:update", payload);
  console.log(
    `[broadcast] session ${sessionId.slice(0, 8)} state=${session.state} round=${session.round} ` +
    `→ ${sent.length} direct + room (${session.players.length} players)`
  );
}

function findSocketByPlayerId(playerId: string): string | undefined {
  for (const [socketId, info] of socketToPlayer) {
    if (info.playerId === playerId) return socketId;
  }
  return undefined;
}

// ─── Main handler registration ────────────────────────────────────────────────

export function registerSocketHandlers(io: IOServer): void {
  io.on("connection", (socket: Socket) => {
    console.log(`[socket] connected: ${socket.id}`);

    // ─── player:reconnect ──────────────────────────────────────────────────
    socket.on("player:reconnect", async (payload: unknown) => {
      const v = validateSocketPayload("player:reconnect", payload);
      if (!v.success) { emitSocketError(socket, "VALIDATION", v.error.message); return; }
      const { playerId, sessionCode } = v.data;
      const session = getSessionByCode(sessionCode);
      if (!session) {
        // Session was lost (e.g. server restart) — tell the client to go home
        socket.emit("game:sessionLost", { reason: "Session no longer exists" });
        return;
      }
      const player = session.players.find((p) => p.id === playerId);
      if (!player) {
        socket.emit("game:sessionLost", { reason: "Player not found in session" });
        return;
      }

      await socket.join(session.id);
      // Evict any stale socket entries for this playerId — only the newest
      // socket should receive broadcasts (prevents lost messages when sockets
      // churn during reconnect cycles).
      for (const [sid, info] of socketToPlayer) {
        if (info.playerId === playerId && sid !== socket.id) socketToPlayer.delete(sid);
      }
      socketToPlayer.set(socket.id, { playerId, sessionId: session.id });
      setPlayerConnected(session.id, playerId, true);

      socket.emit("session:update", { session: toPublicSession(session) });
      const roleDef = ROLES[player.role];
      if (roleDef) {
        const masonIds = session.players.filter((p) => ROLES[p.role]?.flags.isMason).map((p) => p.id);
        socket.emit("game:roleReveal", {
          role: player.role,
          description: roleDef.description,
          team: roleDef.team,
          loverId: player.loverId,
          loverName: session.players.find((p) => p.id === player.loverId)?.name ?? null,
          masonIds: ROLES[player.role]?.flags.isMason ? masonIds : [],
        });
      }
      broadcastSession(io, session.id);
    });

    // ─── player:ready ──────────────────────────────────────────────────────
    socket.on("player:ready", (payload: unknown) => {
      const v = validateSocketPayload("player:ready", payload);
      if (!v.success) { emitSocketError(socket, "VALIDATION", v.error.message); return; }
      const info = socketToPlayer.get(socket.id);
      if (!info || info.playerId !== v.data.playerId) { emitSocketError(socket, "AUTH", "Not authenticated"); return; }
      setPlayerReady(info.sessionId, info.playerId, true);
      broadcastSession(io, info.sessionId);
    });

    // ─── host:kick ──────────────────────────────────────────────────────────
    socket.on("host:kick", (payload: unknown) => {
      const v = validateSocketPayload("host:kick", payload);
      if (!v.success) { emitSocketError(socket, "VALIDATION", v.error.message); return; }
      const info = socketToPlayer.get(socket.id);
      if (!info) { emitSocketError(socket, "AUTH", "Not authenticated"); return; }
      const session = getSession(info.sessionId);
      if (!session) { emitSocketError(socket, "NOT_FOUND", "Session not found"); return; }
      if (session.hostPlayerId !== info.playerId) { emitSocketError(socket, "FORBIDDEN", "Not the host"); return; }
      if (session.state !== SessionState.LOBBY) { emitSocketError(socket, "INVALID_STATE", "Can only kick in lobby"); return; }

      const kickedSocketId = findSocketByPlayerId(v.data.targetPlayerId);
      session.players = session.players.filter((p) => p.id !== v.data.targetPlayerId);
      if (kickedSocketId) {
        io.to(kickedSocketId).emit("error", { code: "KICKED", message: "You were kicked from the session." });
      }
      broadcastSession(io, info.sessionId);
    });

    // ─── host:start ────────────────────────────────────────────────────────
    socket.on("host:start", (payload: unknown) => {
      const info = socketToPlayer.get(socket.id);
      if (!info) { emitSocketError(socket, "AUTH", "Not authenticated"); return; }
      enqueue(info.sessionId, async () => {
        const v = validateSocketPayload("host:start", payload);
        if (!v.success) { emitSocketError(socket, "VALIDATION", v.error.message); return; }
        const session = getSession(info.sessionId);
        if (!session) { emitSocketError(socket, "NOT_FOUND", "Session not found"); return; }
        if (session.hostPlayerId !== info.playerId) { emitSocketError(socket, "FORBIDDEN", "Not the host"); return; }
        if (session.state !== SessionState.LOBBY) { emitSocketError(socket, "INVALID_STATE", "Already started"); return; }
        if (session.players.length < MIN_PLAYERS) {
          emitSocketError(socket, "NOT_ENOUGH_PLAYERS", `Need at least ${MIN_PLAYERS} players`);
          return;
        }

        assignRoles(session, { ...session.config, roleDistribution: v.data.roleConfig });
        transitionState(session, SessionState.ROLE_REVEAL);
        broadcastSession(io, session.id);

        // Send private role reveals
        for (const player of session.players) {
          const socketId = findSocketByPlayerId(player.id);
          if (!socketId) continue;
          const roleDef = ROLES[player.role];
          if (!roleDef) continue;
          const masonIds = session.players.filter((p) => ROLES[p.role]?.flags.isMason).map((p) => p.id);
          io.to(socketId).emit("game:roleReveal", {
            role: player.role,
            description: roleDef.description,
            team: roleDef.team,
            loverId: player.loverId,
            loverName: null,
            masonIds: ROLES[player.role]?.flags.isMason ? masonIds : [],
          });
        }

        console.log(`[host:start] session ${session.id.slice(0, 8)} → ROLE_REVEAL, timer ${ROLE_REVEAL_DURATION_MS}ms`);
        startTimer(
          session.id,
          ROLE_REVEAL_DURATION_MS,
          () => {
            console.log(`[timer FIRED] session ${session.id.slice(0, 8)} ROLE_REVEAL → NIGHT`);
            enqueue(session.id, async () => {
              const s = getSession(session.id);
              if (!s) { console.log(`[timer FIRED] session gone, aborting`); return; }
              transitionState(s, SessionState.NIGHT);
              s.round = 1;
              broadcastSession(io, session.id);
              startNightPhase(io, session.id);
            });
          },
          (secondsRemaining) => {
            io.to(session.id).emit("day:timerSync", {
              secondsRemaining,
              phase: SessionState.ROLE_REVEAL,
            });
          }
        );
      });
    });

    // ─── night:action ──────────────────────────────────────────────────────
    socket.on("night:action", (payload: unknown) => {
      const info = socketToPlayer.get(socket.id);
      if (!info) { emitSocketError(socket, "AUTH", "Not authenticated"); return; }
      enqueue(info.sessionId, async () => {
        const v = validateSocketPayload("night:action", payload);
        if (!v.success) { emitSocketError(socket, "VALIDATION", v.error.message); return; }
        const session = getSession(info.sessionId);
        if (!session) { emitSocketError(socket, "NOT_FOUND", "Session not found"); return; }
        if (session.state !== SessionState.NIGHT) { emitSocketError(socket, "INVALID_STATE", "Not night phase"); return; }
        const player = session.players.find((p) => p.id === info.playerId);
        if (!player || !player.isAlive) { emitSocketError(socket, "DEAD", "You are dead"); return; }

        processNightAction(io, session, player, v.data.action);
        checkAllNightActionsSubmitted(io, session);
      });
    });

    // ─── night:wwChat ──────────────────────────────────────────────────────
    socket.on("night:wwChat", (payload: unknown) => {
      const v = validateSocketPayload("night:wwChat", payload);
      if (!v.success) { emitSocketError(socket, "VALIDATION", v.error.message); return; }
      const info = socketToPlayer.get(socket.id);
      if (!info) { emitSocketError(socket, "AUTH", "Not authenticated"); return; }
      const session = getSession(info.sessionId);
      if (!session || session.state !== SessionState.NIGHT) return;
      const player = session.players.find((p) => p.id === info.playerId);
      if (!player?.isAlive || !ROLES[player.role]?.flags.isWerewolf) {
        emitSocketError(socket, "FORBIDDEN", "Not a werewolf");
        return;
      }

      const wolves = session.players.filter((p) => p.isAlive && ROLES[p.role]?.flags.isWerewolf);
      for (const wolf of wolves) {
        const wolfSocketId = findSocketByPlayerId(wolf.id);
        if (wolfSocketId) {
          io.to(wolfSocketId).emit("night:wwChat", {
            from: player.id,
            fromName: player.name,
            message: stripHtml(v.data.message),
          });
        }
      }
    });

    // ─── night:wwCheckPeek (Little Girl mechanic) ─────────────────────────
    socket.on("night:wwCheckPeek", (payload: unknown) => {
      const info = socketToPlayer.get(socket.id);
      if (!info) { emitSocketError(socket, "AUTH", "Not authenticated"); return; }
      enqueue(info.sessionId, async () => {
        const v = validateSocketPayload("night:wwCheckPeek", payload);
        if (!v.success) { emitSocketError(socket, "VALIDATION", v.error.message); return; }
        const session = getSession(info.sessionId);
        if (!session || session.state !== SessionState.NIGHT) return;
        const ww = session.players.find((p) => p.id === info.playerId);
        if (!ww?.isAlive || !ROLES[ww.role]?.flags.isWerewolf) return;

        // Find Little Girl if alive
        const littleGirl = session.players.find(
          (p) => p.isAlive && ROLES[p.role]?.flags.isLittleGirl === true
        );

        if (littleGirl) {
          // Little Girl is caught — she dies; WW kill is redirected to her
          session.wwKillTarget = littleGirl.id;

          // Notify all WW that peek was caught
          const wolves = session.players.filter((p) => p.isAlive && ROLES[p.role]?.flags.isWerewolf);
          for (const wolf of wolves) {
            const wolfSocketId = findSocketByPlayerId(wolf.id);
            if (wolfSocketId) {
              io.to(wolfSocketId).emit("night:peekCaught", {
                littleGirlId: littleGirl.id,
                littleGirlName: littleGirl.name,
              });
            }
          }
          // Notify Little Girl she was caught
          const lgSocketId = findSocketByPlayerId(littleGirl.id);
          if (lgSocketId) {
            io.to(lgSocketId).emit("night:caughtPeeking", {});
          }
        } else {
          // No Little Girl alive — nothing happens, notify WW
          const wolvesAll = session.players.filter((p) => p.isAlive && ROLES[p.role]?.flags.isWerewolf);
          for (const wolf of wolvesAll) {
            const wolfSocketId = findSocketByPlayerId(wolf.id);
            if (wolfSocketId) {
              io.to(wolfSocketId).emit("night:peekCaught", { littleGirlId: null, littleGirlName: null });
            }
          }
        }
      });
    });

    // ─── day:accuse ────────────────────────────────────────────────────────
    socket.on("day:accuse", (payload: unknown) => {
      const v = validateSocketPayload("day:accuse", payload);
      if (!v.success) { emitSocketError(socket, "VALIDATION", v.error.message); return; }
      const info = socketToPlayer.get(socket.id);
      if (!info) { emitSocketError(socket, "AUTH", "Not authenticated"); return; }
      const session = getSession(info.sessionId);
      if (!session || session.state !== SessionState.DAY_DISCUSSION) return;
      const player = session.players.find((p) => p.id === info.playerId);
      if (!player?.isAlive) return;
      const target = session.players.find((p) => p.id === v.data.targetId && p.isAlive);
      if (!target) { emitSocketError(socket, "NOT_FOUND", "Target not found"); return; }

      session.eventLog.push({
        id: uuidv4(),
        type: "player_accused",
        round: session.round,
        timestamp: Date.now(),
        data: { accuserId: player.id, targetId: target.id },
      });

      io.to(session.id).emit("day:accusation", {
        accuserId: player.id,
        accuserName: player.name,
        targetId: target.id,
        targetName: target.name,
        secondsToSecond: 15,
      });
    });

    // ─── day:second ────────────────────────────────────────────────────────
    socket.on("day:second", (payload: unknown) => {
      const info = socketToPlayer.get(socket.id);
      if (!info) { emitSocketError(socket, "AUTH", "Not authenticated"); return; }
      enqueue(info.sessionId, async () => {
        const v = validateSocketPayload("day:second", payload);
        if (!v.success) { emitSocketError(socket, "VALIDATION", v.error.message); return; }
        const session = getSession(info.sessionId);
        if (!session || session.state !== SessionState.DAY_DISCUSSION) return;
        const player = session.players.find((p) => p.id === info.playerId);
        if (!player?.isAlive) return;

        io.to(session.id).emit("day:second", {
          seconderId: player.id,
          seconderName: player.name,
          targetId: v.data.targetId,
        });

        clearTimer(session.id);
        transitionState(session, SessionState.DAY_VOTE);
        broadcastSession(io, session.id);
        startVotePhase(io, session.id);
      });
    });

    // ─── day:vote ──────────────────────────────────────────────────────────
    socket.on("day:vote", (payload: unknown) => {
      const info = socketToPlayer.get(socket.id);
      if (!info) { emitSocketError(socket, "AUTH", "Not authenticated"); return; }
      enqueue(info.sessionId, async () => {
        const v = validateSocketPayload("day:vote", payload);
        if (!v.success) { emitSocketError(socket, "VALIDATION", v.error.message); return; }
        const session = getSession(info.sessionId);
        if (!session || session.state !== SessionState.DAY_VOTE) return;
        const player = session.players.find((p) => p.id === info.playerId);
        if (!player?.isAlive || player.hasVotingRights === false) return;

        player.voteTarget = v.data.targetId === "skip" ? null : v.data.targetId;

        const tally: Record<string, number> = {};
        for (const p of session.players.filter((p) => p.isAlive && p.voteTarget)) {
          const t = p.voteTarget!;
          tally[t] = (tally[t] ?? 0) + 1;
        }
        io.to(session.id).emit("day:voteUpdate", {
          votes: Object.fromEntries(
            session.players.filter((p) => p.isAlive).map((p) => [p.id, p.voteTarget ?? "skip"])
          ),
          tally,
        });

        const eligible = session.players.filter((p) => p.isAlive && p.hasVotingRights !== false);
        const allVoted = eligible.every((p) => p.voteTarget !== null);
        if (allVoted) {
          clearTimer(session.id);
          finalizeDayVote(io, session.id);
        }
      });
    });

    // ─── day:chat ──────────────────────────────────────────────────────────
    socket.on("day:chat", (payload: unknown) => {
      const v = validateSocketPayload("day:chat", payload);
      if (!v.success) { emitSocketError(socket, "VALIDATION", v.error.message); return; }
      const info = socketToPlayer.get(socket.id);
      if (!info) { emitSocketError(socket, "AUTH", "Not authenticated"); return; }
      const session = getSession(info.sessionId);
      if (!session || session.state !== SessionState.DAY_DISCUSSION) return;
      const player = session.players.find((p) => p.id === info.playerId);
      if (!player?.isAlive) { emitSocketError(socket, "FORBIDDEN", "Dead players cannot chat"); return; }
      if (isSocketChatRateLimited(socket)) { emitSocketError(socket, "RATE_LIMITED", "Slow down"); return; }

      io.to(session.id).emit("day:chatMessage", {
        playerId: player.id,
        playerName: player.name,
        message: stripHtml(v.data.message),
        timestamp: Date.now(),
      });
    });

    // ─── hunter:revenge ────────────────────────────────────────────────────
    socket.on("hunter:revenge", (payload: unknown) => {
      const info = socketToPlayer.get(socket.id);
      if (!info) { emitSocketError(socket, "AUTH", "Not authenticated"); return; }
      enqueue(info.sessionId, async () => {
        const v = validateSocketPayload("hunter:revenge", payload);
        if (!v.success) { emitSocketError(socket, "VALIDATION", v.error.message); return; }
        const session = getSession(info.sessionId);
        if (!session) return;
        const hunter = session.players.find((p) => p.id === info.playerId);
        if (!hunter || !ROLES[hunter.role]?.flags.isHunter) {
          emitSocketError(socket, "FORBIDDEN", "Not the Hunter");
          return;
        }

        const deaths = resolveHunterRevenge(session, hunter.id, v.data.targetId);
        io.to(session.id).emit("dawn:report", { deaths, round: session.round });
        broadcastSession(io, session.id);

        const winCheck = checkWinConditions(session.players);
        if (winCheck.hasWinner) {
          finalizeGame(io, session.id, winCheck);
        } else {
          // Continue to next phase
          const wasNight = session.state === SessionState.DAWN_REPORT;
          if (wasNight) {
            startDayDiscussion(io, session.id);
          } else {
            startNextNight(io, session.id);
          }
        }
      });
    });

    // ─── spectator:join ────────────────────────────────────────────────────
    socket.on("spectator:join", (payload: unknown) => {
      const v = validateSocketPayload("spectator:join", payload);
      if (!v.success) { emitSocketError(socket, "VALIDATION", v.error.message); return; }
      const session = getSessionByCode(v.data.sessionCode);
      if (!session) { emitSocketError(socket, "NOT_FOUND", "Session not found"); return; }
      if (!session.config.allowSpectators) { emitSocketError(socket, "FORBIDDEN", "Spectators not allowed"); return; }
      void socket.join(session.id);
      session.spectatorIds.push(socket.id);
      socket.emit("session:update", { session: toPublicSession(session) });
    });

    // ─── host:resetGame ────────────────────────────────────────────────────
    socket.on("host:resetGame", () => {
      const info = socketToPlayer.get(socket.id);
      if (!info) { emitSocketError(socket, "AUTH", "Not authenticated"); return; }
      const session = getSession(info.sessionId);
      if (!session) { emitSocketError(socket, "NOT_FOUND", "Session not found"); return; }
      if (session.hostPlayerId !== info.playerId) { emitSocketError(socket, "FORBIDDEN", "Not the host"); return; }

      clearTimer(info.sessionId);
      const result = resetSession(info.sessionId);
      if ("error" in result) { emitSocketError(socket, "INVALID_STATE", result.error); return; }

      broadcastSession(io, info.sessionId);
      console.log(`[host:resetGame] session ${info.sessionId} reset to LOBBY`);
    });

    // ─── disconnect ────────────────────────────────────────────────────────
    socket.on("disconnect", () => {
      const info = socketToPlayer.get(socket.id);
      if (info) {
        setPlayerConnected(info.sessionId, info.playerId, false);
        broadcastSession(io, info.sessionId);
        socketToPlayer.delete(socket.id);
        // Schedule AFK if not reconnected within grace period
        setTimeout(() => {
          const session = getSession(info.sessionId);
          if (!session) return;
          const player = session.players.find((p) => p.id === info.playerId);
          if (player && !player.isConnected && session.state === SessionState.LOBBY) {
            session.players = session.players.filter((p) => p.id !== info.playerId);
            broadcastSession(io, info.sessionId);
          }
        }, 120_000);
      }
      for (const session of getAllSessions()) {
        const idx = session.spectatorIds.indexOf(socket.id);
        if (idx !== -1) session.spectatorIds.splice(idx, 1);
      }
      cleanupChatRateLimit(socket.id);
      console.log(`[socket] disconnected: ${socket.id}`);
    });
  });
}

// ─── Exported: attach player socket after REST join ──────────────────────────

export function attachPlayerSocket(
  socket: Socket,
  playerId: string,
  sessionId: string
): void {
  void socket.join(sessionId);
  // Evict stale socket entries for this playerId so broadcasts always reach
  // the newest socket (see player:reconnect for the same defense).
  for (const [sid, info] of socketToPlayer) {
    if (info.playerId === playerId && sid !== socket.id) socketToPlayer.delete(sid);
  }
  socketToPlayer.set(socket.id, { playerId, sessionId });
  setPlayerConnected(sessionId, playerId, true);
}

// ─── Night phase ──────────────────────────────────────────────────────────────

function startNightPhase(io: IOServer, sessionId: string): void {
  const session = getSession(sessionId);
  if (!session) return;

  // All alive players — used by most roles
  const aliveTargets = session.players
    .filter((p) => p.isAlive)
    .map((p) => ({ id: p.id, name: p.name, color: p.color }));

  // Wolves cannot kill their own pack — exclude wolf-team members from WW targets
  const aliveNonWolfTargets = session.players
    .filter((p) => p.isAlive && !ROLES[p.role]?.flags.isWerewolf)
    .map((p) => ({ id: p.id, name: p.name, color: p.color }));

  const wakeRoles = getNightWakeOrder();
  for (const roleDef of wakeRoles) {
    const rolePlayers = session.players.filter((p) => p.isAlive && p.role === roleDef.name);
    for (const player of rolePlayers) {
      const socketId = findSocketByPlayerId(player.id);
      if (!socketId) continue;

      // Werewolves only see non-wolf targets; all other roles see everyone
      const targetsForRole = ROLES[player.role]?.flags.isWerewolf
        ? aliveNonWolfTargets
        : aliveTargets;
      const payload: Record<string, unknown> = { yourTurn: true, aliveTargets: targetsForRole };

      if (ROLES[player.role]?.flags.isWitch) {
        payload["wwTarget"] = session.wwKillTarget;
        payload["witchHealUsed"] = session.witchHealUsed;
        payload["witchKillUsed"] = session.witchKillUsed;
      }
      if (ROLES[player.role]?.flags.isWerewolf && session.wwRageKillsRemaining > 0) {
        payload["isWolfCubRage"] = true;
        payload["rageKillsRemaining"] = session.wwRageKillsRemaining;
      }
      if (ROLES[player.role]?.flags.isWerewolf) {
        // Tell WW if a Little Girl is in the game (so they can choose to check for peekers)
        const hasLittleGirl = session.players.some(
          (p) => p.isAlive && ROLES[p.role]?.flags.isLittleGirl === true
        );
        payload["canCheckPeek"] = hasLittleGirl;
      }
      if (ROLES[player.role]?.flags.isMason) {
        payload["masonIds"] = session.players
          .filter((p) => ROLES[p.role]?.flags.isMason)
          .map((p) => p.id);
      }

      io.to(socketId).emit("night:wake", payload);
    }
  }

  startTimer(
    sessionId,
    session.config.nightTimeMs,
    () => {
      enqueue(sessionId, async () => {
        resolveNightAndTransition(io, sessionId);
      });
    },
    (secondsRemaining) => {
      io.to(sessionId).emit("day:timerSync", { secondsRemaining, phase: SessionState.NIGHT });
    }
  );
}

function processNightAction(
  io: IOServer,
  session: Session,
  player: Player,
  action: NightAction
): void {
  player.nightAction = action;

  switch (action.type) {
    case "ww_kill":
      if (ROLES[player.role]?.flags.isWerewolf) {
        session.wwKillTarget = action.targetId;
        // Notify Little Girl with partial info (target color only — not name/id)
        const littleGirl = session.players.find(
          (p) => p.isAlive && ROLES[p.role]?.flags.isLittleGirl === true
        );
        if (littleGirl) {
          const lgSocket = findSocketByPlayerId(littleGirl.id);
          const wwTarget = session.players.find((p) => p.id === action.targetId);
          if (lgSocket && wwTarget) {
            io.to(lgSocket).emit("night:littleGirlPeek", { targetColor: wwTarget.color });
          }
        }
      }
      break;

    case "alpha_convert":
      if (ROLES[player.role]?.flags.isAlphaWerewolf && !session.alphaConversionUsed) {
        // Store as a special flag — resolved in night-resolver
        session.wwKillTarget = action.targetId;
      }
      break;

    case "doctor_protect":
      if (ROLES[player.role]?.flags.isDoctor) {
        if (action.targetId === session.doctorLastTarget) return;
        session.doctorProtectTarget = action.targetId;
        session.doctorLastTarget = action.targetId;
      }
      break;

    case "bodyguard_guard":
      if (ROLES[player.role]?.flags.isBodyguard) {
        if (action.targetId === session.bodyguardLastTarget || action.targetId === player.id) return;
        session.bodyguardGuardTarget = action.targetId;
        session.bodyguardLastTarget = action.targetId;
      }
      break;

    case "witch_heal":
      if (ROLES[player.role]?.flags.isWitch && !session.witchHealUsed) {
        session.witchHealedThisNight = true;
        session.witchHealUsed = true;
      }
      break;

    case "witch_kill":
      if (ROLES[player.role]?.flags.isWitch && !session.witchKillUsed) {
        session.witchKillTarget = action.targetId;
        session.witchKillUsed = true;
      }
      break;

    case "witch_pass":
      // No-op
      break;

    case "sk_kill":
      if (ROLES[player.role]?.flags.isSerialKiller) {
        session.skKillTarget = action.targetId;
      }
      break;

    case "cupid_link":
      if (ROLES[player.role]?.flags.isCupid && !session.cupidActionDone && session.round === 1) {
        const playerA = session.players.find((p) => p.id === action.targetAId);
        const playerB = session.players.find((p) => p.id === action.targetBId);
        if (playerA && playerB && playerA.id !== playerB.id) {
          playerA.loverId = playerB.id;
          playerB.loverId = playerA.id;
          if (playerA.team !== playerB.team) {
            playerA.isLoverWin = true;
            playerB.isLoverWin = true;
          }
          session.cupidActionDone = true;
          const sockA = findSocketByPlayerId(playerA.id);
          const sockB = findSocketByPlayerId(playerB.id);
          if (sockA) io.to(sockA).emit("game:loverReveal", { loverId: playerB.id, loverName: playerB.name });
          if (sockB) io.to(sockB).emit("game:loverReveal", { loverId: playerA.id, loverName: playerA.name });
          session.eventLog.push({
            id: uuidv4(),
            type: "lovers_linked",
            round: session.round,
            timestamp: Date.now(),
            data: { playerAId: playerA.id, playerBId: playerB.id },
          });
        }
      }
      break;

    case "seer_investigate": {
      if (ROLES[player.role]?.flags.isSeer) {
        const target = session.players.find((p) => p.id === action.targetId);
        if (target) {
          const seenRole = roleSeenBySeer(target.role);
          const socketId = findSocketByPlayerId(player.id);
          if (socketId) io.to(socketId).emit("night:seerResult", { targetId: target.id, role: seenRole });
        }
      }
      break;
    }

    case "sorceress_investigate": {
      if (ROLES[player.role]?.flags.isSorceress) {
        const target = session.players.find((p) => p.id === action.targetId);
        if (target) {
          const isSeer = ROLES[target.role]?.flags.isSeer === true;
          const socketId = findSocketByPlayerId(player.id);
          if (socketId) io.to(socketId).emit("night:sorceressResult", { targetId: target.id, isSeer });
        }
      }
      break;
    }

    case "mason_acknowledge":
      // No-op — masons already see each other from the wake payload
      break;

    case "hunter_revenge":
      // Handled by dedicated event
      break;
  }
}

function checkAllNightActionsSubmitted(io: IOServer, session: Session): void {
  const wakeRoleNames = getNightWakeOrder().map((r) => r.name);
  const pendingPlayers = session.players.filter(
    (p) => p.isAlive && wakeRoleNames.includes(p.role) && p.nightAction === null
  );
  if (pendingPlayers.length === 0) {
    clearTimer(session.id);
    resolveNightAndTransition(io, session.id);
  }
}

function resolveNightAndTransition(io: IOServer, sessionId: string): void {
  const session = getSession(sessionId);
  if (!session || session.state !== SessionState.NIGHT) return;

  const result = resolveNight(session);
  transitionState(session, SessionState.DAWN_REPORT);
  broadcastSession(io, sessionId);

  io.to(sessionId).emit("dawn:report", { deaths: result.deaths, round: session.round });

  logWinCheck(session, `night→dawn round ${session.round}`, result.winCheck, result.deaths.length);

  if (result.winCheck.hasWinner) {
    console.log(`[win-pending] session ${sessionId.slice(0, 8)} winner=${result.winCheck.winner} — scheduling finalizeGame in ${DAWN_REPORT_DURATION_MS}ms`);
    startTimer(sessionId, DAWN_REPORT_DURATION_MS, () => {
      console.log(`[win-timer FIRED] session ${sessionId.slice(0, 8)} → finalizeGame`);
      finalizeGame(io, sessionId, result.winCheck);
    });
    return;
  }

  // Hunter died at night?
  const hunterDeath = result.deaths.find((d) => {
    const p = session.players.find((p) => p.id === d.playerId);
    return p && ROLES[p.role]?.flags.isHunter;
  });

  if (hunterDeath) {
    const socketId = findSocketByPlayerId(hunterDeath.playerId);
    if (socketId) {
      const aliveTargets = session.players.filter((p) => p.isAlive).map((p) => ({ id: p.id, name: p.name, color: p.color }));
      io.to(socketId).emit("hunter:revengePrompt", { aliveTargets });
      startTimer(sessionId + "_hunter", HUNTER_REVENGE_TIMEOUT_MS, () => {
        startDayDiscussion(io, sessionId);
      });
      return;
    }
  }

  startTimer(sessionId, DAWN_REPORT_DURATION_MS, () => {
    startDayDiscussion(io, sessionId);
  });
}

function startDayDiscussion(io: IOServer, sessionId: string): void {
  const session = getSession(sessionId);
  if (!session) return;
  transitionState(session, SessionState.DAY_DISCUSSION);
  session.round += 1;
  broadcastSession(io, sessionId);

  startTimer(
    sessionId,
    session.config.discussionTimeMs,
    () => {
      enqueue(sessionId, async () => {
        const s = getSession(sessionId);
        if (!s) return;
        transitionState(s, SessionState.DAY_VOTE);
        broadcastSession(io, sessionId);
        startVotePhase(io, sessionId);
      });
    },
    (secondsRemaining) => {
      io.to(sessionId).emit("day:timerSync", { secondsRemaining, phase: session.state });
    }
  );
}

function startVotePhase(io: IOServer, sessionId: string): void {
  const session = getSession(sessionId);
  if (!session) return;

  startTimer(
    sessionId,
    session.config.voteTimeMs,
    () => {
      enqueue(sessionId, async () => {
        finalizeDayVote(io, sessionId);
      });
    },
    (secondsRemaining) => {
      io.to(sessionId).emit("day:timerSync", { secondsRemaining, phase: session.state });
    }
  );
}

function finalizeDayVote(io: IOServer, sessionId: string): void {
  const session = getSession(sessionId);
  if (!session || session.state !== SessionState.DAY_VOTE) return;

  const result = resolveDayVote(session);

  if (result.noLynch) {
    io.to(sessionId).emit("day:noLynch", {});
  } else {
    io.to(sessionId).emit("day:lynchResult", {
      targetId: result.targetId,
      targetName: result.targetName,
      role: result.role,
      jesterTriggered: result.jesterTriggered,
      jesterInitiatorId: result.jesterInitiatorId,
      villageIdiotRevealed: result.villageIdiotRevealed,
      elderPunishmentActivated: result.elderPunishmentActivated,
    });
  }

  broadcastSession(io, sessionId);

  logWinCheck(session, `dayvote round ${session.round}`, result.winCheck, result.deaths.length);

  if (result.winCheck.hasWinner) {
    finalizeGame(io, sessionId, result.winCheck);
    return;
  }

  // Hunter died from lynch?
  const hunterDeath = result.deaths.find((d) => {
    const p = session.players.find((p) => p.id === d.playerId);
    return p && ROLES[p.role]?.flags.isHunter;
  });
  if (hunterDeath) {
    const socketId = findSocketByPlayerId(hunterDeath.playerId);
    if (socketId) {
      const aliveTargets = session.players.filter((p) => p.isAlive).map((p) => ({ id: p.id, name: p.name, color: p.color }));
      io.to(socketId).emit("hunter:revengePrompt", { aliveTargets });
      startTimer(sessionId + "_hunter", HUNTER_REVENGE_TIMEOUT_MS, () => {
        startNextNight(io, sessionId);
      });
      return;
    }
  }

  startNextNight(io, sessionId);
}

function startNextNight(io: IOServer, sessionId: string): void {
  const session = getSession(sessionId);
  if (!session) return;
  transitionState(session, SessionState.NIGHT);
  broadcastSession(io, sessionId);
  startNightPhase(io, sessionId);
}

function logWinCheck(
  session: Session,
  label: string,
  winCheck: ReturnType<typeof checkWinConditions>,
  deathCount: number
): void {
  const alive = session.players.filter((p) => p.isAlive);
  const wolves = alive.filter((p) => ROLES[p.role]?.flags.isWerewolf === true);
  const sks = alive.filter((p) => ROLES[p.role]?.flags.isSerialKiller === true);
  const villagers = alive.filter(
    (p) =>
      ROLES[p.role]?.flags.isWerewolf !== true &&
      ROLES[p.role]?.flags.isSerialKiller !== true
  );
  // eslint-disable-next-line no-console
  console.log(
    `[winCheck ${label}] deaths=${deathCount} alive=${alive.length} ` +
      `wolves=${wolves.length} villagers=${villagers.length} sks=${sks.length} ` +
      `→ hasWinner=${winCheck.hasWinner} winner=${winCheck.winner ?? "none"}`
  );
}

function finalizeGame(
  io: IOServer,
  sessionId: string,
  winCheck: ReturnType<typeof checkWinConditions>
): void {
  const session = getSession(sessionId);
  if (!session) {
    console.log(`[finalizeGame] session ${sessionId.slice(0, 8)} NOT FOUND — aborting`);
    return;
  }

  console.log(`[finalizeGame] session ${sessionId.slice(0, 8)} state=${session.state} → GAME_OVER, winner=${winCheck.winner}, winIds=[${winCheck.winningPlayerIds.join(",")}]`);

  session.winner = winCheck.winner;
  session.winReason = winCheck.winReason;
  session.winningPlayerIds = winCheck.winningPlayerIds;
  session.state = SessionState.GAME_OVER;

  // Also broadcast the session update so clients transition to GAME_OVER screen
  broadcastSession(io, sessionId);

  io.to(sessionId).emit("game:over", {
    winner: winCheck.winner,
    winReason: winCheck.winReason,
    winningPlayerIds: winCheck.winningPlayerIds,
    allRoles: session.players.map((p) => ({
      playerId: p.id,
      playerName: p.name,
      role: p.role,
      team: p.team,
    })),
    killHistory: session.eventLog
      .filter((e) => e.type === "player_killed_night" || e.type === "player_lynched")
      .map((e) => e.data),
  });

  session.eventLog.push({
    id: uuidv4(),
    type: "game_over",
    round: session.round,
    timestamp: Date.now(),
    data: { winner: winCheck.winner, winReason: winCheck.winReason },
  });

  setTimeout(() => destroySession(sessionId), 10 * 60_000);
}
