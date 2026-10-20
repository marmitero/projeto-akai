import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {performance} from 'node:perf_hooks';
import {initialRunV6,presetBuildV3,beginOfflineV7,drainOfflineV7,OFFLINE_LIMIT_V7,heroStatsV3} from '../../packages/shared/dist/index.js';
const start=Date.parse('2026-10-20T12:00:00-03:00');
let s=initialRunV6('00000000-0000-4000-8000-000000000007',start);
s.economy=presetBuildV3(1000,'swift','legendary20');s.economy.attributes={force:1000,vitality:500,agility:800,physical:200,magic:100,luck:0,dexterity:194};s.economy.economicThroughMs=start;s.economy.highest={main:1000,coal:900,iron:0,gold:0};s.economy.activity='coal';s.economy.floor=900;
const interval=heroStatsV3(s.economy).intervalMs;
s=beginOfflineV7(s,start+OFFLINE_LIMIT_V7);
const slices=[];let events=0;const begin=performance.now();
for(let i=0;i<2000;i++){
 const at=performance.now(),r=drainOfflineV7(JSON.parse(JSON.stringify(s)),500);s=r.state;events+=r.processed;
 slices.push({events:r.processed,ms:performance.now()-at});assert.ok(r.processed<=500);
 assert.ok((s.encounter?.combat.hits.length??0)<=64);assert.ok(s.log.length<=60);
 if(!r.backlog)break;
}
assert.equal(s.offlineJob,null);assert.equal(s.economy.offline.usedMs,OFFLINE_LIMIT_V7);assert.equal(s.economy.economicThroughMs,start+OFFLINE_LIMIT_V7);
assert.equal(s.economy.balances.coin,'0');assert.equal(s.economy.balances.jade,'0');assert.equal(s.economy.protection,0);assert.equal(s.economy.floor,900);assert.equal(s.economy.highest.coal,900);
const sorted=slices.map(x=>x.ms).sort((a,b)=>a-b);
const report={version:'r7-offline-audit-1',passed:true,fixture:'synthetic level1000 Swift legendary+20 (pure scenario, not acquisition or refinement grant), coal900, maximum-AGI legal point budget, 8h, frozen build, JSON restart each slice',intervalMs:interval,attacksPerSecond:1000/interval,limitMs:OFFLINE_LIMIT_V7,budgetMs:s.economy.offline.usedMs,events,slices:slices.length,maxEventsPerRead:500,p95SliceMs:sorted[Math.floor(sorted.length*.95)],maxSliceMs:sorted.at(-1),totalMs:performance.now()-begin,kills:s.killSequence,materialMilli:s.economy.balances.coal,logRows:s.log.length,maxHitRows:64,limits:'Work is bounded per command, not mathematically extrapolated. Full absence is drained by resumable commands. Timing is machine-dependent, not a production SLA. Hunt rewards do not create equipment; tower vault size remains a separate capacity concern. Not a campaign90–120day validation.'};
await writeFile('docs/plans/hunts-builds/r7/audit-results.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
