import { v4 as uuidv4 } from "uuid";
import {
  Session,
  Player,
  RoleName,
  Team,
  DeathRecord,
  ROLES,
  roleSeenBySeer,
  checkWinConditions,
  getLoverChainDeathId,
} from "@werewolf/shared";

export interface NightResolutionResult {
  deaths: DeathRecord[];
  alphaConversionTargetId: string | null;
  seerResults: Map<string, RoleName>;
  sorceressResults: Map<string, boolean>;
  winCheck: ReturnType<typeof checkWinConditions>;
}

/**
 * Atomic night resolution.
 * Steps (all synchronous, single pass):
 *  1. Resolve protections (Doctor, Witch heal, Bodyguard)
 *  2. Resolve kills (WW kill, SK kill, Witch kill)
 *  3. Elder extra life
 *  4. Alpha conversion
 *  5. Apply deaths + Lover chain deaths + WolfCub rage
 *  6. Win check
 */
export function resolveNight(session: Session): NightResolutionResult {
  const deaths: DeathRecord[] = [];
  let alphaConversionTargetId: string | null = null;
  const seerResults = new Map<string, RoleName>();
  const sorceressResults = new Map<string, boolean>();

  // ── Step 1: Build protection set ────────────────────────────────────────────

  const protectedIds = new Set<string>();
  if (session.doctorProtectTarget) protectedIds.add(session.doctorProtectTarget);
  if (session.witchHealedThisNight && session.wwKillTarget) protectedIds.add(session.wwKillTarget);

  // Bodyguard: absorbs kill aimed at their guard target
  let bodyguardDied = false;
  let bodyguardId: string | null = null;
  const bodyguardTarget = session.bodyguardGuardTarget;
  if (
    bodyguardTarget &&
    session.wwKillTarget === bodyguardTarget &&
    !protectedIds.has(bodyguardTarget)
  ) {
    const bodyguard = session.players.find(
      (p) => p.isAlive && ROLES[p.role]?.flags.isBodyguard === true
    );
    if (bodyguard) {
      bodyguardDied = true;
      bodyguardId = bodyguard.id;
      protectedIds.add(bodyguardTarget);
    }
  }

  // ── Step 2: Collect kills ─────────────────────────────────────────────────

  const toKill = new Map<string, DeathRecord["cause"]>();

  // WW kill
  if (session.wwKillTarget) {
    const target = findAlive(session, session.wwKillTarget);
    if (target && !protectedIds.has(target.id) && !ROLES[target.role]?.flags.immuneToWWKill) {
      toKill.set(target.id, "werewolf");
    }
  }

  // Witch kill (unsaveable by Doctor)
  if (session.witchKillTarget) {
    const target = findAlive(session, session.witchKillTarget);
    if (target) toKill.set(target.id, "witch_kill");
  }

  // Serial Killer kill (unsaveable by Doctor)
  if (session.skKillTarget) {
    const target = findAlive(session, session.skKillTarget);
    if (target) toKill.set(target.id, "serial_killer");
  }

  // Bodyguard death
  if (bodyguardDied && bodyguardId) {
    toKill.set(bodyguardId, "bodyguard");
  }

  // ── Step 3: Elder extra life ──────────────────────────────────────────────

  for (const [targetId, cause] of Array.from(toKill.entries())) {
    if (cause === "werewolf") {
      const target = findAlive(session, targetId);
      if (target && ROLES[target.role]?.flags.isElder === true && target.hp > 1) {
        target.hp -= 1;
        toKill.delete(targetId);
        session.eventLog.push({
          id: uuidv4(),
          type: "elder_survived",
          round: session.round,
          timestamp: Date.now(),
          data: { playerId: targetId },
        });
      }
    }
  }

  // ── Step 4: Alpha conversion ──────────────────────────────────────────────

  for (const player of session.players) {
    if (
      player.isAlive &&
      ROLES[player.role]?.flags.isAlphaWerewolf === true &&
      !session.alphaConversionUsed
    ) {
      const action = player.nightAction;
      if (action?.type === "alpha_convert") {
        const target = findAlive(session, action.targetId);
        if (target && !ROLES[target.role]?.flags.isWerewolf) {
          target.role = RoleName.Werewolf;
          target.team = Team.WEREWOLF;
          alphaConversionTargetId = target.id;
          session.alphaConversionUsed = true;
          toKill.delete(action.targetId); // Conversion replaces kill
          session.eventLog.push({
            id: uuidv4(),
            type: "alpha_converted",
            round: session.round,
            timestamp: Date.now(),
            data: { targetId: target.id },
          });
        }
        break;
      }
    }
  }

  // ── Step 5: Seer & Sorceress results ─────────────────────────────────────

  for (const player of session.players) {
    if (!player.isAlive) continue;

    if (ROLES[player.role]?.flags.isSeer === true) {
      const action = player.nightAction;
      if (action?.type === "seer_investigate") {
        const target = session.players.find((p) => p.id === action.targetId);
        if (target) seerResults.set(player.id, roleSeenBySeer(target.role));
      }
    }

    if (ROLES[player.role]?.flags.isSorceress === true) {
      const action = player.nightAction;
      if (action?.type === "sorceress_investigate") {
        const target = session.players.find((p) => p.id === action.targetId);
        if (target) sorceressResults.set(action.targetId, ROLES[target.role]?.flags.isSeer === true);
      }
    }
  }

  // ── Step 6: Apply deaths ──────────────────────────────────────────────────

  const wwKillCountUsed = session.wwRageKillsRemaining > 0 ? session.wwRageKillsRemaining : 1;

  for (const [targetId, cause] of Array.from(toKill.entries())) {
    const target = findAlive(session, targetId);
    if (!target) continue;

    killPlayer(target, cause, session, deaths);
  }

  // Reset rage kills after they've been consumed this night
  if (session.wwRageKillsRemaining > 0) {
    session.wwRageKillsRemaining = Math.max(0, session.wwRageKillsRemaining - wwKillCountUsed);
  }

  // ── Step 7: Reset night state ─────────────────────────────────────────────

  session.wwKillTarget = null;
  session.doctorProtectTarget = null;
  session.bodyguardGuardTarget = null;
  session.witchHealedThisNight = false;
  session.witchKillTarget = null;
  session.skKillTarget = null;
  for (const p of session.players) {
    p.nightAction = null;
    p.voteTarget = null;
  }

  // ── Step 8: Win check ─────────────────────────────────────────────────────

  const winCheck = checkWinConditions(session.players);

  return { deaths, alphaConversionTargetId, seerResults, sorceressResults, winCheck };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function findAlive(session: Session, id: string): Player | undefined {
  return session.players.find((p) => p.id === id && p.isAlive);
}

function killPlayer(
  target: Player,
  cause: DeathRecord["cause"],
  session: Session,
  deaths: DeathRecord[]
): void {
  if (!target.isAlive) return;
  target.isAlive = false;

  deaths.push({
    playerId: target.id,
    playerName: target.name,
    role: target.role,
    cause,
    round: session.round,
  });

  session.eventLog.push({
    id: uuidv4(),
    type: "player_killed_night",
    round: session.round,
    timestamp: Date.now(),
    data: { playerId: target.id, cause },
  });

  // WolfCub rage: if killed by WW (or witch), pack gets 2 kills next night
  if (ROLES[target.role]?.flags.isWolfCub === true && (cause === "werewolf" || cause === "witch_kill")) {
    session.wwRageKillsRemaining = 2;
  }

  // Lover chain death
  const loverId = getLoverChainDeathId(target.id, session.players);
  if (loverId) {
    const lover = session.players.find((p) => p.id === loverId && p.isAlive);
    if (lover) {
      lover.isAlive = false;
      deaths.push({
        playerId: lover.id,
        playerName: lover.name,
        role: lover.role,
        cause: "lover_chain",
        round: session.round,
      });
      session.eventLog.push({
        id: uuidv4(),
        type: "lover_chain_death",
        round: session.round,
        timestamp: Date.now(),
        data: { playerId: lover.id, triggeredBy: target.id },
      });
      if (ROLES[lover.role]?.flags.isWolfCub === true) {
        session.wwRageKillsRemaining = 2;
      }
    }
  }
}
