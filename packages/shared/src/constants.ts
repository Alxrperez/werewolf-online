// ─── Player limits ────────────────────────────────────────────────────────────
export const MIN_PLAYERS = 6;
export const MAX_PLAYERS = 20;
export const MIN_NAME_LENGTH = 2;
export const MAX_NAME_LENGTH = 16;
export const SESSION_CODE_LENGTH = 6;

// ─── Timer durations (ms) ─────────────────────────────────────────────────────
export const ROLE_REVEAL_DURATION_MS = 10_000;
export const DAWN_REPORT_DURATION_MS = 10_000;
export const DAY_DISCUSSION_DURATION_MS = 120_000;
export const DAY_VOTE_DURATION_MS = 60_000;
export const NIGHT_ACTION_TIMEOUT_MS = 45_000;
export const HUNTER_REVENGE_TIMEOUT_MS = 15_000;
export const LAST_WORDS_DURATION_MS = 10_000;
export const TIMER_SYNC_INTERVAL_MS = 5_000;

// ─── Session lifecycle ────────────────────────────────────────────────────────
export const RECONNECT_GRACE_PERIOD_MS = 120_000;
export const SESSION_CLEANUP_INTERVAL_MS = 60_000;
export const SESSION_TTL_AFTER_GAME_OVER_MS = 10 * 60_000;

// ─── Chat ──────────────────────────────────────────────────────────────────────
export const MAX_CHAT_MESSAGE_LENGTH = 300;
export const CHAT_RATE_LIMIT_PER_MINUTE = 20;

// ─── Color palette (20 slots, assigned in join order) ─────────────────────────
export const COLOR_PALETTE = [
  { hex: "#E63946", name: "Crimson" },
  { hex: "#F4A261", name: "Amber" },
  { hex: "#E9C46A", name: "Gold" },
  { hex: "#2A9D8F", name: "Teal" },
  { hex: "#264653", name: "Deep Navy" },
  { hex: "#6A0572", name: "Purple" },
  { hex: "#A7C957", name: "Lime" },
  { hex: "#F72585", name: "Hot Pink" },
  { hex: "#4361EE", name: "Royal Blue" },
  { hex: "#4CC9F0", name: "Cyan" },
  { hex: "#FF6B35", name: "Tangerine" },
  { hex: "#1B4332", name: "Forest" },
  { hex: "#BC6C25", name: "Burnt Sienna" },
  { hex: "#606C38", name: "Olive" },
  { hex: "#9B2226", name: "Maroon" },
  { hex: "#AE2012", name: "Rust" },
  { hex: "#CA6702", name: "Ochre" },
  { hex: "#BB3E03", name: "Copper" },
  { hex: "#005F73", name: "Dark Teal" },
  { hex: "#94D2BD", name: "Seafoam" },
] as const;

export type ColorEntry = (typeof COLOR_PALETTE)[number];

// ─── Recommended distributions ───────────────────────────────────────────────
export const RECOMMENDED_DISTRIBUTIONS: Record<
  number,
  { werewolves: string[]; villageSpecial: string[]; villagers: number; neutral: string[] }
> = {
  6: { werewolves: ["Werewolf"], villageSpecial: ["Seer", "Doctor"], villagers: 3, neutral: [] },
  8: {
    werewolves: ["Werewolf", "Werewolf"],
    villageSpecial: ["Seer", "Doctor", "Hunter"],
    villagers: 3,
    neutral: [],
  },
  10: {
    werewolves: ["Werewolf", "Werewolf"],
    villageSpecial: ["Seer", "Doctor", "Witch", "Hunter"],
    villagers: 3,
    neutral: ["Tanner"],
  },
  12: {
    werewolves: ["Werewolf", "Werewolf", "Werewolf"],
    villageSpecial: ["Seer", "Doctor", "Witch", "Hunter", "Cupid"],
    villagers: 3,
    neutral: ["Tanner"],
  },
  15: {
    werewolves: ["Werewolf", "Werewolf", "Werewolf", "Sorceress"],
    villageSpecial: ["Seer", "Doctor", "Witch", "Hunter", "Bodyguard", "Mason", "Mason"],
    villagers: 3,
    neutral: ["Tanner", "SerialKiller"],
  },
};
