// ─── Enums ────────────────────────────────────────────────────────────────────

export enum SessionState {
  LOBBY = "LOBBY",
  ROLE_REVEAL = "ROLE_REVEAL",
  NIGHT = "NIGHT",
  DAWN_REPORT = "DAWN_REPORT",
  DAY_DISCUSSION = "DAY_DISCUSSION",
  DAY_VOTE = "DAY_VOTE",
  GAME_OVER = "GAME_OVER",
}

export enum Team {
  VILLAGE = "VILLAGE",
  WEREWOLF = "WEREWOLF",
  NEUTRAL = "NEUTRAL",
}

export enum RoleName {
  // Werewolf team
  Werewolf = "Werewolf",
  AlphaWerewolf = "AlphaWerewolf",
  WolfCub = "WolfCub",
  Sorceress = "Sorceress",
  // Village team
  Villager = "Villager",
  Seer = "Seer",
  Doctor = "Doctor",
  Bodyguard = "Bodyguard",
  Hunter = "Hunter",
  Witch = "Witch",
  Cupid = "Cupid",
  LittleGirl = "LittleGirl",
  Elder = "Elder",
  VillageIdiot = "VillageIdiot",
  Mason = "Mason",
  // Neutral
  Tanner = "Tanner",
  SerialKiller = "SerialKiller",
  Jester = "Jester",
}

export enum WinReason {
  AllWerewolvesDead = "AllWerewolvesDead",
  WerewolvesOutnumber = "WerewolvesOutnumber",
  TannerLynched = "TannerLynched",
  SerialKillerLast = "SerialKillerLast",
  LoversLast = "LoversLast",
}

// ─── Night actions ─────────────────────────────────────────────────────────────

export type NightAction =
  | { type: "ww_kill"; targetId: string }
  | { type: "alpha_convert"; targetId: string }
  | { type: "seer_investigate"; targetId: string }
  | { type: "doctor_protect"; targetId: string }
  | { type: "bodyguard_guard"; targetId: string }
  | { type: "witch_heal" }
  | { type: "witch_kill"; targetId: string }
  | { type: "witch_pass" }
  | { type: "sk_kill"; targetId: string }
  | { type: "cupid_link"; targetAId: string; targetBId: string }
  | { type: "mason_acknowledge" }
  | { type: "sorceress_investigate"; targetId: string }
  | { type: "hunter_revenge"; targetId: string };

// ─── Player ────────────────────────────────────────────────────────────────────

export interface Player {
  id: string;
  name: string;
  color: string;
  colorName: string;
  role: RoleName;
  team: Team;
  isAlive: boolean;
  isConnected: boolean;
  isReady: boolean;
  voteTarget: string | null;
  nightAction: NightAction | null;
  joinedAt: number;
  // Elder: starts at 2 vs wolves, reduced to 1 after first WW attack
  hp: number;
  // Village Idiot: loses voting rights after reveal
  hasVotingRights: boolean;
  // Lovers
  loverId: string | null;
  isLoverWin: boolean;
}

// ─── Game config ──────────────────────────────────────────────────────────────

export interface GameConfig {
  roleDistribution: Partial<Record<RoleName, number>>;
  discussionTimeMs: number;
  voteTimeMs: number;
  nightTimeMs: number;
  allowSpectators: boolean;
}

// ─── Game event log ───────────────────────────────────────────────────────────

export type GameEventType =
  | "player_joined"
  | "player_left"
  | "game_started"
  | "night_started"
  | "dawn_report"
  | "day_started"
  | "player_accused"
  | "player_voted"
  | "player_lynched"
  | "player_killed_night"
  | "hunter_revenge"
  | "elder_survived"
  | "elder_powers_removed"
  | "alpha_converted"
  | "lovers_linked"
  | "lover_chain_death"
  | "tanner_wins"
  | "game_over";

export interface GameEvent {
  id: string;
  type: GameEventType;
  round: number;
  timestamp: number;
  data: Record<string, unknown>;
}

// ─── Session ───────────────────────────────────────────────────────────────────

export interface Session {
  id: string;
  code: string;
  hostPlayerId: string;
  players: Player[];
  state: SessionState;
  round: number;
  config: GameConfig;
  eventLog: GameEvent[];
  createdAt: number;
  shareableLink: string;
  // Night resolution state
  wwKillTarget: string | null;
  doctorProtectTarget: string | null;
  bodyguardGuardTarget: string | null;
  witchHealUsed: boolean;
  witchKillUsed: boolean;
  witchKillTarget: string | null;
  witchHealedThisNight: boolean;
  skKillTarget: string | null;
  // Wolf Cub rage: extra kills next night
  wwRageKillsRemaining: number;
  // Elder punishment
  elderPunishmentActive: boolean;
  // Alpha conversion tracking
  alphaConversionUsed: boolean;
  // Cupid
  cupidActionDone: boolean;
  // Previous doctor/bodyguard targets (no back-to-back same target)
  doctorLastTarget: string | null;
  bodyguardLastTarget: string | null;
  // Spectator socket IDs
  spectatorIds: string[];
  // Win result
  winner: Team | "LOVERS" | "TANNER" | "SERIAL_KILLER" | null;
  winReason: WinReason | null;
  winningPlayerIds: string[];
}

