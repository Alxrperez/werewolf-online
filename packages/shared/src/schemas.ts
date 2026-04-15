import { z } from "zod";
import { RoleName, SessionState } from "./types.js";

// ─── Primitives ───────────────────────────────────────────────────────────────

const playerIdSchema = z.string().uuid();
const sessionCodeSchema = z.string().length(6).regex(/^[A-Z0-9]{6}$/);
const playerNameSchema = z.string().min(2).max(16).trim();

// ─── Night action schemas ─────────────────────────────────────────────────────

export const nightActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("ww_kill"), targetId: playerIdSchema }),
  z.object({ type: z.literal("alpha_convert"), targetId: playerIdSchema }),
  z.object({ type: z.literal("seer_investigate"), targetId: playerIdSchema }),
  z.object({ type: z.literal("doctor_protect"), targetId: playerIdSchema }),
  z.object({ type: z.literal("bodyguard_guard"), targetId: playerIdSchema }),
  z.object({ type: z.literal("witch_heal") }),
  z.object({ type: z.literal("witch_kill"), targetId: playerIdSchema }),
  z.object({ type: z.literal("witch_pass") }),
  z.object({ type: z.literal("sk_kill"), targetId: playerIdSchema }),
  z.object({ type: z.literal("cupid_link"), targetAId: playerIdSchema, targetBId: playerIdSchema }),
  z.object({ type: z.literal("mason_acknowledge") }),
  z.object({ type: z.literal("sorceress_investigate"), targetId: playerIdSchema }),
  z.object({ type: z.literal("hunter_revenge"), targetId: playerIdSchema }),
]);

// ─── Role distribution schema ─────────────────────────────────────────────────

const roleNameValues = Object.values(RoleName) as [RoleName, ...RoleName[]];
export const roleDistributionSchema = z
  .record(z.enum(roleNameValues), z.number().int().min(0).max(6))
  .refine((dist) => Object.values(dist).reduce((sum, n) => sum + (n ?? 0), 0) >= 6, {
    message: "Role distribution must have at least 6 roles total",
  });

// ─── REST schemas ──────────────────────────────────────────────────────────────

export const createSessionSchema = z.object({
  hostName: playerNameSchema,
  nightTimeSecs: z.number().int().min(15).max(180).optional(),
  discussionTimeSecs: z.number().int().min(30).max(600).optional(),
  voteTimeSecs: z.number().int().min(15).max(180).optional(),
});

export const joinSessionSchema = z.object({
  playerName: playerNameSchema,
});

// ─── Client → Server socket schemas ──────────────────────────────────────────

export const playerReadySchema = z.object({
  playerId: playerIdSchema,
});

export const hostStartSchema = z.object({
  roleConfig: roleDistributionSchema,
});

export const hostKickSchema = z.object({
  targetPlayerId: playerIdSchema,
});

export const nightActionPayloadSchema = z.object({
  playerId: playerIdSchema,
  action: nightActionSchema,
});

export const dayAccuseSchema = z.object({
  playerId: playerIdSchema,
  targetId: playerIdSchema,
});

export const dayVoteSchema = z.object({
  playerId: playerIdSchema,
  targetId: z.union([playerIdSchema, z.literal("skip")]),
});

export const dayChatSchema = z.object({
  playerId: playerIdSchema,
  message: z.string().min(1).max(300).trim(),
});

export const hunterRevengeSchema = z.object({
  playerId: playerIdSchema,
  targetId: playerIdSchema,
});

export const playerReconnectSchema = z.object({
  playerId: playerIdSchema,
  sessionCode: sessionCodeSchema,
});

export const wwNightChatSchema = z.object({
  playerId: playerIdSchema,
  message: z.string().min(1).max(300).trim(),
});

export const daySecondSchema = z.object({
  playerId: playerIdSchema,
  targetId: playerIdSchema,
});

export const spectatorJoinSchema = z.object({
  sessionCode: sessionCodeSchema,
});

export const wwCheckPeekSchema = z.object({
  playerId: playerIdSchema,
});

// ─── Inbound event → schema map ───────────────────────────────────────────────

export const SOCKET_SCHEMAS = {
  "player:ready": playerReadySchema,
  "host:start": hostStartSchema,
  "host:kick": hostKickSchema,
  "night:action": nightActionPayloadSchema,
  "day:accuse": dayAccuseSchema,
  "day:second": daySecondSchema,
  "day:vote": dayVoteSchema,
  "day:chat": dayChatSchema,
  "night:wwChat": wwNightChatSchema,
  "night:wwCheckPeek": wwCheckPeekSchema,
  "hunter:revenge": hunterRevengeSchema,
  "player:reconnect": playerReconnectSchema,
  "spectator:join": spectatorJoinSchema,
} as const;

export type SocketEventName = keyof typeof SOCKET_SCHEMAS;

// ─── Valid state transitions ──────────────────────────────────────────────────

export const VALID_TRANSITIONS: Record<SessionState, SessionState[]> = {
  [SessionState.LOBBY]: [SessionState.ROLE_REVEAL],
  [SessionState.ROLE_REVEAL]: [SessionState.NIGHT],
  [SessionState.NIGHT]: [SessionState.DAWN_REPORT],
  [SessionState.DAWN_REPORT]: [SessionState.DAY_DISCUSSION, SessionState.GAME_OVER],
  [SessionState.DAY_DISCUSSION]: [SessionState.DAY_VOTE],
  [SessionState.DAY_VOTE]: [SessionState.DAWN_REPORT, SessionState.NIGHT, SessionState.GAME_OVER],
  [SessionState.GAME_OVER]: [],
};

export function isValidTransition(from: SessionState, to: SessionState): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}
