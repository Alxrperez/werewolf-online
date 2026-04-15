import { v4 as uuidv4 } from "uuid";
import {
  Session,
  Player,
  SessionState,
  RoleName,
  Team,
  GameConfig,
  COLOR_PALETTE,
  MIN_PLAYERS,
  MAX_PLAYERS,
  DAY_DISCUSSION_DURATION_MS,
  DAY_VOTE_DURATION_MS,
  NIGHT_ACTION_TIMEOUT_MS,
  SESSION_CODE_LENGTH,
  ROLES,
} from "@werewolf/shared";

// ─── In-memory store ──────────────────────────────────────────────────────────

const sessions = new Map<string, Session>();
const codeToId = new Map<string, string>();

// ─── Helper: random 6-char code ──────────────────────────────────────────────

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < SESSION_CODE_LENGTH; i++) {
    code += chars[Math.floor(Math.random() * chars.length)] ?? "A";
  }
  return code;
}

function uniqueCode(): string {
  let code = generateCode();
  while (codeToId.has(code)) code = generateCode();
  return code;
}

// ─── Default game config ─────────────────────────────────────────────────────

function defaultConfig(): GameConfig {
  return {
    roleDistribution: {
      [RoleName.Werewolf]: 2,
      [RoleName.Seer]: 1,
      [RoleName.Doctor]: 1,
      [RoleName.Villager]: 4,
    },
    discussionTimeMs: DAY_DISCUSSION_DURATION_MS,
    voteTimeMs: DAY_VOTE_DURATION_MS,
    nightTimeMs: NIGHT_ACTION_TIMEOUT_MS,
    allowSpectators: true,
  };
}

// ─── Session CRUD ──────────────────────────────────────────────────────────────

export function createSession(
  hostName: string,
  baseUrl: string,
  timeOverrides?: { nightTimeSecs?: number; discussionTimeSecs?: number; voteTimeSecs?: number }
): { session: Session; playerId: string } {
  const sessionId = uuidv4();
  const code = uniqueCode();
  const playerId = uuidv4();
  const palette = COLOR_PALETTE[0];

  const host: Player = {
    id: playerId,
    name: hostName,
    color: palette?.hex ?? "#E63946",
    colorName: palette?.name ?? "Crimson",
    role: RoleName.Villager,
    team: Team.VILLAGE,
    isAlive: true,
    isConnected: false,
    isReady: false,
    voteTarget: null,
    nightAction: null,
    joinedAt: Date.now(),
    hp: 1,
    hasVotingRights: true,
    loverId: null,
    isLoverWin: false,
  };

  const cfg = defaultConfig();
  if (timeOverrides?.nightTimeSecs)      cfg.nightTimeMs      = timeOverrides.nightTimeSecs      * 1000;
  if (timeOverrides?.discussionTimeSecs) cfg.discussionTimeMs = timeOverrides.discussionTimeSecs * 1000;
  if (timeOverrides?.voteTimeSecs)       cfg.voteTimeMs       = timeOverrides.voteTimeSecs       * 1000;

  const session: Session = {
    id: sessionId,
    code,
    hostPlayerId: playerId,
    players: [host],
    state: SessionState.LOBBY,
    round: 0,
    config: cfg,
    eventLog: [],
    createdAt: Date.now(),
    shareableLink: `${baseUrl}/join/${code}`,
    wwKillTarget: null,
    doctorProtectTarget: null,
    bodyguardGuardTarget: null,
    witchHealUsed: false,
    witchKillUsed: false,
    witchKillTarget: null,
    witchHealedThisNight: false,
    skKillTarget: null,
    wwRageKillsRemaining: 0,
    elderPunishmentActive: false,
    alphaConversionUsed: false,
    cupidActionDone: false,
    doctorLastTarget: null,
    bodyguardLastTarget: null,
    spectatorIds: [],
    winner: null,
    winReason: null,
    winningPlayerIds: [],
  };

  sessions.set(sessionId, session);
  codeToId.set(code, sessionId);
  return { session, playerId };
}

