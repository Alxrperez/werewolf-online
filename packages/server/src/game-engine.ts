import { v4 as uuidv4 } from "uuid";
import {
  Session,
  Player,
  SessionState,
  RoleName,
  Team,
  GameConfig,
  PublicSession,
  PublicPlayer,
  DeathRecord,
  ROLES,
  getNightWakeOrder,
  roleSeenBySeer,
  checkWinConditions,
  checkTannerWin,
  getLoverChainDeathId,
  isValidTransition,
  WinReason,
} from "@werewolf/shared";

// ─── Role assignment (Fisher-Yates shuffle) ───────────────────────────────────

export function assignRoles(session: Session, config: GameConfig): void {
  const { roleDistribution } = config;
  const rolePool: RoleName[] = [];

  for (const [roleName, count] of Object.entries(roleDistribution)) {
    for (let i = 0; i < (count ?? 0); i++) {
      rolePool.push(roleName as RoleName);
    }
  }

  if (rolePool.length !== session.players.length) {
    throw new Error(
      `Role pool size (${rolePool.length}) does not match player count (${session.players.length})`
    );
  }

  // Fisher-Yates shuffle
  for (let i = rolePool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = rolePool[i] as RoleName;
    rolePool[i] = rolePool[j] as RoleName;
    rolePool[j] = temp;
  }

  for (let i = 0; i < session.players.length; i++) {
    const player = session.players[i] as Player;
    const role = rolePool[i] as RoleName;
    player.role = role;
    player.team = ROLES[role]?.team ?? Team.VILLAGE;
    player.hp = ROLES[role]?.flags.isElder === true ? 2 : 1;
    player.hasVotingRights = true;
    player.isAlive = true;
    player.nightAction = null;
    player.voteTarget = null;
  }

  session.config = config;
  session.round = 1;
  session.alphaConversionUsed = false;
  session.cupidActionDone = false;
  session.witchHealUsed = false;
  session.witchKillUsed = false;
  session.elderPunishmentActive = false;
  session.wwRageKillsRemaining = 0;
  session.doctorLastTarget = null;
  session.bodyguardLastTarget = null;
}

// ─── State transition guard ───────────────────────────────────────────────────

export function transitionState(session: Session, next: SessionState): void {
  if (!isValidTransition(session.state, next)) {
    throw new Error(`Invalid transition: ${session.state} → ${next}`);
  }
  session.state = next;
}

// ─── Day vote resolution ──────────────────────────────────────────────────────

export interface LynchResult {
  noLynch: boolean;
  targetId: string | null;
  targetName: string | null;
  role: RoleName | null;
  jesterTriggered: boolean;
  jesterInitiatorId: string | null;
  villageIdiotRevealed: boolean;
  elderPunishmentActivated: boolean;
  deaths: DeathRecord[];
  winCheck: ReturnType<typeof checkWinConditions>;
}

export function resolveDayVote(session: Session): LynchResult {
  const alivePlayers = session.players.filter(
    (p) => p.isAlive && p.hasVotingRights
  );

  // Tally votes
  const tally = new Map<string, number>();
  for (const player of alivePlayers) {
    if (player.voteTarget && player.voteTarget !== "skip") {
      tally.set(player.voteTarget, (tally.get(player.voteTarget) ?? 0) + 1);
    }
  }

  if (tally.size === 0) {
    return noLynchResult(session);
  }

  // Find maximum
  const maxVotes = Math.max(...tally.values());
  const leaders = [...tally.entries()].filter(([, v]) => v === maxVotes);

  // Tie = no lynch
  if (leaders.length > 1) {
    return noLynchResult(session);
  }

  const [targetId] = leaders[0] as [string, number];
  const target = session.players.find((p) => p.id === targetId);
  if (!target) return noLynchResult(session);

  const deaths: DeathRecord[] = [];
  let jesterTriggered = false;
  let jesterInitiatorId: string | null = null;
  let villageIdiotRevealed = false;
  let elderPunishmentActivated = false;

  // ── Tanner: wins, game continues ────────────────────────────────────────────
  const tannerCheck = checkTannerWin(targetId, session.players);
  if (tannerCheck.hasWinner) {
    session.winner = "TANNER";
    session.winReason = WinReason.TannerLynched;
    session.winningPlayerIds = [targetId];
    // Tanner is still "dead" from the village's perspective
    target.isAlive = false;
    deaths.push({ playerId: target.id, playerName: target.name, role: target.role, cause: "lynch", round: session.round });
    const winCheck = checkWinConditions(session.players);
    return {
      noLynch: false,
      targetId,
      targetName: target.name,
      role: target.role,
      jesterTriggered: false,
      jesterInitiatorId: null,
      villageIdiotRevealed: false,
      elderPunishmentActivated: false,
      deaths,
      winCheck,
    };
  }

  // ── Village Idiot: survives, loses vote ──────────────────────────────────────
  if (ROLES[target.role]?.flags.isVillageIdiot === true) {
    target.hasVotingRights = false;
    villageIdiotRevealed = true;
    // Reset all votes
    for (const p of session.players) p.voteTarget = null;
    return {
      noLynch: false,
      targetId,
      targetName: target.name,
      role: target.role,
      jesterTriggered: false,
      jesterInitiatorId: null,
      villageIdiotRevealed: true,
      elderPunishmentActivated: false,
      deaths: [],
      winCheck: checkWinConditions(session.players),
    };
  }

  // ── Jester: triggers, kills initiator ────────────────────────────────────────
  if (ROLES[target.role]?.flags.isJester === true) {
    jesterTriggered = true;
    // Find the accuser (the player who first accused this target)
    // We track this in the session event log
    const accuseEvent = [...session.eventLog]
      .reverse()
      .find((e) => e.type === "player_accused" && (e.data["targetId"] as string) === targetId);
    jesterInitiatorId = (accuseEvent?.data["accuserId"] as string) ?? null;
    target.isAlive = false;
    deaths.push({ playerId: target.id, playerName: target.name, role: target.role, cause: "lynch", round: session.round });

    // Kill the initiator too
    if (jesterInitiatorId) {
      const initiator = session.players.find((p) => p.id === jesterInitiatorId && p.isAlive);
      if (initiator) {
        initiator.isAlive = false;
        deaths.push({ playerId: initiator.id, playerName: initiator.name, role: initiator.role, cause: "lynch", round: session.round });
        checkLoverChain(initiator.id, session, deaths);
      }
    }
    checkLoverChain(target.id, session, deaths);
  } else {
    // ── Normal lynch ────────────────────────────────────────────────────────────
    target.isAlive = false;
    deaths.push({ playerId: target.id, playerName: target.name, role: target.role, cause: "lynch", round: session.round });

    // Elder punishment
    if (ROLES[target.role]?.flags.isElder === true && !session.elderPunishmentActive) {
      session.elderPunishmentActive = true;
      elderPunishmentActivated = true;
      session.eventLog.push({
        id: uuidv4(),
        type: "elder_powers_removed",
        round: session.round,
        timestamp: Date.now(),
        data: {},
      });
    }

    checkLoverChain(target.id, session, deaths);
  }

  // Wolf Cub: if lynched, rage
  if (ROLES[target.role]?.flags.isWolfCub === true) {
    session.wwRageKillsRemaining = 2;
  }

  // Log event
  session.eventLog.push({
    id: uuidv4(),
    type: "player_lynched",
    round: session.round,
    timestamp: Date.now(),
    data: { playerId: target.id },
  });

  // Reset votes
  for (const p of session.players) p.voteTarget = null;

  return {
    noLynch: false,
    targetId,
    targetName: target.name,
    role: target.role,
    jesterTriggered,
    jesterInitiatorId,
    villageIdiotRevealed,
    elderPunishmentActivated,
    deaths,
    winCheck: checkWinConditions(session.players),
  };
}

