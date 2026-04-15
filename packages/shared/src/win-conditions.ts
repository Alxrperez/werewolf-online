import { Player, RoleName, Session, Team, WinReason } from "./types.js";
import { ROLES } from "./roles.js";

export interface WinCheckResult {
  hasWinner: boolean;
  winner: Session["winner"] | null;
  winReason: WinReason | null;
  winningPlayerIds: string[];
}

const NO_WIN: WinCheckResult = {
  hasWinner: false,
  winner: null,
  winReason: null,
  winningPlayerIds: [],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function alivePlayers(players: Player[]): Player[] {
  return players.filter((p) => p.isAlive);
}

export function aliveWerewolves(players: Player[]): Player[] {
  // Literal werewolves (those who kill at night). Excludes Sorceress.
  return players.filter((p) => p.isAlive && ROLES[p.role]?.flags.isWerewolf === true);
}

/**
 * Everyone on the wolf team (Werewolves + Alpha + Wolf Cub + Sorceress).
 * Used for the "wolves outnumber villagers" win check — the Sorceress is
 * wolf-aligned and votes with the pack, so she counts on the wolf side.
 */
export function aliveWolfTeam(players: Player[]): Player[] {
  return players.filter((p) => p.isAlive && p.team === Team.WEREWOLF);
}

export function aliveVillagers(players: Player[]): Player[] {
  // Villagers = not wolf-team and not Serial Killer.
  return players.filter(
    (p) =>
      p.isAlive &&
      p.team !== Team.WEREWOLF &&
      ROLES[p.role]?.flags.isSerialKiller !== true
  );
}

export function aliveSerialKillers(players: Player[]): Player[] {
  return players.filter((p) => p.isAlive && ROLES[p.role]?.flags.isSerialKiller === true);
}

export function aliveNonWerewolves(players: Player[]): Player[] {
  return players.filter((p) => p.isAlive && ROLES[p.role]?.flags.isWerewolf !== true);
}

function getWinningTeamIds(players: Player[], team: Team): string[] {
  return players.filter((p) => p.team === team || p.isLoverWin).map((p) => p.id);
}

// ─── Individual win conditions ────────────────────────────────────────────────

/**
 * Village wins when all werewolves are dead AND no Serial Killer is alive.
 */
export function checkVillageWin(players: Player[]): WinCheckResult {
  const wolves = aliveWerewolves(players);
  const sks = aliveSerialKillers(players);
  if (wolves.length === 0 && sks.length === 0) {
    const winIds = players.filter((p) => p.team === Team.VILLAGE || p.isLoverWin).map((p) => p.id);
    return { hasWinner: true, winner: Team.VILLAGE, winReason: WinReason.AllWerewolvesDead, winningPlayerIds: winIds };
  }
  return NO_WIN;
}

/**
 * Werewolves win when the wolf team outnumbers the village team (and no SK is alive).
 * Sorceress is part of the wolf team for this count.
 */
export function checkWerewolfWin(players: Player[]): WinCheckResult {
  const wolfTeam = aliveWolfTeam(players);
  const literalWolves = aliveWerewolves(players);
  const sks = aliveSerialKillers(players);
  const villagers = aliveVillagers(players);
  // At least one literal wolf must be alive (Sorceress alone can't win — she doesn't kill).
  if (
    literalWolves.length > 0 &&
    sks.length === 0 &&
    wolfTeam.length >= villagers.length
  ) {
    const winIds = players.filter((p) => p.team === Team.WEREWOLF).map((p) => p.id);
    return {
      hasWinner: true,
      winner: Team.WEREWOLF,
      winReason: WinReason.WerewolvesOutnumber,
      winningPlayerIds: winIds,
    };
  }
  return NO_WIN;
}

/**
 * Serial Killer wins if they are the last player alive.
 */
export function checkSerialKillerWin(players: Player[]): WinCheckResult {
  const alive = alivePlayers(players);
  const sk = alive.find((p) => ROLES[p.role]?.flags.isSerialKiller === true);
  if (sk && alive.length === 1) {
    return {
      hasWinner: true,
      winner: "SERIAL_KILLER",
      winReason: WinReason.SerialKillerLast,
      winningPlayerIds: [sk.id],
    };
  }
  return NO_WIN;
}

/**
 * Cross-team Lovers win if they are the last two players alive.
 */
export function checkLoversWin(players: Player[]): WinCheckResult {
  const alive = alivePlayers(players);
  if (alive.length === 2) {
    const [a, b] = alive as [Player, Player];
    if (a.loverId === b.id && b.loverId === a.id && a.team !== b.team) {
      return {
        hasWinner: true,
        winner: "LOVERS",
        winReason: WinReason.LoversLast,
        winningPlayerIds: [a.id, b.id],
      };
    }
  }
  return NO_WIN;
}

/**
 * Tanner wins when lynched during the day (called separately from checkAll).
 */
export function checkTannerWin(targetId: string, players: Player[]): WinCheckResult {
  const target = players.find((p) => p.id === targetId);
  if (target && ROLES[target.role]?.flags.isTanner === true) {
    return {
      hasWinner: true,
      winner: "TANNER",
      winReason: WinReason.TannerLynched,
      winningPlayerIds: [targetId],
    };
  }
  return NO_WIN;
}

/**
 * Master win check — runs all conditions in priority order after any death.
 * Does NOT include Tanner (that's checked at lynch resolution specifically).
 */
export function checkWinConditions(players: Player[]): WinCheckResult {
  // Priority: SK → Lovers → WW → Village
  const skResult = checkSerialKillerWin(players);
  if (skResult.hasWinner) return skResult;

  const loversResult = checkLoversWin(players);
  if (loversResult.hasWinner) return loversResult;

  const wwResult = checkWerewolfWin(players);
  if (wwResult.hasWinner) return wwResult;

  const villageResult = checkVillageWin(players);
  if (villageResult.hasWinner) return villageResult;

  return NO_WIN;
}

/**
 * After a Lover dies, trigger chain death for the other Lover.
 * Returns the surviving Lover's id (to mark dead), or null if no chain death.
 */
export function getLoverChainDeathId(deadPlayerId: string, players: Player[]): string | null {
  const dead = players.find((p) => p.id === deadPlayerId);
  if (!dead?.loverId) return null;
  const lover = players.find((p) => p.id === dead.loverId && p.isAlive);
  return lover?.id ?? null;
}
