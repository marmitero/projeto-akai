import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialRunV6,advanceRunV6} from '../../packages/shared/dist/index.js';
import {initialCampaign,campaignDay} from '../economy-v2/campaign-policy.mjs';
import {createAdapterV28} from '../economy-v2/progression-adapter-v28.mjs';
import {initialShadowV28,applyVictoryV28,segmentsV28,finishShadowDayV28,decodeDayV28,validateShadowV28,MAX_V28,DAY_V28} from '../economy-v2/progression-shadow-v28.mjs';
import {quoteMasteryV26} from '../../packages/shared/dist/progression-bonus-v26/index.js';
import {WORLD_START_V24 as START} from '../economy-v2/progression-panel-v24.mjs';
import {validateEvidenceV24} from '../economy-v2/progression-evidence-v24.mjs';
import {sourcesV28} from '../economy-v2/progression-sources-v28.mjs';
import {shadowMetricV28} from '../economy-v2/audit-progression-shadow-v28.mjs';
const H=3600000,account='00000000-0000-4000-8000-000000000001';
test('world boundaries and offline exclusion stay exact',()=>{
 assert.deepEqual(segmentsV28(START+12*H-1,START+12*H+1,false),[{ms:1,bonusBps:0},{ms:1,bonusBps:3000}]);assert.deepEqual(segmentsV28(START+18*H-1,START+18*H+1,false),[{ms:1,bonusBps:3000},{ms:1,bonusBps:0}]);assert.deepEqual(segmentsV28(START+12*H,START+14*H,true),[{ms:2*H,bonusBps:0}]);assert.deepEqual(segmentsV28(START+7*DAY_V28-1,START+7*DAY_V28+1,true),[{ms:1,bonusBps:0},{ms:1,bonusBps:1000}]);
});
test('victory prefix, carry and native quote are exact; input rows remain untouched',()=>{
 const s=initialShadowV28(START),Q=12345,cap=()=>1000,n=quoteMasteryV26({masteryMs:0,carry:0,qualifiedMs:Q,reference:1,bonusBps:0},cap),row={at:START+Q+3000,Q,activity:'main',floor:1,reference:1,offline:false,before:{masteryMs:0,carry:0},after:{masteryMs:n.masteryMs,carry:n.carry}},before=structuredClone(row);applyVictoryV28(s,row,cap);assert.deepEqual(row,before);assert.equal(s.banks.zero.masteryMs,n.masteryMs);assert.equal(s.banks.zero.carry,n.carry);assert.equal(s.banks.oracle.masteryMs,Q);assert.equal(s.ordinal,1);
 const {record,archive}=finishShadowDayV28(s,1,[row]);assert.deepEqual(decodeDayV28(archive,record),[row]);assert.deepEqual(JSON.parse(JSON.stringify(s)),s);const bad=Buffer.from(archive);bad[15]^=1;assert.throws(()=>decodeDayV28(bad,record));
});
test('wrong timestamps, Q and carry are rejected before a ledger can be accepted',()=>{
 const row={at:START+5000,Q:2000,activity:'main',floor:1,reference:1,offline:false,before:{masteryMs:0,carry:0},after:{masteryMs:2000,carry:0}};
 for(const mutate of [r=>{r.at=START;},r=>{r.Q=6000;},r=>{r.before.carry=1;},r=>{r.after.carry=1;},r=>{r.reference=0;},r=>{r.offline='yes';}]){const r=structuredClone(row);mutate(r);assert.throws(()=>applyVictoryV28(initialShadowV28(START),r,()=>100000));}
});
test('maximum witnesses use victory time, retain censoring and preserve the96day floor',()=>{
 const s=initialShadowV28(START);s.lastAt=START+MAX_V28-1;s.qualifiedMs=MAX_V28-1;for(const b of Object.values(s.banks)){b.masteryMs=MAX_V28-1;b.carry=0;}
 const row={at:START+MAX_V28+3000,Q:100,activity:'main',floor:1000,reference:1000,offline:false,before:{masteryMs:MAX_V28-1,carry:0},after:{masteryMs:MAX_V28,carry:0}};applyVictoryV28(s,row,()=>100000);for(const b of Object.values(s.banks)){assert.equal(b.witness.at,row.at);assert.equal(b.carry,0);}
 assert.equal(shadowMetricV28(s.banks.zero,s.banks.h26,START).maximumAtMs,row.at);const z={masteryMs:100,witness:null},h={masteryMs:101,witness:null};assert.equal(shadowMetricV28(z,h,START).benefitAtLeastOnePercent,true);assert.equal(shadowMetricV28(z,h,START).maximumAtMs,null);
});
test('complete acquired day reproduces native state and observer-disabled state inside eligible window',async()=>{
 const config={schedule:'casual',build:'swift',seed:17,startHour:12},a=await createAdapterV28({startHour:12}),b=await createAdapterV28({startHour:12,observe:false});try{
  const x=a.campaign.initialCampaign(config),y=b.campaign.initialCampaign(config);a.campaign.campaignDay(x);b.campaign.campaignDay(y);assert.deepEqual(x,y);const f=a.observer.finishDay(1);validateEvidenceV24(x,f.trace,config,1);validateShadowV28(f.shadow,f.trace,x);assert.ok(f.shadow.banks.h26.masteryMs>f.shadow.banks.zero.masteryMs);assert.equal(f.shadow.banks.zero.masteryMs,x.run.economy.masteryMs);
  const replay=initialShadowV28(START+12*H);for(const row of decodeDayV28(f.archive,f.record))applyVictoryV28(replay,row,l=>a.kernel.benchmarkV28(l,row.activity,row.floor));finishShadowDayV28(replay,1,decodeDayV28(f.archive,f.record),f.archive);assert.deepEqual(replay,f.shadow);
 }finally{await a.dispose();await b.dispose();}
});
test('native offset0 and RNG/digests survive observation and JSON restart at a midnight profile',async()=>{
 const config={schedule:'casual',build:'swift',seed:17,startHour:20},a=await createAdapterV28({startHour:20});try{
  const x=a.campaign.initialCampaign(config);a.campaign.campaignDay(x);const saved=a.observer.finishDay(1),b=await createAdapterV28({startHour:20,savedShadow:JSON.parse(JSON.stringify(saved.shadow)),savedTrace:JSON.parse(JSON.stringify(saved.trace))});try{
   const y=structuredClone(x);a.campaign.campaignDay(x);b.campaign.campaignDay(y);assert.deepEqual(x,y);const f=a.observer.finishDay(2),g=b.observer.finishDay(2);assert.deepEqual(f,g);validateShadowV28(f.shadow,f.trace,x);validateEvidenceV24(x,f.trace,config,2);
  }finally{await b.dispose();}
 }finally{await a.dispose();}
 const zero=await createAdapterV28();try{const c={schedule:'casual',build:'swift',seed:4213},x=initialCampaign(c),y=zero.campaign.initialCampaign(c);campaignDay(x);zero.campaign.campaignDay(y);assert.deepEqual(x,y);}finally{await zero.dispose();}
});
test('pending future-wave boundary is transparent and source binding includes executed compiled models',async()=>{
 const a=await createAdapterV28();try{
  let x=initialRunV6(account,START,17),y=structuredClone(x),found=false;const to=START+120000;
  for(let n=0;n<1000;n++){const r=advanceRunV6(x,to,1),s=a.kernel.advanceRunV6(y,to,1);assert.deepEqual(s,r);x=r.state;y=s.state;if(x.encounter?.wave>1&&x.encounter.combat.clockMs>x.economy.economicThroughMs){found=true;break;}if(!r.backlog)break;}
  assert.ok(found);assert.deepEqual(a.kernel.advanceRunV6(y,to,10000),advanceRunV6(x,to,10000));assert.equal(Object.values(a.trace.snapshot().groups).reduce((n,g)=>n+(g.unclassifiedMs??0),0),0);
  const sources=await sourcesV28(0);for(const key of ['compiledModelHash','compiledBaseModelHash','compiledRuntimeHash','modelHash'])assert.match(sources[key],/^[a-f0-9]{64}$/);
 }finally{await a.dispose();}
});
