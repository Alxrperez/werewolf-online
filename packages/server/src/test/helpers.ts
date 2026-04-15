import { createServer } from "http";
import { Server as IOServer } from "socket.io";
import express from "express";
import { io as ioc, Socket as ClientSocket } from "socket.io-client";
import { registerSocketHandlers } from "../socket-handlers.js";
import { registerRoutes } from "../routes.js";
import { createSession, joinSession } from "../session-manager.js";
import {
  RoleName,
  Team,
  SessionState,
  Player,
  GameConfig,
  ROLES,
} from "@werewolf/shared";
import { assignRoles, transitionState } from "../game-engine.js";
import { getSession } from "../session-manager.js";

export interface TestServer {
  port: number;
  io: IOServer;
  close: () => Promise<void>;
}

export async function createTestServer(): Promise<TestServer> {
  const app = express();
  app.use(express.json());
  const httpServer = createServer(app);
  const io = new IOServer(httpServer, { cors: { origin: "*" } });
  registerSocketHandlers(io);

  await new Promise<void>((resolve) => httpServer.listen(0, resolve));
  const port = (httpServer.address() as { port: number }).port;
  const baseUrl = `http://localhost:${port}`;
  registerRoutes(app, baseUrl);

  return {
    port,
    io,
    close: () =>
      new Promise((resolve, reject) =>
        httpServer.close((err) => (err ? reject(err) : resolve()))
      ),
  };
}

export function connectClient(port: number): ClientSocket {
  return ioc(`http://localhost:${port}`, {
    autoConnect: true,
    transports: ["websocket"],
    forceNew: true,
  });
}

export async function waitFor<T>(
  socket: ClientSocket,
  event: string,
  timeoutMs = 5000
): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`Timeout waiting for "${event}"`)), timeoutMs);
    socket.once(event, (data: T) => {
      clearTimeout(t);
      resolve(data);
    });
  });
}

export async function waitForAll<T>(
  sockets: ClientSocket[],
  event: string,
  timeoutMs = 5000
): Promise<T[]> {
  return Promise.all(sockets.map((s) => waitFor<T>(s, event, timeoutMs)));
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Build a session with N players already assigned specific roles and start the night. */
export function buildGameSession(
  hostName: string,
  players: Array<{ name: string; role: RoleName }>,
  baseUrl = "http://localhost"
): { sessionId: string; hostPlayerId: string; playerIds: string[] } {
  const { session, playerId: hostId } = createSession(hostName, baseUrl);

  // Join remaining players
  const playerIds: string[] = [hostId];
  for (const p of players.slice(1)) {
    const result = joinSession(session.code, p.name);
    if ("error" in result) throw new Error(result.error);
    playerIds.push(result.playerId);
  }

  // Force-assign roles to specific positions
  const config: GameConfig = {
    roleDistribution: {},
    discussionTimeMs: 30_000,
    voteTimeMs: 30_000,
    nightTimeMs: 30_000,
    allowSpectators: false,
  };

  // Assign roles directly (bypass random)
  for (let i = 0; i < session.players.length; i++) {
    const player = session.players[i] as Player;
    const roleName = players[i]?.role ?? RoleName.Villager;
    player.role = roleName;
    player.team = ROLES[roleName]?.team ?? Team.VILLAGE;
    player.hp = ROLES[roleName]?.flags.isElder ? 2 : 1;
    player.isAlive = true;
    player.hasVotingRights = true;
    player.nightAction = null;
    player.voteTarget = null;
  }
  session.config = config;
  session.round = 1;
  session.state = SessionState.NIGHT;

  return { sessionId: session.id, hostPlayerId: hostId, playerIds };
}