export function joinSession(
  code: string,
  playerName: string
): { session: Session; playerId: string } | { error: string } {
  const sessionId = codeToId.get(code.toUpperCase());
  if (!sessionId) return { error: "Session not found" };
  const session = sessions.get(sessionId);
  if (!session) return { error: "Session not found" };
  if (session.state !== SessionState.LOBBY) return { error: "Game already started" };
  if (session.players.length >= MAX_PLAYERS) return { error: "Session is full" };
  if (session.players.some((p) => p.name.toLowerCase() === playerName.toLowerCase())) {
    return { error: "Name already taken" };
  }

  const playerId = uuidv4();
  const paletteEntry = COLOR_PALETTE[session.players.length];
  const player: Player = {
    id: playerId,
    name: playerName,
    color: paletteEntry?.hex ?? "#94D2BD",
    colorName: paletteEntry?.name ?? "Seafoam",
    role: RoleName.Villager,
    team: Team.VILLAGE,
    isAlive: true,
    isConnected: false,
    isReady: false,
    voteTarget: null,
    nightAction: null,
    joinedAt: Date.now(),
    hp: 1,
    hasVotingRights: true,
    loverId: null,
    isLoverWin: false,
  };

  session.players.push(player);
  return { session, playerId };
}

export function kickPlayer(
  sessionId: string,
  hostPlayerId: string,
  targetPlayerId: string
): Session | { error: string } {
  const session = sessions.get(sessionId);
  if (!session) return { error: "Session not found" };
  if (session.hostPlayerId !== hostPlayerId) return { error: "Not the host" };
  if (session.state !== SessionState.LOBBY) return { error: "Can only kick in lobby" };
  if (targetPlayerId === hostPlayerId) return { error: "Cannot kick yourself" };

  session.players = session.players.filter((p) => p.id !== targetPlayerId);
  return session;
}

export function getSession(sessionId: string): Session | undefined {
  return sessions.get(sessionId);
}

export function getSessionByCode(code: string): Session | undefined {
  const id = codeToId.get(code.toUpperCase());
  return id ? sessions.get(id) : undefined;
}

export function getPlayerSession(playerId: string): Session | undefined {
  for (const session of sessions.values()) {
    if (session.players.some((p) => p.id === playerId)) return session;
  }
  return undefined;
}

export function destroySession(sessionId: string): void {
  const session = sessions.get(sessionId);
  if (session) {
    codeToId.delete(session.code);
    sessions.delete(sessionId);
  }
}

export function getAllSessions(): Session[] {
  return Array.from(sessions.values());
}

export function setPlayerConnected(sessionId: string, playerId: string, connected: boolean): void {
  const session = sessions.get(sessionId);
  const player = session?.players.find((p) => p.id === playerId);
  if (player) player.isConnected = connected;
}

export function setPlayerReady(sessionId: string, playerId: string, ready: boolean): void {
  const session = sessions.get(sessionId);
  const player = session?.players.find((p) => p.id === playerId);
  if (player) player.isReady = ready;
}

export function getSessionCount(): number {
  return sessions.size;
}

export function resetSession(sessionId: string): Session | { error: string } {
  const session = sessions.get(sessionId);
  if (!session) return { error: "Session not found" };
  if (session.state !== SessionState.GAME_OVER) return { error: "Game is still in progress" };

  // Reset every player back to a fresh lobby state (keep id, name, color)
  for (const p of session.players) {
    p.role         = RoleName.Villager;
    p.team         = Team.VILLAGE;
    p.isAlive      = true;
    p.isReady      = false;
    p.voteTarget   = null;
    p.nightAction  = null;
    p.hp           = 1;
    p.hasVotingRights = true;
    p.loverId      = null;
    p.isLoverWin   = false;
  }

  // Reset all game-state fields
  session.state                  = SessionState.LOBBY;
  session.round                  = 0;
  session.eventLog               = [];
  session.winner                 = null;
  session.winReason              = null;
  session.winningPlayerIds       = [];
  session.wwKillTarget           = null;
  session.doctorProtectTarget    = null;
  session.bodyguardGuardTarget   = null;
  session.witchHealUsed          = false;
  session.witchKillUsed          = false;
  session.witchKillTarget        = null;
  session.witchHealedThisNight   = false;
  session.skKillTarget           = null;
  session.wwRageKillsRemaining   = 0;
  session.elderPunishmentActive  = false;
  session.alphaConversionUsed    = false;
  session.cupidActionDone        = false;
  session.doctorLastTarget       = null;
  session.bodyguardLastTarget    = null;

  return session;
}
