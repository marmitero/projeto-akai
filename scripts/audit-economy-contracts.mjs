import { readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const base = new URL('../docs/plans/hunts-builds/contracts/', import.meta.url);
const source = await readFile(new URL('economy-v2.json', base), 'utf8');
const c = JSON.parse(source);
// Cross-system policy audit. This is not a gameplay simulation or an activation gate.
const checks = {};
function check(name, fn) { fn(); checks[name] = true; }
check('one-clock-and-96-day-absolute-floor', () => {
  assert.equal(c.mastery.simultaneousActivities, 1);
  assert.equal(c.mastery.minimumSeconds / c.mastery.dailyEconomicSeconds, 96);
  assert.equal(c.mastery.dailyEconomicSeconds, 86400);
  assert.ok(c.mastery.offlineSeconds <= c.mastery.dailyEconomicSeconds);
});
check('exclusive-material-and-jade-source', () => {
  for (const [resource, origin] of [['coal','coalHunt'],['iron','ironHunt'],['gold','goldHunt'],['jade','dailyBoss']]) {
    assert.deepEqual(Object.entries(c.sources).filter(([, xs]) => xs.includes(resource)).map(([k]) => k), [origin]);
  }
  for (const hunt of ['coalHunt','ironHunt','goldHunt']) assert.equal(c.sources[hunt].length, 2);
});
check('paid-and-free-protection-budget-separated', () => {
  assert.equal(c.protection.eventWeekly, 30); assert.equal(c.protection.shopWeeklyMaximum, 10);
  assert.equal(c.protection.towerDropPpm, 20); assert.equal(c.protection.tradable, false);
  assert.equal(c.protection.improvesChance, false); assert.equal(c.protection.shopEnabled, false);
});
check('jade-access-does-not-scale-with-wealth-or-population', () => {
  assert.equal(c.jade.dailyPerAccount, 3); assert.equal(c.jade.claimEditionsPerDay, 1);
  assert.equal(c.jade.perDamageRankingBonus, 0); assert.equal(c.jade.requiresKill, false);
  assert.equal(c.jade.tradable, false);
});
check('no-bound-currency-laundering', () => {
  assert.deepEqual(c.market.currencies, ['coin']);
  for (const x of c.market.bound) assert.ok(!c.market.materials.includes(x) && !c.market.currencies.includes(x));
  assert.equal(c.market.listedEquipmentMutable, false);
});
check('legacy-and-overflow-do-not-create-hunt-material', () => {
  assert.equal(c.salvage.onlyResource, 'coin'); assert.equal(c.salvage.automaticOverflow, false);
  assert.equal(c.legacy.balancesQuarantined, true); assert.equal(c.legacy.investmentCreditsSpendable, false);
  assert.equal(c.legacy.masteryFromOldXp, false); assert.equal(c.legacy.convertedGearRequiresNewLevel, true);
});
check('all-refinement-targets-have-one-failure-policy', () => {
  const targets = ['safeTargets','regressionTargets','mixedTargets','destructiveTargets'].flatMap(k => c.refinement[k]);
  assert.deepEqual(targets.sort((a,b) => a-b), Array.from({length:20}, (_,i) => i+1));
  assert.equal(c.refinement.legendaryOnlyFrom,16);
  assert.deepEqual(c.refinement.highSuccessPpm,[320000,270000,220000,170000,120000]);
  assert.equal(c.refinement.protectedFailureDelta,-1);
});
check('activation-and-commercialization-remain-blocked', () => {
  assert.equal(c.runtimeEnabled,false); assert.equal(c.monetizationEnabled,false);
  assert.equal(c.refinement.highRangeEnabled,false); assert.ok(c.activationRequires.includes('legacyCohorts'));
});
const result = {
  version:c.version, contractSha256:createHash('sha256').update(source).digest('hex'),
  kind:'design-contract-audit', checks,
  derived:{idealMinimumDays:96,regular2plus8MinimumDays:c.mastery.minimumSeconds/(10*3600),
    continuous90DayJadeMaximum:90*c.jade.dailyPerAccount,
    completedWeeks90:Math.floor(90/7),
    freeWeeklyEventBudget:c.protection.eventWeekly,paidWeeklyMaximum:c.protection.shopWeeklyMaximum,
    exampleEligibleKills100000ExpectedScrolls:100000*c.protection.towerDropPpm/1000000},
  productionApproved:false,
  limits:['No rerun of organic progression cohorts','No market liquidity or alternate-account simulation','No migration performed','Runtime still uses old economy','Price in Ruby deferred; paid case must assume full weekly maximum'],
};
await writeFile(new URL('audit-results.json',base), JSON.stringify(result,null,2)+'\n');
console.log(`${Object.keys(checks).length} contract audits passed; productionApproved=false`);
