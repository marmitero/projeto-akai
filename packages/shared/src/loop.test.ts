import { describe, it, expect } from "vitest";
import {
  newLoopState,
  LocalSnapshotSchema,
  CONFIG_VERSION,
  advanceCombat,
  startEncounter,
  retryBattle,
  mineIron,
  buyUpgrade,
  upgradeCost,
  produce,
  heroStats,
} from "./index.js";
const create = () =>
  LocalSnapshotSchema.parse({
    ...newLoopState(),
    schemaVersion: 3,
    configVersion: CONFIG_VERSION,
    mode: "local",
    generation: 0,
    savedAt: 0,
    profile: { id: "local-test", name: "Teste" },
    screen: "battle",
    activeMs: 0,
    balances: {
      coin: "0",
      iron: "0",
      coal: "0",
      gold: "0",
      jade: "0",
      ruby: "0",
    },
  });
describe("deterministic local combat", () => {
  it("requires nine deaths in three waves, grants each death once and transitions for3s", () => {
    const s = create();
    s.upgrades.attack = 100;
    advanceCombat(s, 3000);
    expect(s.battle.phase).toBe("transition");
    expect(s.battle.wave).toBe(1);
    expect(s.balances.coin).toBe("9000");
    expect(s.battle.highest).toBe(0);
    advanceCombat(s, 2999);
    expect(s.battle.wave).toBe(1);
    expect(s.balances.coin).toBe("9000");
    advanceCombat(s, 1);
    expect(s.battle.wave).toBe(2);
    advanceCombat(s, 9000);
    expect(s.battle.wave).toBe(3);
    expect(s.balances.coin).toBe("27000");
    expect(s.battle.highest).toBe(1);
    const clone = structuredClone(s);
    advanceCombat(s, 500);
    advanceCombat(clone, 250);
    advanceCombat(clone, 250);
    expect(s).toEqual(clone);
  });
  it("hero wins attack ties against an enemy and no dead enemy attacks", () => {
    const s = create();
    s.battle.enemies.forEach((e) => {
      e.hp = 6;
      e.nextAt = 1000;
    });
    advanceCombat(s, 1000);
    expect(s.battle.heroHp).toBe(96);
    expect(s.balances.coin).toBe("3000");
  });
  it("boss deadline wins ties, returns to previous floor, manual retry creates a new attempt", () => {
    const s = create();
    startEncounter(s, 10);
    s.battle.heroHp = 1000;
    s.battle.enemies[0]!.nextAt = 999999;
    advanceCombat(s, 29000);
    s.battle.enemies[0]!.hp = 1;
    advanceCombat(s, 1000);
    expect(s.battle).toMatchObject({
      phase: "failed",
      failure: "timeout",
      floor: 9,
      retryFloor: 10,
    });
    expect(s.balances.coin).toBe("0");
    const id = s.battle.attempt;
    advanceCombat(s, 100000);
    expect(s.battle.attempt).toBe(id);
    expect(s.balances.coin).toBe("0");
    expect(retryBattle(s)).toBe(true);
    expect(s.battle).toMatchObject({
      floor: 10,
      wave: 1,
      attempt: id + 1,
      heroHp: 100,
    });
    expect(retryBattle(s)).toBe(false);
  });
  it("boss victory on another screen grants only one reward and floor20 completes", () => {
    const s = create();
    s.screen = "mine";
    s.upgrades.attack = 100;
    startEncounter(s, 1000);
    s.battle.enemies[0]!.hp = 1;
    advanceCombat(s, 1000);
    const balance = s.balances.coin;
    expect(BigInt(balance)).toBeGreaterThan(0n);
    expect(s.battle.highest).toBe(1000);
    advanceCombat(s, 100000);
    expect(s.battle.phase).toBe("complete");
    expect(s.balances.coin).toBe(balance);
  });
  it("common defeat does not expire or retry automatically", () => {
    const s = create();
    s.battle.heroHp = 1;
    advanceCombat(s, 2000);
    expect(s.battle).toMatchObject({
      phase: "failed",
      floor: 1,
      failure: "defeat",
    });
    advanceCombat(s, 999999);
    expect(s.battle.attempt).toBe(1);
    expect(retryBattle(s)).toBe(true);
    expect(s.battle.heroHp).toBe(100);
  });
});
describe("integer economy transactions", () => {
  it("ten initial clicks yield ten iron; upgrades debit exact costs; rejected purchases do not mutate", () => {
    const s = create();
    for (let i = 0; i < 10; i++) mineIron(s);
    expect(s.balances.iron).toBe("10000");
    const before = structuredClone(s);
    expect(buyUpgrade(s, "attack")).toBe(false);
    expect(s).toEqual(before);
    s.balances.iron = "1000000";
    s.balances.coin = "1000000";
    const cost = upgradeCost(s, "attack")!;
    expect(buyUpgrade(s, "attack")).toBe(true);
    expect(s.balances.iron).toBe(String(1000000 - cost.iron * 1000));
    expect(s.balances.coin).toBe(String(1000000 - cost.coin * 1000));
    expect(heroStats(s).attack).toBe(8);
    expect(buyUpgrade(s, "click")).toBe(true);
    const iron = BigInt(s.balances.iron);
    mineIron(s);
    expect(BigInt(s.balances.iron) - iron).toBe(2000n);
  });
  it("coal unlock debit and fractional production are independent of reconciliation frequency", () => {
    const s = create();
    s.balances.iron = "100000";
    s.balances.coin = "50000";
    expect(buyUpgrade(s, "coal")).toBe(true);
    expect(s.balances).toMatchObject({ coin: "0", iron: "0" });
    const one = structuredClone(s);
    produce(one, 12347);
    for (let i = 0; i < 12347; i++) produce(s, 1);
    expect(s).toEqual(one);
    expect(s.balances.coal).toBe("1234");
    expect(s.coalRemainder).toBe(28000000);
  });
  it("max levels reject, fractional and overflow balances fail safely", () => {
    const s = create();
    s.upgrades.attack = 1000;
    expect(upgradeCost(s, "attack")).toBeUndefined();
    expect(buyUpgrade(s, "attack")).toBe(false);
    s.balances.iron = "9".repeat(38);
    expect(() => mineIron(s)).toThrow("BALANCE_LIMIT");
  });
});

