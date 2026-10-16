import { describe, it, expect } from "vitest";
import { createLocalSnapshot } from "../../../apps/client/src/local/session.js";
import {
  advanceCombat,
  startEncounter,
  retryBattle,
  mineIron,
  buyUpgrade,
  awardRpgDeath,
  LocalSnapshotSchema,
} from "./index.js";
import { recordBattleReport } from "./battle-journal.js";

describe("confirmed tower journal", () => {
  it("records only the actual battle rewards and one victory, never grants twice", () => {
    const s = createLocalSnapshot(0);
    s.upgrades.attack = 100;
    const coin = BigInt(s.balances.coin),
      xp = s.rpg.heroXp;
    advanceCombat(s, 3000, 0, () => 9999);
    const rewards = s.battle.reports.filter((r) => r.kind === "reward");
    expect(rewards).toHaveLength(3);
    expect(rewards.reduce((n, r) => n + BigInt(r.coin), 0n)).toBe(
      BigInt(s.balances.coin) - coin,
    );
    expect(rewards.reduce((n, r) => n + r.heroXp, 0)).toBe(s.rpg.heroXp - xp);
    expect(rewards.every((r) => r.loot === "")).toBe(true);
    expect(s.battle.reports.filter((r) => r.kind === "victory")).toHaveLength(
      1,
    );
    const serial = s.battle.reportSerial;
    advanceCombat(s, 1000, 3000, () => 9999);
    expect(s.battle.reportSerial).toBe(serial);
    const restored = LocalSnapshotSchema.parse(JSON.parse(JSON.stringify(s)));
    expect(restored.battle.reports).toEqual(s.battle.reports);
  });
  it("reports boosted XP and coins as committed, including confirmed loot", () => {
    const s = createLocalSnapshot(0);
    s.upgrades.attack = 100;
    advanceCombat(s, 1000, 0, () => 0, 20000, 10000, 20000);
    const r = s.battle.reports[0]!;
    expect(r.kind).toBe("reward");
    expect(r.heroXp).toBe(s.rpg.heroXp);
    expect(r.accountXp).toBe(s.rpg.accountXp);
    expect(r.coin).toBe(s.balances.coin);
    expect(r.loot).toBe(s.rpg.lastLoot);
    expect(r.loot.length).toBeGreaterThan(0);
  });
  it("reports actual iron conversion when the bag is full", () => {
    const s = createLocalSnapshot(0);
    for (let i = 0; i < 120; i++) awardRpgDeath(s, 1, false, () => 0);
    s.upgrades.attack = 100;
    const before = BigInt(s.balances.iron);
    advanceCombat(s, 1000, 0, () => 0);
    const report = s.battle.reports[0]!;
    expect(report.iron).toBe(String(BigInt(s.balances.iron) - before));
    expect(BigInt(report.iron)).toBeGreaterThan(0n);
    expect(report.loot).toContain("convertido em ferro");
  });
  it("records boss defeat before fallback changes the floor, once per attempt", () => {
    const s = createLocalSnapshot(0);
    startEncounter(s, 10);
    s.battle.heroHp = 1;
    s.battle.heroNextAt = 1000000;
    s.battle.enemies[0]!.nextAt = 1;
    advanceCombat(s, 1);
    expect(s.battle.floor).toBe(9);
    expect(s.battle.reports).toMatchObject([{ kind: "defeat", floor: 10 }]);
    advanceCombat(s, 1000);
    expect(s.battle.reports).toHaveLength(1);
    expect(retryBattle(s)).toBe(true);
    expect(s.battle.reports).toHaveLength(1);
    expect(s.battle.reports[0]!.coin).toBe("0");
  });
  it("records timeout, without XP or fabricated loot", () => {
    const s = createLocalSnapshot(0);
    startEncounter(s, 10);
    s.battle.heroNextAt = 1000000;
    s.battle.enemies[0]!.nextAt = 1000000;
    advanceCombat(s, 30000);
    expect(s.battle.reports).toMatchObject([
      { kind: "timeout", floor: 10, heroXp: 0, loot: "" },
    ]);
  });
  it("bounds persisted history and ignores mining and upgrade balance changes", () => {
    const s = createLocalSnapshot(0);
    s.screen = "mine";
    s.balances.coin = s.balances.iron = "1000000";
    mineIron(s);
    buyUpgrade(s, "attack");
    expect(s.battle.reports).toEqual([]);
    for (let i = 0; i < 75; i++) recordBattleReport(s, "victory");
    expect(s.battle.reports).toHaveLength(60);
    expect(s.battle.reports[0]!.id).toBe(16);
    expect(s.battle.reportSerial).toBe(75);
    expect(LocalSnapshotSchema.parse(s).battle.reports).toHaveLength(60);
  });
  it("loads a pre-journal save without reconstructing old rewards", () => {
    const raw = JSON.parse(JSON.stringify(createLocalSnapshot(0)));
    delete raw.battle.reports;
    delete raw.battle.reportSerial;
    const s = LocalSnapshotSchema.parse(raw);
    expect(s.battle.reports).toEqual([]);
    expect(s.battle.reportSerial).toBe(0);
    expect(s.balances).toEqual(raw.balances);
  });
});
