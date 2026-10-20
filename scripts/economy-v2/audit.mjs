import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {JADE_V2,ECONOMY_XP_V2,planDailyBossJade,initialEconomyV2,newLoopState,LocalSnapshotSchema,CONFIG_VERSION} from '../../packages/shared/dist/index.js';
import {prepareEconomyMigration,rehearseEconomyRollback} from '../../apps/server/dist/economy-migration.js';


const contract=JSON.parse(await readFile(new URL('../../docs/plans/hunts-builds/contracts/economy-v2.json',import.meta.url),'utf8'));
assert.deepEqual(JADE_V2.top10,contract.jade.top10Bonuses);
assert.equal(JADE_V2.lastHit,contract.jade.lastHitBonus);
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const populations=[1,2,10,100,1000,5000].map(n=>{
  const r=planDailyBossJade({edition:'boss:2026-10-20',defeated:true,lastHit:id(1),members:Array.from({length:n},(_,i)=>({accountId:id(i+1),name:`Fixture ${i+1}`,damage:String(n-i),qualifiedSeconds:600,highestFloor:100,suspended:false}))});
  const total=r.grants.reduce((a,g)=>a+g.jade,0),winner=r.grants.filter(g=>g.accountId===id(1)).reduce((a,g)=>a+g.jade,0);
  assert.equal(winner,453);assert.equal(r.ranking.length,Math.min(10,n));
  const expected=3*n+JADE_V2.top10.slice(0,n).reduce((a,v)=>a+v,0)+250;
  assert.equal(total,expected);
  return {population:n,totalDailyJade:total,previousUniformDailyJade:3*n,emissionMultiplier:total/(3*n),repeatedWinner90Days:winner*90,previousWinner90Days:270};
});
// Independently compare frozen integer table with the original R1.1 float reference.
const weights=Array.from({length:999},(_,i)=>.05+2*((i+1)/999)**1.7),sum=weights.reduce((a,x)=>a+x,0);
let cumulative=0,maxDifferenceMs=0;
for(let i=0;i<999;i++){cumulative+=weights[i];maxDifferenceMs=Math.max(maxDifferenceMs,Math.abs(ECONOMY_XP_V2[i+1]-Math.floor(cumulative/sum*8294400000)));}
assert.ok(maxDifferenceMs<=1);
const snapshot=LocalSnapshotSchema.parse({...newLoopState(),schemaVersion:3,configVersion:CONFIG_VERSION,mode:'local',generation:0,savedAt:1000,lastReconciledAt:1000,profile:{id:'local-test',name:'R2 Fixture'},screen:'battle',activeMs:0,balances:{coin:'123456789',iron:'99999999999999999999',coal:'0',gold:'0',jade:'900000',ruby:'1000'}});
const context={accountId:id(1),cutoverMs:2000,snapshot,escrow:[],pendingOffers:[],rubyDebt:'2000',spending:[]};
const plan=prepareEconomyMigration(context);
assert.deepEqual(rehearseEconomyRollback(plan),context);
assert.deepEqual(plan.projected,initialEconomyV2(id(1),2000));
const result={version:'r2-audit-1',kind:'contract-rehearsal-and-jade-supply-sensitivity',runtimeActivated:false,
  xp:{thresholds:ECONOMY_XP_V2.length,totalMs:ECONOMY_XP_V2[999],maxDifferenceFromOriginalReferenceMs:maxDifferenceMs,
    sha256:createHash('sha256').update(JSON.stringify(ECONOMY_XP_V2)).digest('hex')},
  populations,migration:{deterministicSourceHash:plan.sourceHash,archiveRestoreExact:true,zeroNewResourceInjection:true,premiumDebtPreserved:true},
  productionApproved:false,
  limits:['Not an integrated progression/refinement/market cohort','Old +20 rarity estimate is invalid for the new jade distribution','Boss award plan and broadcast consumer do not activate the future boss reward writer','No production migration or reset executed']};
await writeFile(new URL('../../docs/plans/hunts-builds/r2/audit-results.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({xpReferenceDifferenceMs:maxDifferenceMs,populationScenarios:populations.length,migrationRollbackExact:true,productionApproved:false}));