describe("manual boss training prevents a coin deadlock", () => {
  it("farms the previous floor only when requested, then stops before the boss", async () => {
    const { trainBattle } = await import("./index.js");
    const s = create();
    s.upgrades.attack = 100;
    startEncounter(s, 10);
    s.battle.heroHp = 1;
    advanceCombat(s, 1800);
    expect(s.battle.phase).toBe("failed");
    expect(trainBattle(s)).toBe(true);
    expect(s.battle).toMatchObject({
      floor: 9,
      training: true,
      retryFloor: 10,
    });
    advanceCombat(s, 30000);
    expect(s.battle).toMatchObject({
      floor: 9,
      phase: "failed",
      failure: "trained",
      training: false,
      retryFloor: 10,
    });
    const coins = s.balances.coin;
    advanceCombat(s, 100000);
    expect(s.balances.coin).toBe(coins);
    expect(retryBattle(s)).toBe(true);
    expect(s.battle.floor).toBe(10);
  });
});

describe("30 minute deterministic soak", () => {
  it("produces the same complete tower/rewards/fractions in one interval and18000 updates", () => {
    const s = create();
    s.upgrades.attack = 25;
    s.upgrades.vitality = 30;
    s.upgrades.coal = 3;
    const segmented = structuredClone(s);
    advanceCombat(s, 1800000);
    produce(s, 1800000);
    for (let i = 0; i < 18000; i++) {
      advanceCombat(segmented, 100);
      produce(segmented, 100);
    }
    expect(segmented).toEqual(s);
    expect(s.battle.highest).toBeGreaterThanOrEqual(20);
    expect(s.balances.coal).toBe("540000");
  });
});
