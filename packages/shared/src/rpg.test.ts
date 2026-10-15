import { describe, it, expect } from "vitest";
import {
  LocalSnapshotSchema,
  CONFIG_VERSION,
  newLoopState,
  applyRpgCommand,
  createEquipment,
  heroStats,
  gearStats,
  startEncounter,
  advanceCombat,
  produce,
  floorDefinition,
  FLOOR_CATALOG,
  rollRarity,
  RARITY,
  awardRpgDeath,
  buyUpgrade,
  type LocalSnapshot,
} from "./index.js";
const create = (): LocalSnapshot =>
  LocalSnapshotSchema.parse({
    ...newLoopState(),
    schemaVersion: 3,
    configVersion: CONFIG_VERSION,
    mode: "local",
    generation: 0,
    savedAt: 0,
    lastReconciledAt: 0,
    profile: { id: "local-test", name: "Teste" },
    screen: "battle",
    activeMs: 0,
    balances: {
      coin: "100000000000",
      iron: "100000000000",
      coal: "100000000000",
      gold: "100000000000",
      jade: "100000000000",
      ruby: "0",
    },
  });
describe("RPG equipment and atomic commands", () => {
  it("crafts a unique instance, equips real stats, preserves HP without equipment healing, rejects double equipment and two hand conflicts", () => {
    const s = create();
    expect(
      applyRpgCommand(s, { type: "craft", definitionId: "sword", level: 1 }),
    ).toBe(true);
    expect(s.balances.iron).toBe("99999970000");
    const sword = s.rpg.inventory[0]!;
    expect(
      applyRpgCommand(s, { type: "equip", id: sword.id, slot: "weapon" }),
    ).toBe(true);
    expect(heroStats(s).attack).toBeGreaterThan(6);
    expect(
      applyRpgCommand(s, { type: "equip", id: sword.id, slot: "shield" }),
    ).toBe(false);
    applyRpgCommand(s, { type: "craft", definitionId: "shield", level: 1 });
    const shield = s.rpg.inventory[1]!;
    applyRpgCommand(s, { type: "equip", id: shield.id, slot: "shield" });
    applyRpgCommand(s, { type: "craft", definitionId: "greatsword", level: 1 });
    const heavy = s.rpg.inventory[2]!;
    const before = structuredClone(s);
    expect(
      applyRpgCommand(s, { type: "equip", id: heavy.id, slot: "weapon" }),
    ).toBe(false);
    expect(s).toEqual(before);
    applyRpgCommand(s, { type: "unequip", slot: "shield" });
    expect(
      applyRpgCommand(s, { type: "equip", id: heavy.id, slot: "weapon" }),
    ).toBe(true);
    expect(
      applyRpgCommand(s, { type: "equip", id: shield.id, slot: "shield" }),
    ).toBe(false);
    expect(applyRpgCommand(s, { type: "salvage", id: heavy.id })).toBe(false);
    expect(s.battle.heroHp).toBe(100);
  });
  it("requires distinct rings, capacity120, sufficient resources and warrior/tower level", () => {
    const s = create();
    applyRpgCommand(s, { type: "craft", definitionId: "ring", level: 1 });
    const ring = s.rpg.inventory[0]!;
    expect(
      applyRpgCommand(s, { type: "equip", id: ring.id, slot: "ring1" }),
    ).toBe(true);
    expect(
      applyRpgCommand(s, { type: "equip", id: ring.id, slot: "ring2" }),
    ).toBe(false);
    expect(
      applyRpgCommand(s, { type: "craft", definitionId: "armor", level: 2 }),
    ).toBe(false);
    while (s.rpg.inventory.length < 120)
      s.rpg.inventory.push(createEquipment(s, "sword", 1, "common"));
    const before = structuredClone(s);
    expect(
      applyRpgCommand(s, { type: "craft", definitionId: "sword", level: 1 }),
    ).toBe(false);
    expect(s).toEqual(before);
    s.rpg.inventory = [];
    s.rpg.equipped.ring1 = null;
    s.balances.coin = "0";
    const empty = structuredClone(s);
    expect(
      applyRpgCommand(s, { type: "craft", definitionId: "sword", level: 1 }),
    ).toBe(false);
    expect(s).toEqual(empty);
  });
  it("smelts, enhances without reroll, and salvages only unreserved equipment", () => {
    const s = create();
    expect(applyRpgCommand(s, { type: "smelt" })).toBe(true);
    expect(s.rpg.castIron).toBe("1000");
    applyRpgCommand(s, { type: "craft", definitionId: "sword", level: 1 });
    const item = s.rpg.inventory[0]!,
      attributes = structuredClone(item.attributes),
      rng = s.rpg.rng;
    expect(applyRpgCommand(s, { type: "enhance", id: item.id })).toBe(true);
    expect(item.enhancement).toBe(1);
    expect(item.attributes).toEqual(attributes);
    expect(s.rpg.rng).toBe(rng);
    s.rpg.equipped.weapon = item.id;
    expect(gearStats(s).attack).toBeGreaterThan(item.attributes.attack);
    s.rpg.equipped.weapon = null;
    const iron = BigInt(s.balances.iron);
    expect(applyRpgCommand(s, { type: "salvage", id: item.id })).toBe(true);
    expect(BigInt(s.balances.iron) - iron).toBe(10000n);
    expect(s.rpg.inventory).toHaveLength(0);
  });
  it("rejects dangling/duplicate equipment and does not resurrect a defeated hero on vitality purchase", () => {
    const s = create();
    s.rpg.equipped.weapon = "item-9";
    expect(LocalSnapshotSchema.safeParse(s).success).toBe(false);
    s.rpg.equipped.weapon = null;
    s.battle.heroHp = 0;
    s.battle.phase = "failed";
    expect(buyUpgrade(s, "vitality")).toBe(true);
    expect(s.battle.heroHp).toBe(0);
  });
});
describe("rare drops and persistence-ready RNG", () => {
  it("uses exact conditional rarity bins, real affixes and immutable rolled attributes", () => {
    const counts = Object.fromEntries(Object.keys(RARITY).map((k) => [k, 0]));
    for (let r = 0; r < 10000; r++) counts[rollRarity(true, r)]!++;
    expect(counts).toEqual({
      common: 5000,
      uncommon: 3200,
      rare: 1500,
      epic: 280,
      legendary: 20,
    });
    const s = create(),
      rare = createEquipment(s, "sword", 10, "legendary");
    expect(rare.affixes).toHaveLength(4);
    expect(new Set(rare.affixes).size).toBe(4);
    expect(rare.attributes.attack).toBeGreaterThan(1000);
  });
  it("does not reroll an already dead target, preserves RNG state across snapshot clones, and converts overflow without growing the bag", () => {
    const s = create();
    s.battle.enemies[0]!.hp = 1;
    advanceCombat(s, 1000);
    const restored = LocalSnapshotSchema.parse(structuredClone(s));
    const rng = restored.rpg.rng;
    advanceCombat(restored, 0);
    expect(restored.rpg.rng).toBe(rng);
    while (s.rpg.inventory.length < 120)
      s.rpg.inventory.push(createEquipment(s, "sword", 1, "common"));
    const iron = BigInt(s.balances.iron);
    for (let i = 0; i < 1000; i++) awardRpgDeath(s, 10, true);
    expect(s.rpg.inventory).toHaveLength(120);
    expect(BigInt(s.balances.iron)).toBeGreaterThan(iron);
    expect(s.rpg.lastLoot).toContain("Mochila cheia");
  });
  it("matches common0.5% and boss10% within conservative deterministic statistical tolerances", () => {
    for (const [boss, min, max] of [
      [false, 800, 1200],
      [true, 19000, 21000],
    ] as const) {
      const s = create();
      for (let i = 0; i < 200000; i++) awardRpgDeath(s, boss ? 10 : 1, boss);
      expect(s.rpg.lootSerial).toBeGreaterThan(min);
      expect(s.rpg.lootSerial).toBeLessThan(max);
    }
  });
});
describe("advanced mines, pet and expiring buffs", () => {
  it("gold requires coal50 even with funds; jade pays iron/coal/gold/coin; pet active changes rates", () => {
    const s = create();
    const before = structuredClone(s);
    expect(applyRpgCommand(s, { type: "mine", mine: "gold" })).toBe(false);
    expect(s).toEqual(before);
    s.upgrades.coal = 50;
    expect(applyRpgCommand(s, { type: "mine", mine: "gold" })).toBe(true);
    expect(applyRpgCommand(s, { type: "mine", mine: "jade" })).toBe(true);
    expect(applyRpgCommand(s, { type: "adoptPet" })).toBe(true);
    expect(applyRpgCommand(s, { type: "adoptPet" })).toBe(false);
    const c = BigInt(s.balances.coal),
      g = BigInt(s.balances.gold),
      j = BigInt(s.balances.jade);
    produce(s, 100000);
    expect(BigInt(s.balances.coal) - c).toBe(510000n);
    expect(BigInt(s.balances.gold) - g).toBe(2040n);
    expect(BigInt(s.balances.jade) - j).toBe(510n);
  });
  it("segments production buff expiry exactly;10000 fragments equal one interval including all remainders", () => {
    const s = create();
    s.upgrades.coal = 1;
    s.rpg.goldLevel = 1;
    s.rpg.jadeLevel = 1;
    s.rpg.petLevel = 1;
    s.rpg.petActive = true;
    s.rpg.productionBuffUntil = 2345;
    const one = structuredClone(s);
    produce(one, 10000);
    for (let i = 0; i < 10000; i++) {
      s.lastReconciledAt = i;
      produce(s, 1);
    }
    s.lastReconciledAt = 0;
    expect(s).toEqual(one);
    expect(BigInt(s.balances.coal) - 100000000000n).toBe(1079n);
  });
  it("tonics debit once, reject same-type stacking, and expiration wins an attack tie", () => {
    const s = create();
    expect(applyRpgCommand(s, { type: "attackTonic" })).toBe(true);
    const before = structuredClone(s);
    expect(applyRpgCommand(s, { type: "attackTonic" })).toBe(false);
    expect(s).toEqual(before);
    s.rpg.attackBuffUntil = 1000;
    s.battle.enemies[0]!.hp = 100;
    advanceCombat(s, 1000);
    expect(s.battle.enemies[0]!.hp).toBe(94);
  });
});
describe("content1–1000 bounds", () => {
  it("contains1000 valid definitions with3×3 or single boss and finite costs/attributes", () => {
    expect(FLOOR_CATALOG).toHaveLength(1000);
    for (const d of FLOOR_CATALOG) {
      expect(d.waves * d.count).toBe(d.boss ? 1 : 9);
      for (const n of [d.hp, d.attack, d.coin])
        expect(Number.isSafeInteger(n) && n > 0).toBe(true);
    }
    expect(() => floorDefinition(1001)).toThrow();
    expect(floorDefinition(20).hp).toBe(1248);
  });
  it("can complete the1000th boss with bounded endgame gear without overflow or reward replay", () => {
    const s = create();
    s.battle.highest = 999;
    s.rpg.heroXp = 100000000;
    s.upgrades.attack = 1000;
    s.upgrades.vitality = 1000;
    const sword = createEquipment(s, "greatsword", 100, "legendary");
    sword.enhancement = 20;
    s.rpg.inventory.push(sword);
    s.rpg.equipped.weapon = sword.id;
    s.battle.heroHp = heroStats(s).hp;
    startEncounter(s, 1000);
    advanceCombat(s, 30000);
    expect(s.battle.phase).toBe("complete");
    const coins = s.balances.coin;
    advanceCombat(s, 100000);
    expect(s.balances.coin).toBe(coins);
    expect(LocalSnapshotSchema.safeParse(s).success).toBe(true);
  });
});
