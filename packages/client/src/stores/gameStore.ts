import { create } from "zustand";
import {
  PublicSession,
  PublicPlayer,
  RoleName,
  Team,
  SessionState,
  DeathRecord,
  WinReason,
} from "@werewolf/shared";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  message: string;
  timestamp: number;
  isWWChat?: boolean;
}

export interface SeerResult {
  targetId: string;
  role: RoleName;
}

export interface SorceressResult {
  targetId: string;
  isSeer: boolean;
}

export interface NightWakeInfo {
  yourTurn: boolean;
  aliveTargets: Array<{ id: string; name: string; color: string }>;
  wwTarget: string | null;
  witchHealUsed: boolean;
  witchKillUsed: boolean;
  isWolfCubRage: boolean;
  rageKillsRemaining: number;
  masonIds: string[];
}

export interface Accusation {
  accuserId: string;
  accuserName: string;
  targetId: string;
  targetName: string;
  secondsToSecond: number;
  timestamp: number;
}

// ─── Store shape ──────────────────────────────────────────────────────────────

interface GameState {
  // Connection
  playerId: string | null;
  sessionCode: string | null;
  isConnected: boolean;

  // Session
  session: PublicSession | null;

  // Role info (private, from server per-socket)
  myRole: RoleName | null;
  myRoleDescription: string | null;
  myTeam: Team | null;
  myLoverId: string | null;
  myLoverName: string | null;
  masonIds: string[];

  // Night
  nightWakeInfo: NightWakeInfo | null;
  seerResult: SeerResult | null;
  sorceressResult: SorceressResult | null;
  hasSubmittedNightAction: boolean;

  // Day
  chatMessages: ChatMessage[];
  wwChatMessages: ChatMessage[];
  currentAccusation: Accusation | null;
  voteUpdate: { votes: Record<string, string>; tally: Record<string, number> } | null;

  // Deaths
  lastDawnDeaths: DeathRecord[];
  lynchResult: {
    targetId: string;
    targetName: string;
    role: RoleName;
    jesterTriggered: boolean;
    jesterInitiatorId: string | null;
    villageIdiotRevealed: boolean;
    elderPunishmentActivated: boolean;
  } | null;

  // Hunter
  hunterRevengeTargets: Array<{ id: string; name: string; color: string }> | null;

  // Little Girl
  littleGirlPeekColor: string | null;   // color of WW target (partial info)
  caughtPeeking: boolean;               // WW caught her peeking
  peekCaughtInfo: { littleGirlId: string | null; littleGirlName: string | null } | null;

  // Game over
  gameOverData: {
    winner: PublicSession["winner"];
    winReason: WinReason;
    winningPlayerIds: string[];
    allRoles: Array<{ playerId: string; playerName: string; role: RoleName; team: Team }>;
    killHistory: DeathRecord[];
  } | null;

  // Errors
  lastError: { code: string; message: string } | null;

  // Timer
  timerSecondsRemaining: number | null;
  timerPhase: SessionState | null;
}

interface GameActions {
  setPlayerId: (id: string) => void;
  setSessionCode: (code: string) => void;
  setConnected: (connected: boolean) => void;
  setSession: (session: PublicSession) => void;
  setRoleReveal: (payload: {
    role: RoleName;
    description: string;
    team: Team;
    loverId: string | null;
    loverName: string | null;
    masonIds: string[];
  }) => void;
  setNightWakeInfo: (info: NightWakeInfo) => void;
  clearNightWakeInfo: () => void;
  setHasSubmittedNightAction: (submitted: boolean) => void;
  setSeerResult: (result: SeerResult) => void;
  setSorceressResult: (result: SorceressResult) => void;
  addChatMessage: (msg: ChatMessage) => void;
  addWWChatMessage: (msg: ChatMessage) => void;
  setAccusation: (accusation: Accusation | null) => void;
  setVoteUpdate: (update: { votes: Record<string, string>; tally: Record<string, number> }) => void;
  setDawnDeaths: (deaths: DeathRecord[]) => void;
  setLynchResult: (result: GameState["lynchResult"]) => void;
  setHunterRevengeTargets: (targets: Array<{ id: string; name: string; color: string }> | null) => void;
  setLittleGirlPeek: (color: string) => void;
  setCaughtPeeking: () => void;
  setPeekCaughtInfo: (info: { littleGirlId: string | null; littleGirlName: string | null }) => void;
  setGameOver: (data: NonNullable<GameState["gameOverData"]>) => void;
  setError: (error: { code: string; message: string } | null) => void;
  setTimer: (seconds: number, phase: SessionState) => void;
  setLoverReveal: (loverId: string, loverName: string) => void;
  reset: () => void;
}