function noLynchResult(session: Session): LynchResult {
  for (const p of session.players) p.voteTarget = null;
  return {
    noLynch: true,
    targetId: null,
    targetName: null,
    role: null,
    jesterTriggered: false,
    jesterInitiatorId: null,
    villageIdiotRevealed: false,
    elderPunishmentActivated: false,
    deaths: [],
    winCheck: checkWinConditions(session.players),
  };
}

function checkLoverChain(deadId: string, session: Session, deaths: DeathRecord[]): void {
  const loverId = getLoverChainDeathId(deadId, session.players);
  if (!loverId) return;
  const lover = session.players.find((p) => p.id === loverId);
  if (lover && lover.isAlive) {
    lover.isAlive = false;
    deaths.push({ playerId: lover.id, playerName: lover.name, role: lover.role, cause: "lover_chain", round: session.round });
    session.eventLog.push({
      id: uuidv4(),
      type: "lover_chain_death",
      round: session.round,
      timestamp: Date.now(),
      data: { playerId: lover.id, triggeredBy: deadId },
    });
    // Recurse in case of multiple chains (edge case)
    checkLoverChain(lover.id, session, deaths);
  }
}

// ─── Hunter revenge resolution ───────────────────────────────────────────────

export function resolveHunterRevenge(
  session: Session,
  hunterId: string,
  targetId: string
): DeathRecord[] {
  const deaths: DeathRecord[] = [];
  const target = session.players.find((p) => p.id === targetId && p.isAlive);
  if (!target) return deaths;

  target.isAlive = false;
  deaths.push({ playerId: target.id, playerName: target.name, role: target.role, cause: "hunter_revenge", round: session.round });
  checkLoverChain(target.id, session, deaths);
  return deaths;
}

// ─── Public session serializer ────────────────────────────────────────────────

export function toPublicSession(session: Session): PublicSession {
  return {
    id: session.id,
    code: session.code,
    hostPlayerId: session.hostPlayerId,
    players: session.players.map(toPublicPlayer),
    state: session.state,
    round: session.round,
    config: session.config,
    shareableLink: session.shareableLink,
    elderPunishmentActive: session.elderPunishmentActive,
    winner: session.winner,
    winReason: session.winReason,
    winningPlayerIds: session.winningPlayerIds,
  };
}

export function toPublicPlayer(player: Player): PublicPlayer {
  return {
    id: player.id,
    name: player.name,
    color: player.color,
    colorName: player.colorName,
    isAlive: player.isAlive,
    isConnected: player.isConnected,
    isReady: player.isReady,
    voteTarget: player.voteTarget,
    hasVotingRights: player.hasVotingRights,
    // Role only revealed when dead (for living players it stays null)
    role: player.isAlive ? null : player.role,
    team: player.isAlive ? null : player.team,
    loverId: player.loverId,
  };
}

/** Full reveal (for GAME_OVER broadcast) */
export function toPublicPlayerRevealed(player: Player): PublicPlayer {
  return {
    ...toPublicPlayer(player),
    role: player.role,
    team: player.team,
  };
}
