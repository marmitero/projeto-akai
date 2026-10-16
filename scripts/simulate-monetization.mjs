import { writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import {
  PREMIUM_PRODUCTS,
  MONETIZATION_VERSION,
  floorStats,
} from "../packages/shared/dist/index.js";
const report = {
  version: MONETIZATION_VERSION,
  scope:
    "Local deterministic sandbox parameters, not pricing/commercial fairness or real provider certification.",
  products: PREMIUM_PRODUCTS.map((p) => ({ ...p, realPrice: null })),
  ads: {
    durationMs: 120000,
    maxRolling24h: 8,
    cooldownMs: 300000,
    requestTtlMs: 600000,
    autoclickPotential: 360,
    offlineClicks: 0,
    perTypeStacking: false,
  },
  coinExamples: [1, 10, 100, 500, 1000].map((floor) => ({
    floor,
    coinsPerVerifiedReward: Math.min(
      1000000,
      Math.max(30, floorStats(floor).coin * 10),
    ),
  })),
  decisions: [
    "Ruby trading and conversion into resources disabled.",
    "No paid combat/permanent advantage; only cosmetic title entitlement.",
    "2x rewards means tower Coins and XP only, no item duplication.",
    "Ads excluded from arena, world boss and war.",
    "Fake/signed sandbox receipts grant only in isolated loopback test DB; no production mode exists.",
    "Keep catalog quantities provisional:100/550/1200/2600, no real prices.",
  ],
};
assert.equal(report.ads.autoclickPotential, (report.ads.durationMs / 1000) * 3);
assert.equal(8 * 360, 2880);
assert(report.coinExamples.every((x) => x.coinsPerVerifiedReward <= 1000000));
await writeFile(
  "docs/phase8-economy-simulation.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(report, null, 2));