// ─── Public session info (safe to broadcast) ─────────────────────────────────

export interface PublicSession {
  id: string;
  code: string;
  hostPlayerId: string;
  players: PublicPlayer[];
  state: SessionState;
  round: number;
  config: GameConfig;
  shareableLink: string;
  elderPunishmentActive: boolean;
  winner: Session["winner"];
  winReason: WinReason | null;
  winningPlayerIds: string[];
}

export interface PublicPlayer {
  id: string;
  name: string;
  color: string;
  colorName: string;
  isAlive: boolean;
  isConnected: boolean;
  isReady: boolean;
  voteTarget: string | null;
  hasVotingRights: boolean;
  // Role is revealed only when the player is dead OR game is over
  role: RoleName | null;
  team: Team | null;
  loverId: string | null;
}

// ─── Death record ─────────────────────────────────────────────────────────────

export interface DeathRecord {
  playerId: string;
  playerName: string;
  role: RoleName;
  cause: "werewolf" | "lynch" | "witch_kill" | "serial_killer" | "hunter_revenge" | "lover_chain" | "bodyguard";
  round: number;
}

// ─── REST API types ───────────────────────────────────────────────────────────

export interface CreateSessionRequest {
  hostName: string;
}

export interface CreateSessionResponse {
  sessionId: string;
  sessionCode: string;
  playerId: string;
  shareableLink: string;
}

export interface GetSessionResponse {
  sessionId: string;
  playerCount: number;
  state: SessionState;
  hostName: string;
}

export interface JoinSessionRequest {
  playerName: string;
}

export interface JoinSessionResponse {
  playerId: string;
  sessionId: string;
}

// ─── Socket event payloads (Client → Server) ─────────────────────────────────

export interface PlayerReadyPayload {
  playerId: string;
}

export interface HostStartPayload {
  roleConfig: Partial<Record<RoleName, number>>;
}

export interface HostKickPayload {
  targetPlayerId: string;
}

export interface NightActionPayload {
  playerId: string;
  action: NightAction;
}

export interface DayAccusePayload {
  playerId: string;
  targetId: string;
}

export interface DayVotePayload {
  playerId: string;
  targetId: string | "skip";
}

export interface DayChatPayload {
  playerId: string;
  message: string;
}

export interface HunterRevengePayload {
  playerId: string;
  targetId: string;
}

export interface PlayerReconnectPayload {
  playerId: string;
  sessionCode: string;
}

// ─── Socket event payloads (Server → Client) ─────────────────────────────────

export interface SessionUpdatePayload {
  session: PublicSession;
}

export interface RoleRevealPayload {
  role: RoleName;
  description: string;
  team: Team;
  loverId: string | null;
  loverName: string | null;
  masonIds: string[];
}

export interface NightWakePayload {
  yourTurn: boolean;
  aliveTargets: Array<{ id: string; name: string; color: string }>;
  wwTarget?: string | null; // Only for Witch: see who WW targeted
  isSeerResult?: { targetId: string; role: RoleName }; // After seer investigates
  isWolfCubRage?: boolean; // WW get 2 kills this night
}

export interface NightWWChatPayload {
  from: string;
  fromName: string;
  message: string;
}

export interface DawnReportPayload {
  deaths: DeathRecord[];
  round: number;
}

export interface TimerSyncPayload {
  secondsRemaining: number;
  phase: SessionState;
}

export interface VoteUpdatePayload {
  votes: Record<string, string | "skip">;
  tally: Record<string, number>;
}

export interface LynchResultPayload {
  targetId: string;
  targetName: string;
  role: RoleName;
  jesterTriggered: boolean;
  jesterInitiatorId: string | null;
  villageIdiotRevealed: boolean;
  elderPunishmentActivated: boolean;
}

export interface GameOverPayload {
  winner: Session["winner"];
  winReason: WinReason;
  winningPlayerIds: string[];
  allRoles: Array<{ playerId: string; playerName: string; role: RoleName; team: Team }>;
  killHistory: DeathRecord[];
}

export interface ErrorPayload {
  code: string;
  message: string;
}

export interface AccusationPayload {
  accuserId: string;
  accuserName: string;
  targetId: string;
  targetName: string;
  secondsToSecond: number;
}

export interface SecondPayload {
  seconderId: string;
  seconderName: string;
  targetId: string;
}
