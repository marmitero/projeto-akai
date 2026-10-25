import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createAdapterV23,replaceOnceV23} from '../economy-v2/progression-adapter-v23.mjs';
import {partitionV23,createTraceV23,validateTraceV23} from '../economy-v2/progression-trace-v23.mjs';
import {ECONOMY_XP_V2,initialRunV6,advanceRunV6,applyEconomyActionV6,beginOfflineV7,drainOfflineV7} from '../../packages/shared/dist/index.js';
const account='00000000-0000-4000-8000-000000000001',at=Date.parse('2026-10-19T03:00:00Z');
test('partition clips request boundaries, merges repeated pending gaps, and rejects contradictory overlaps',()=>{
 const p=partitionV23(1000,8000,[{from:0,to:3000,kind:'external',group:'main'},{from:0,to:3000,kind:'external',group:'main'},{from:3000,to:6000,kind:'combat',group:'main'},{from:6000,to:9000,kind:'internal',group:'main'}]);assert.deepEqual(p.amounts,{external:2000,combat:3000,internal:2000});assert.equal(p.unclassifiedMs,0);
 assert.throws(()=>partitionV23(0,100,[{from:0,to:80,kind:'a',group:'x'},{from:50,to:100,kind:'b',group:'x'}]),/TRACE_OVERLAP/);
 assert.throws(()=>replaceOnceV23('aa aa','aa','b'),/SOURCE_ANCHOR/);assert.throws(()=>replaceOnceV23('a','b','c'),/SOURCE_ANCHOR/);
});
test('observer never changes native state or RNG under chunking, abandoned fights, rejected commands and offline',async()=>{
 const lab=await createAdapterV23({mode:'zero'});try{
  let base=initialRunV6(account,at,4213),observed=structuredClone(base);
  const advance=to=>{let a,b;do{a=advanceRunV6(base,to,100);b=lab.kernel.advanceRunV6(observed,to,100);assert.deepEqual(b,a);base=a.state;observed=b.state;}while(a.backlog);};
  advance(at+1000);advance(at+2500);advance(at+3050);advance(at+7000);advance(at+12000);
  const action={type:'select',activity:'main',floor:1};base=applyEconomyActionV6(base,action);observed=lab.kernel.applyEconomyActionV6(observed,action);assert.deepEqual(observed,base);advance(at+13000);advance(at+18000);advance(at+30000);
  assert.throws(()=>lab.kernel.applyEconomyActionV6(observed,{type:'select',activity:'main',floor:1000}));assert.deepEqual(observed,base);
  base=beginOfflineV7(base,at+3600000);observed=lab.offline.beginOfflineV7(observed,at+3600000);assert.deepEqual(observed,base);let a,b;do{a=drainOfflineV7(base,100);b=lab.offline.drainOfflineV7(observed,100);assert.deepEqual(b,a);base=a.state;observed=b.state;}while(a.backlog);
  assert.ok(lab.trace.snapshot().drawCount>0);assert.equal(Object.values(lab.trace.snapshot().groups).reduce((n,g)=>n+(g.unclassifiedMs??0),0),0);
 }finally{await lab.dispose();}
});
test('daily trace checkpoint resumes hashes and counts without injecting data into campaign state',async()=>{
 const a=await createAdapterV23({mode:'zero'}),b=await createAdapterV23({mode:'zero',observe:false});try{
  const x=a.campaign.initialCampaign({schedule:'casual'}),y=b.campaign.initialCampaign({schedule:'casual'});a.campaign.campaignDay(x);b.campaign.campaignDay(y);assert.deepEqual(x,y);const saved=a.trace.finishDay(1);validateTraceV23(saved,1);
  const resumed=await createAdapterV23({mode:'zero',savedTrace:saved});try{
   const z=structuredClone(x);a.campaign.campaignDay(x);resumed.campaign.campaignDay(z);assert.deepEqual(z,x);assert.deepEqual(resumed.trace.finishDay(2),a.trace.finishDay(2));validateTraceV23(a.trace.snapshot(),2);
  }finally{await resumed.dispose();}
 }finally{await a.dispose();await b.dispose();}
});
test('trace validator rejects impossible wall time, credit and RNG accounting',()=>{
 const t=createTraceV23();t.farm(0,86400000,0);const s=t.finishDay(1);validateTraceV23(s,1);
 for(const mutate of [x=>x.farmWallMs++,x=>x.drawCount++,x=>x.groups['online/main/preMax']={qualifiedVictoryMs:1},x=>x.days[0].drawDigest='x']){const p=structuredClone(s);mutate(p);assert.throws(()=>validateTraceV23(p,1));}
});


test('the exact maximum boundary partitions time before and after the capped victory',async()=>{
 const lab=await createAdapterV23({mode:'zero'});try{
  const x=initialRunV6(account,at,4213);x.economy.masteryMs=ECONOMY_XP_V2[999]-1;x.xpCarry=999999;
  const expected=advanceRunV6(x,at+120000,10000),actual=lab.kernel.advanceRunV6(x,at+120000,10000);assert.deepEqual(actual,expected);
  const trace=lab.trace.snapshot();assert.ok(trace.maxReachedAtMs>at);const before=Object.entries(trace.groups).filter(([k])=>k.endsWith('/preMax')).reduce((n,[,g])=>n+(g.combatMs??0)+(g.internalTransitionMs??0)+(g.externalTransitionMs??0)+(g.pausedMs??0)+(g.unclassifiedMs??0),0);
  assert.equal(before,trace.maxReachedAtMs-at);assert.ok(Object.keys(trace.groups).some(k=>k.endsWith('/afterMax')));
 }finally{await lab.dispose();}
});
