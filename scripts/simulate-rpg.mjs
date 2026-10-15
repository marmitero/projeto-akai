import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import {
  LocalSnapshotSchema,
  newLoopState,
  CONFIG_VERSION,
  FLOOR_CATALOG,
  createEquipment,
  heroStats,
  advanceCombat,
  awardRpgDeath,
  rollRarity,
  RARITY,
} from "../packages/shared/dist/index.js";
const create = () =>
  LocalSnapshotSchema.parse({
    ...newLoopState(),
    schemaVersion: 3,
    configVersion: CONFIG_VERSION,
    mode: "local",
    generation: 0,
    savedAt: 0,
    lastReconciledAt: 0,
    profile: { id: "local-test", name: "Simulation" },
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
const drops = [];
for (const boss of [false, true]) {
  const s = create();
  for (let i = 0; i < 200000; i++) awardRpgDeath(s, boss ? 10 : 1, boss);
  drops.push({
    source: boss ? "boss10" : "common1",
    attempts: 200000,
    drops: s.rpg.lootSerial,
    observedPercent: s.rpg.lootSerial / 2000,
    expectedPercent: boss ? 10 : 0.5,
  });
}
const rarityCounts = Object.fromEntries(Object.keys(RARITY).map((k) => [k, 0]));
for (let i = 0; i < 10000; i++) rarityCounts[rollRarity(true, i)]++;
const end = create();
end.rpg.heroXp = 100000000;
end.upgrades.attack = 1000;
end.upgrades.vitality = 1000;
const weapon = createEquipment(end, "greatsword", 100, "legendary");
weapon.enhancement = 20;
end.rpg.inventory.push(weapon);
end.rpg.equipped.weapon = weapon.id;
end.battle.heroHp = heroStats(end).hp;
const initialStats = heroStats(end);
advanceCombat(end, 36000000);
assert.equal(end.battle.phase, "complete");
assert.equal(end.battle.highest, 1000);
assert.ok(LocalSnapshotSchema.safeParse(end).success);
assert.ok(drops[0].drops > 800 && drops[0].drops < 1200);
assert.ok(drops[1].drops > 19000 && drops[1].drops < 21000);
const report = {
  configVersion: CONFIG_VERSION,
  definitions: FLOOR_CATALOG.length,
  maxEnemyHp: Math.max(...FLOOR_CATALOG.map((d) => d.hp)),
  maxEnemyAttack: Math.max(...FLOOR_CATALOG.map((d) => d.attack)),
  maxCoinPerEnemy: Math.max(...FLOOR_CATALOG.map((d) => d.coin)),
  drops,
  conditionalBoss10RarityCounts: rarityCounts,
  fullTowerFixture: {
    note: "Max-level/XP and legendary enhanced weapon fixture; validates all1000 schedules/numeric bounds, not organic player progression or commercial balance.",
    initialStats,
    simulationMs: 36000000,
    highest: end.battle.highest,
    phase: end.battle.phase,
    heroStrikes: end.battle.heroStrikes,
    inventoryItems: end.rpg.inventory.length,
    balances: end.balances,
  },
};
console.log(JSON.stringify(report, null, 2));
if (process.argv.includes("--write"))
  await writeFile(
    new URL("../docs/phase4-rpg-results.json", import.meta.url),
    JSON.stringify(report, null, 2) + "\n",
  );