// ─── Initial state ────────────────────────────────────────────────────────────

const initialState: GameState = {
  playerId: null,
  sessionCode: null,
  isConnected: false,
  session: null,
  myRole: null,
  myRoleDescription: null,
  myTeam: null,
  myLoverId: null,
  myLoverName: null,
  masonIds: [],
  nightWakeInfo: null,
  seerResult: null,
  sorceressResult: null,
  hasSubmittedNightAction: false,
  chatMessages: [],
  wwChatMessages: [],
  currentAccusation: null,
  voteUpdate: null,
  lastDawnDeaths: [],
  lynchResult: null,
  hunterRevengeTargets: null,
  littleGirlPeekColor: null,
  caughtPeeking: false,
  peekCaughtInfo: null,
  gameOverData: null,
  lastError: null,
  timerSecondsRemaining: null,
  timerPhase: null,
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const useGameStore = create<GameState & GameActions>((set) => ({
  ...initialState,

  setPlayerId: (id) => set({ playerId: id }),
  setSessionCode: (code) => set({ sessionCode: code }),
  setConnected: (connected) => set({ isConnected: connected }),
  setSession: (session) => set({ session }),

  setRoleReveal: (payload) =>
    set({
      myRole: payload.role,
      myRoleDescription: payload.description,
      myTeam: payload.team,
      myLoverId: payload.loverId,
      myLoverName: payload.loverName,
      masonIds: payload.masonIds,
    }),

  setNightWakeInfo: (info) => set({ nightWakeInfo: info, hasSubmittedNightAction: false }),
  clearNightWakeInfo: () => set({ nightWakeInfo: null }),
  setHasSubmittedNightAction: (submitted) => set({ hasSubmittedNightAction: submitted }),
  setSeerResult: (result) => set({ seerResult: result }),
  setSorceressResult: (result) => set({ sorceressResult: result }),

  addChatMessage: (msg) =>
    set((state) => ({ chatMessages: [...state.chatMessages.slice(-200), msg] })),

  addWWChatMessage: (msg) =>
    set((state) => ({ wwChatMessages: [...state.wwChatMessages.slice(-100), msg] })),

  setAccusation: (accusation) => set({ currentAccusation: accusation }),
  setVoteUpdate: (update) => set({ voteUpdate: update }),
  setDawnDeaths: (deaths) => set({ lastDawnDeaths: deaths }),
  setLynchResult: (result) => set({ lynchResult: result }),
  setHunterRevengeTargets: (targets) => set({ hunterRevengeTargets: targets }),
  setLittleGirlPeek: (color) => set({ littleGirlPeekColor: color }),
  setCaughtPeeking: () => set({ caughtPeeking: true }),
  setPeekCaughtInfo: (info) => set({ peekCaughtInfo: info }),
  setGameOver: (data) => set({ gameOverData: data }),
  setError: (error) => set({ lastError: error }),
  setTimer: (seconds, phase) => set({ timerSecondsRemaining: seconds, timerPhase: phase }),
  setLoverReveal: (loverId, loverName) => set({ myLoverId: loverId, myLoverName: loverName }),

  reset: () => set(initialState),
}));

// ─── Selectors ─────────────────────────────────────────────────────────────────

export const selectMyPlayer = (state: GameState): PublicPlayer | null => {
  if (!state.session || !state.playerId) return null;
  return state.session.players.find((p) => p.id === state.playerId) ?? null;
};

export const selectAlivePlayers = (state: GameState): PublicPlayer[] =>
  state.session?.players.filter((p) => p.isAlive) ?? [];

export const selectIsHost = (state: GameState): boolean =>
  state.session?.hostPlayerId === state.playerId;

export const selectIsMyTurn = (state: GameState): boolean =>
  state.nightWakeInfo?.yourTurn === true && !state.hasSubmittedNightAction;
