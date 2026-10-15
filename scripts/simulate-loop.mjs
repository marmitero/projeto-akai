import {
  newLoopState,
  LocalSnapshotSchema,
  CONFIG_VERSION,
  advanceCombat,
  mineIron,
  buyUpgrade,
  produce,
  retryBattle,
  trainBattle,
  floorStats,
  heroStats,
} from "../packages/shared/dist/index.js";
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
const runs = [];
for (const cps of [0, 1, 3, 5]) {
  const s = LocalSnapshotSchema.parse({
    ...newLoopState(),
    schemaVersion: 2,
    configVersion: CONFIG_VERSION,
    mode: "local",
    generation: 0,
    savedAt: 0,
    profile: { id: "local-test", name: "Simulação" },
    screen: "mine",
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
  const milestones = {
    firstUpgrade: null,
    coal: null,
    boss10: null,
    complete: null,
  };
  let retries = 0,
    training = 0;
  for (let t = 1; t <= 7200; t++) {
    for (let i = 0; i < cps; i++) mineIron(s);
    advanceCombat(s, 1000);
    produce(s, 1000);
    // Transparent test policy: target enough DPS to meet boss deadline, then HP to survive;
    // reserve50Coins for coal once attack>=2; no grants, cheats or replay of completed floors.
    const target =
      s.battle.phase === "failed" ? s.battle.retryFloor : s.battle.floor;
    const stats = floorStats(Math.min(20, Math.ceil(target / 10) * 10));
    const hits = Math.ceil(stats.hp / heroStats(s).attack);
    const needHp =
      Math.floor((hits * 1000 - 1) / stats.interval) * stats.attack + 1;
    if (s.upgrades.click < 2 && s.upgrades.attack >= 2 && s.upgrades.coal)
      buyUpgrade(s, "click");
    if (!s.upgrades.coal && s.upgrades.attack >= 2) {
      if (buyUpgrade(s, "coal")) milestones.coal = t;
    } else if (hits >= 30 || s.upgrades.attack < 2) buyUpgrade(s, "attack");
    else if (heroStats(s).hp < needHp) buyUpgrade(s, "vitality");
    else buyUpgrade(s, "attack");
    if (
      !milestones.firstUpgrade &&
      Object.values(s.upgrades).some((v) => v > 0)
    )
      milestones.firstUpgrade = t;
    if (!milestones.boss10 && s.battle.highest >= 10) milestones.boss10 = t;
    if (s.battle.phase === "failed") {
      const st = floorStats(target),
        hitsNow = Math.ceil(st.hp / heroStats(s).attack),
        need = Math.floor((hitsNow * 1000 - 1) / st.interval) * st.attack + 1;
      if (!st.boss || (hitsNow < 30 && heroStats(s).hp >= need)) {
        retryBattle(s);
        retries++;
      } else if (cps > 0) {
        trainBattle(s);
        training++;
      }
    }
    if (s.battle.phase === "complete") {
      milestones.complete = t;
      break;
    }
  }
  runs.push({
    clicksPerSecond: cps,
    durationLimitSeconds: 7200,
    milestones,
    retries,
    training,
    floor: s.battle.floor,
    highest: s.battle.highest,
    phase: s.battle.phase,
    upgrades: s.upgrades,
    balances: s.balances,
  });
}
assert.ok(
  runs
    .filter((r) => r.clicksPerSecond > 0)
    .every((r) => r.phase === "complete"),
  "active profiles must have a reachable completion",
);
console.log(
  JSON.stringify(
    {
      configVersion: CONFIG_VERSION,
      policy:
        "deterministic boss-aware policy; constant clicks for stress comparison, not a human forecast",
      runs,
    },
    null,
    2,
  ),
);
if (process.argv.includes("--write"))
  await writeFile(
    new URL("../docs/phase3-balance-results.json", import.meta.url),
    JSON.stringify({ configVersion: CONFIG_VERSION, runs }, null, 2) + "\n",
  );
