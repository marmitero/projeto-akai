import { writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import {
  floorStats,
  marketFee,
  MARKET_VERSION,
} from "../packages/shared/dist/index.js";
const stages = [1, 10, 100, 500, 1000].map((floor) => {
  const coinPerEnemy = floorStats(floor).coin;
  return {
    floor,
    coinPerEnemy,
    listingFeeCoins: 100000,
    enemyWinsForListingFee: Math.ceil(100000 / coinPerEnemy),
    note: "Enemy-win comparison only; ignores time, guild/event income and combat losses.",
  };
});
const prices = ["2", "11", "1000", "1000000", "100000000", "1000000000"].map(
  (price) => {
    const fee = marketFee(price),
      net = BigInt(price) - fee;
    assert(net > 0n);
    assert(BigInt(price) === fee + net);
    return {
      priceMinimal: price,
      feeMinimal: String(fee),
      netMinimal: String(net),
      sellerProfitAfterListingFeeCoins: String(net - 100000000n),
    };
  },
);
// Repeated reciprocal transactions can only burn currency. Never generate an arbitrage gain.
let supply = 2000000000000n;
for (let i = 0; i < 100; i++) {
  supply -= 100000000n + marketFee("1000000000");
}
assert.equal(supply, 1980000000000n);
const report = {
  version: MARKET_VERSION,
  experimental: true,
  scope:
    "Deterministic fee pressure and conservation, not commercial balance or human playtest.",
  stages,
  prices,
  reciprocal100Trades: {
    initialMinimal: "2000000000000",
    finalMinimal: String(supply),
    burnedMinimal: "20000000000",
  },
  decision:
    "Keep prompt listing fee100000 Coins in development pilot; restrictive at early floors. Gate trading at floor10. Do not claim production balance; monitor volume, listing expiry and affordability before public launch.",
};
await writeFile(
  "docs/phase7-economy-simulation.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(report, null, 2));
