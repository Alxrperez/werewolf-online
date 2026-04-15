import { describe, it, expect } from "vitest";
import {
  checkWinConditions,
  checkVillageWin,
  checkWerewolfWin,
  checkSerialKillerWin,
  checkLoversWin,
  checkTannerWin,
  getLoverChainDeathId,
} from "./win-conditions.js";
import { Player, RoleName, Team, WinReason } from "./types.js";

function makePlayer(
  id: string,
  role: RoleName,
  team: Team,
  isAlive = true,
  loverId: string | null = null
): Player {
  return {
    id,
    name: id,
    color: "#fff",
    colorName: "White",
    role,
    team,
    isAlive,
    isConnected: true,
    isReady: true,
    voteTarget: null,
    nightAction: null,
    joinedAt: Date.now(),
    hp: role === RoleName.Elder ? 2 : 1,
    hasVotingRights: true,
    loverId,
    isLoverWin: false,
  };
}

describe("checkVillageWin", () => {
  it("returns win when all wolves are dead and no SK", () => {
    const players = [
      makePlayer("v1", RoleName.Villager, Team.VILLAGE),
      makePlayer("v2", RoleName.Seer, Team.VILLAGE),
      makePlayer("ww1", RoleName.Werewolf, Team.WEREWOLF, false),
    ];
    const result = checkVillageWin(players);
    expect(result.hasWinner).toBe(true);
    expect(result.winner).toBe(Team.VILLAGE);
    expect(result.winReason).toBe(WinReason.AllWerewolvesDead);
  });

  it("does not win when SK is still alive", () => {
    const players = [
      makePlayer("v1", RoleName.Villager, Team.VILLAGE),
      makePlayer("ww1", RoleName.Werewolf, Team.WEREWOLF, false),
      makePlayer("sk1", RoleName.SerialKiller, Team.NEUTRAL),
    ];
    const result = checkVillageWin(players);
    expect(result.hasWinner).toBe(false);
  });

  it("does not win when wolves are still alive", () => {
    const players = [
      makePlayer("v1", RoleName.Villager, Team.VILLAGE),
      makePlayer("ww1", RoleName.Werewolf, Team.WEREWOLF),
    ];
    const result = checkVillageWin(players);
    expect(result.hasWinner).toBe(false);
  });
});

describe("checkWerewolfWin", () => {
  it("wins when wolves >= villagers and no SK", () => {
    const players = [
      makePlayer("ww1", RoleName.Werewolf, Team.WEREWOLF),
      makePlayer("v1", RoleName.Villager, Team.VILLAGE),
    ];
    const result = checkWerewolfWin(players);
    expect(result.hasWinner).toBe(true);
    expect(result.winner).toBe(Team.WEREWOLF);
    expect(result.winReason).toBe(WinReason.WerewolvesOutnumber);
  });

  it("does not win when SK is alive", () => {
    const players = [
      makePlayer("ww1", RoleName.Werewolf, Team.WEREWOLF),
      makePlayer("v1", RoleName.Villager, Team.VILLAGE),
      makePlayer("sk1", RoleName.SerialKiller, Team.NEUTRAL),
    ];
    const result = checkWerewolfWin(players);
    expect(result.hasWinner).toBe(false);
  });

  it("does not win when wolves < villagers", () => {
    const players = [
      makePlayer("ww1", RoleName.Werewolf, Team.WEREWOLF),
      makePlayer("v1", RoleName.Villager, Team.VILLAGE),
      makePlayer("v2", RoleName.Seer, Team.VILLAGE),
    ];
    const result = checkWerewolfWin(players);
    expect(result.hasWinner).toBe(false);
  });

  it("does not win when no wolves are alive", () => {
    const players = [
      makePlayer("ww1", RoleName.Werewolf, Team.WEREWOLF, false),
      makePlayer("v1", RoleName.Villager, Team.VILLAGE),
    ];
    const result = checkWerewolfWin(players);
    expect(result.hasWinner).toBe(false);
  });
});

