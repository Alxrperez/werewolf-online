import { RoleName, Team } from "./types.js";

export interface RoleDefinition {
  name: RoleName;
  team: Team;
  /** Lower number = wakes earlier. null = passive (no night wake). */
  wakeOrder: number | null;
  description: string;
  shortDescription: string;
  flags: {
    isWerewolf?: boolean;
    isSeer?: boolean;
    isDoctor?: boolean;
    isHunter?: boolean;
    isWitch?: boolean;
    isCupid?: boolean;
    isMason?: boolean;
    isLittleGirl?: boolean;
    isElder?: boolean;
    isVillageIdiot?: boolean;
    isBodyguard?: boolean;
    isSorceress?: boolean;
    isSerialKiller?: boolean;
    isTanner?: boolean;
    isJester?: boolean;
    isAlphaWerewolf?: boolean;
    isWolfCub?: boolean;
    appearsAsVillagerToSeer?: boolean;
    immuneToWWKill?: boolean;
    immuneToDoctorSave?: boolean;
  };
}

export const ROLES: Record<RoleName, RoleDefinition> = {
  // ── Werewolf Team ─────────────────────────────────────────────────────────
  [RoleName.Werewolf]: {
    name: RoleName.Werewolf,
    team: Team.WEREWOLF,
    wakeOrder: 20,
    shortDescription: "Kill one villager each night.",
    description:
      "You wake with your pack each night to choose one villager to eliminate. You know who all your fellow werewolves are. Blend in during the day — convince the village to lynch an innocent.",
    flags: { isWerewolf: true },
  },
  [RoleName.AlphaWerewolf]: {
    name: RoleName.AlphaWerewolf,
    team: Team.WEREWOLF,
    wakeOrder: 20,
    shortDescription: "Once per game: convert a target into a Werewolf.",
    description:
      "You wake with your pack each night. Once per game, instead of killing a target you may convert them into a Werewolf — they will be notified and join your side immediately.",
    flags: { isWerewolf: true, isAlphaWerewolf: true },
  },
  [RoleName.WolfCub]: {
    name: RoleName.WolfCub,
    team: Team.WEREWOLF,
    wakeOrder: 20,
    shortDescription: "If killed, pack gets 2 kills next night.",
    description:
      "You wake with your pack each night. If you are killed (day or night), your pack's grief fuels a rage — they get two kills on the following night. You appear as a Villager to the Seer.",
    flags: { isWerewolf: true, isWolfCub: true, appearsAsVillagerToSeer: true },
  },
  [RoleName.Sorceress]: {
    name: RoleName.Sorceress,
    team: Team.WEREWOLF,
    wakeOrder: 25,
    shortDescription: "Nightly: check if a player is the Seer.",
    description:
      "You are aligned with the Werewolves but wake alone after them. Each night you choose one player and learn whether or not they are the Seer. Report your findings to the wolves during the day.",
    flags: { isSorceress: true },
  },

  // ── Village Team ──────────────────────────────────────────────────────────
  [RoleName.Villager]: {
    name: RoleName.Villager,
    team: Team.VILLAGE,
    wakeOrder: null,
    shortDescription: "No special ability — use your wits.",
    description:
      "You are an ordinary villager. You have no special power, but your vote and deduction matter. Work with the village to identify and eliminate all Werewolves.",
    flags: {},
  },
  [RoleName.Seer]: {
    name: RoleName.Seer,
    team: Team.VILLAGE,
    wakeOrder: 30,
    shortDescription: "Nightly: learn a player's exact role.",
    description:
      "Each night you wake and choose one player to investigate. The moderator reveals their exact role. Use this information wisely — revealing yourself too soon makes you a target.",
    flags: { isSeer: true },
  },
  [RoleName.Doctor]: {
    name: RoleName.Doctor,
    team: Team.VILLAGE,
    wakeOrder: 40,
    shortDescription: "Nightly: protect one player from elimination.",
    description:
      "Each night you may protect one player from the werewolves' attack. You cannot protect the same player two nights in a row. You may protect yourself.",
    flags: { isDoctor: true },
  },
  [RoleName.Bodyguard]: {
    name: RoleName.Bodyguard,
    team: Team.VILLAGE,
    wakeOrder: 41,
    shortDescription: "Nightly: guard a player — absorb their fatal attack.",
    description:
      "Each night you guard one player. If the werewolves target them, you absorb the kill instead — you die, they live. You cannot guard the same player two nights in a row, and you cannot guard yourself.",
    flags: { isBodyguard: true },
  },
  [RoleName.Hunter]: {
    name: RoleName.Hunter,
    team: Team.VILLAGE,
    wakeOrder: null,
    shortDescription: "On death: immediately eliminate one player.",
    description:
      "When you die (by any means — night kill or day lynch), you immediately fire your last shot, eliminating one player of your choice. Choose wisely.",
    flags: { isHunter: true },
  },
  [RoleName.Witch]: {
    name: RoleName.Witch,
    team: Team.VILLAGE,
    wakeOrder: 50,
    shortDescription: "Two single-use potions: heal or kill.",
    description:
      "Each night you wake and learn who the werewolves targeted. You have two single-use potions: a Heal potion (saves the WW target) and a Kill potion (eliminates any player). You may use one, both, or neither each night.",
    flags: { isWitch: true },
  },
  [RoleName.Cupid]: {
    name: RoleName.Cupid,
    team: Team.VILLAGE,
    wakeOrder: 5,
    shortDescription: "Night 1 only: link two players as Lovers.",
    description:
      "On the first night only, you choose two players to link as Lovers. They wake up and learn each other's identity. If one Lover dies, the other dies of heartbreak immediately. Cross-team Lovers become a third faction — they win only if they are the last two players alive.",
    flags: { isCupid: true },
  },
  [RoleName.LittleGirl]: {
    name: RoleName.LittleGirl,
    team: Team.VILLAGE,
    wakeOrder: null,
    shortDescription: "Peek during WW wake — but risk getting caught.",
    description:
      "During the werewolves' wake phase, you may peek. The server reveals the color of the werewolves' target. However, the werewolves can check for peekers — if caught, you are killed instead of their original target.",
    flags: { isLittleGirl: true },
  },
  [RoleName.Elder]: {
    name: RoleName.Elder,
    team: Team.VILLAGE,
    wakeOrder: null,
    shortDescription: "Survives the first WW attack; if lynched, village loses special powers.",
    description:
      "You can survive the first werewolf attack (you have 2 HP against wolves). However, if the village lynches you, all special Village roles lose their powers for the rest of the game.",
    flags: { isElder: true },
  },
  [RoleName.VillageIdiot]: {
    name: RoleName.VillageIdiot,
    team: Team.VILLAGE,
    wakeOrder: null,
    shortDescription: "If voted to lynch: revealed, survives, loses vote.",
    description:
      "If the village votes to lynch you, your role is revealed and you survive — but you permanently lose your voting rights. The village wasted a vote; choose your target more carefully.",
    flags: { isVillageIdiot: true },
  },
  [RoleName.Mason]: {
    name: RoleName.Mason,
    team: Team.VILLAGE,
    wakeOrder: 8,
    shortDescription: "Night 1: Masons recognize each other.",
    description:
      "On the first night, all Masons open their eyes and see each other. You know with certainty who your fellow Masons are — trusted allies for the rest of the game.",
    flags: { isMason: true },
  },

  // ── Neutral / Third-Party ─────────────────────────────────────────────────
  [RoleName.Tanner]: {
    name: RoleName.Tanner,
    team: Team.NEUTRAL,
    wakeOrder: null,
    shortDescription: "Win only if lynched by the village.",
    description:
      "You are the tanner — you hate your job so much you want to die. You win only if the village votes to lynch you during the day. A night kill gives you no satisfaction. Try to make yourself look suspicious.",
    flags: { isTanner: true },
  },
  [RoleName.SerialKiller]: {
    name: RoleName.SerialKiller,
    team: Team.NEUTRAL,
    wakeOrder: 55,
    shortDescription: "Nightly solo kill; immune to WW; wins alone.",
    description:
      "Each night you choose one player to kill. The werewolves cannot kill you. The Doctor cannot save your victims. You win if you are the last player standing.",
    flags: { isSerialKiller: true, immuneToWWKill: true, immuneToDoctorSave: true },
  },
  [RoleName.Jester]: {
    name: RoleName.Jester,
    team: Team.NEUTRAL,
    wakeOrder: null,
    shortDescription: "If lynched: game continues and your initiator also dies.",
    description:
      "You win if the village votes to lynch you. When lynched, the game continues — but the player who first accused you also dies. You win alongside the ultimate winner.",
    flags: { isJester: true },
  },
};

/** Returns roles that wake during the night, sorted by wake order. */
export function getNightWakeOrder(): RoleDefinition[] {
  return Object.values(ROLES)
    .filter((r) => r.wakeOrder !== null)
    .sort((a, b) => (a.wakeOrder as number) - (b.wakeOrder as number));
}

/** Returns true if a role is on the werewolf team. */
export function isWerewolfTeam(role: RoleName): boolean {
  return ROLES[role]?.team === Team.WEREWOLF;
}

/** Returns the role as seen by the Seer (Wolf Cub appears as Villager). */
export function roleSeenBySeer(role: RoleName): RoleName {
  if (ROLES[role]?.flags.appearsAsVillagerToSeer) return RoleName.Villager;
  return role;
}