describe("checkSerialKillerWin", () => {
  it("wins when SK is the only player alive", () => {
    const players = [
      makePlayer("sk1", RoleName.SerialKiller, Team.NEUTRAL),
      makePlayer("v1", RoleName.Villager, Team.VILLAGE, false),
    ];
    const result = checkSerialKillerWin(players);
    expect(result.hasWinner).toBe(true);
    expect(result.winner).toBe("SERIAL_KILLER");
    expect(result.winReason).toBe(WinReason.SerialKillerLast);
    expect(result.winningPlayerIds).toContain("sk1");
  });

  it("does not win when other players are still alive", () => {
    const players = [
      makePlayer("sk1", RoleName.SerialKiller, Team.NEUTRAL),
      makePlayer("v1", RoleName.Villager, Team.VILLAGE),
    ];
    const result = checkSerialKillerWin(players);
    expect(result.hasWinner).toBe(false);
  });
});

describe("checkLoversWin", () => {
  it("wins when cross-team lovers are the last 2 alive", () => {
    const players = [
      makePlayer("v1", RoleName.Villager, Team.VILLAGE, true, "ww1"),
      makePlayer("ww1", RoleName.Werewolf, Team.WEREWOLF, true, "v1"),
      makePlayer("v2", RoleName.Seer, Team.VILLAGE, false),
    ];
    const result = checkLoversWin(players);
    expect(result.hasWinner).toBe(true);
    expect(result.winner).toBe("LOVERS");
    expect(result.winReason).toBe(WinReason.LoversLast);
    expect(result.winningPlayerIds).toContain("v1");
    expect(result.winningPlayerIds).toContain("ww1");
  });

  it("does not win when lovers are same team", () => {
    const players = [
      makePlayer("v1", RoleName.Villager, Team.VILLAGE, true, "v2"),
      makePlayer("v2", RoleName.Seer, Team.VILLAGE, true, "v1"),
    ];
    const result = checkLoversWin(players);
    expect(result.hasWinner).toBe(false);
  });

  it("does not win when more than 2 alive", () => {
    const players = [
      makePlayer("v1", RoleName.Villager, Team.VILLAGE, true, "ww1"),
      makePlayer("ww1", RoleName.Werewolf, Team.WEREWOLF, true, "v1"),
      makePlayer("v2", RoleName.Seer, Team.VILLAGE),
    ];
    const result = checkLoversWin(players);
    expect(result.hasWinner).toBe(false);
  });
});

describe("checkTannerWin", () => {
  it("wins when Tanner is the lynch target", () => {
    const players = [makePlayer("t1", RoleName.Tanner, Team.NEUTRAL)];
    const result = checkTannerWin("t1", players);
    expect(result.hasWinner).toBe(true);
    expect(result.winner).toBe("TANNER");
    expect(result.winReason).toBe(WinReason.TannerLynched);
  });

  it("does not trigger for non-Tanner players", () => {
    const players = [makePlayer("v1", RoleName.Villager, Team.VILLAGE)];
    const result = checkTannerWin("v1", players);
    expect(result.hasWinner).toBe(false);
  });
});

describe("checkWinConditions priority", () => {
  it("SK wins over village when both conditions could apply", () => {
    // Only SK alive
    const players = [
      makePlayer("sk1", RoleName.SerialKiller, Team.NEUTRAL),
      makePlayer("ww1", RoleName.Werewolf, Team.WEREWOLF, false),
    ];
    const result = checkWinConditions(players);
    expect(result.winner).toBe("SERIAL_KILLER");
  });
});

describe("getLoverChainDeathId", () => {
  it("returns lover's id when a lover dies", () => {
    const players = [
      makePlayer("v1", RoleName.Villager, Team.VILLAGE, false, "ww1"),
      makePlayer("ww1", RoleName.Werewolf, Team.WEREWOLF, true, "v1"),
    ];
    expect(getLoverChainDeathId("v1", players)).toBe("ww1");
  });

  it("returns null when the lover is already dead", () => {
    const players = [
      makePlayer("v1", RoleName.Villager, Team.VILLAGE, false, "ww1"),
      makePlayer("ww1", RoleName.Werewolf, Team.WEREWOLF, false, "v1"),
    ];
    expect(getLoverChainDeathId("v1", players)).toBeNull();
  });

  it("returns null when player has no lover", () => {
    const players = [makePlayer("v1", RoleName.Villager, Team.VILLAGE, false)];
    expect(getLoverChainDeathId("v1", players)).toBeNull();
  });
});
