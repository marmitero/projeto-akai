import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createAdapterV29} from '../economy-v2/progression-adapter-v29.mjs';
import {quoteWaitV29,waitRateV29,guildBpsV29,initialCadenceV29,applyCadenceEventV29,finishCadenceDayV29,decodeCadenceDayV29,validateCadenceV29} from '../economy-v2/progression-cadence-v29.mjs';
import {initialRunV6,advanceRunV6} from '../../packages/shared/dist/index.js';
import {initialCampaign,campaignDay} from '../economy-v2/campaign-policy.mjs';
import {validateEvidenceV24} from '../economy-v2/progression-evidence-v24.mjs';
import {WORLD_START_V24 as W,DAY_V24 as D} from '../economy-v2/progression-panel-v24.mjs';
const H=3600000,account='00000000-0000-4000-8000-000000000001';
test('exact work integration agrees with independent per-ms rational oracle at every eligibility boundary',()=>{
 const gcd=(a,b)=>b?gcd(b,a%b):a;
 for(const rank of [1,2,3,8,11])for(const offline of [false,true])for(const at of [W+12*H-1,W+18*H-1,W+7*D-1,W+7*D+12*H-1,W+7*D+18*H-1]){
  let n=0n,d=1n,ms=0;while(n<3000n*d){const den=BigInt(10000-waitRateV29(at+ms,offline,'calendar',rank).bonusBps);n=n*den+10000n*d;d*=den;const g=gcd(n,d);n/=g;d/=g;ms++;assert.ok(ms<=3000);}
  assert.equal(quoteWaitV29({at,offline,rank}).durationMs,ms);assert.equal(quoteWaitV29({at,offline,rank,mode:'zero'}).durationMs,3000);
 }
 assert.deepEqual([1,2,3,4,10,11].map(guildBpsV29),[1000,700,500,300,300,100]);assert.equal(quoteWaitV29({at:W+7*D+12*H,offline:false}).durationMs,1800);assert.equal(quoteWaitV29({at:W+7*D+12*H,offline:true}).durationMs,2700);assert.equal(quoteWaitV29({at:W+12*H,offline:true}).durationMs,3000);
 for(const x of [{at:-1,offline:false},{at:W,offline:0},{at:W,offline:false,mode:'bad'}])assert.throws(()=>quoteWaitV29(x));
});
test('bounded lifecycle ledger rejects altered waits, credit prefixes, ordering, hashes and early starts',()=>{
 const at=W+12*H,s=initialCadenceV29('calendar',W),row={kind:'schedule',id:1,at,until:at+2100,offline:false,activity:'main',floor:1,reference:1,Q:100,before:{masteryMs:0,carry:0},after:{masteryMs:100,carry:0}};
 applyCadenceEventV29(s,row);for(const event of [{kind:'start',id:1,at:at+2099},{...row,id:2,at:at+1}])assert.throws(()=>applyCadenceEventV29(structuredClone(s),event));
 const next={kind:'start',id:1,at:at+2100};applyCadenceEventV29(s,next);const {archive,record}=finishCadenceDayV29(s,1,[row,next]);assert.deepEqual(decodeCadenceDayV29(archive,record),[row,next]);assert.throws(()=>decodeCadenceDayV29(archive,{...record,rawHash:'0'.repeat(64)}));
 for(const mutate of [r=>r.until++,r=>r.before.carry++,r=>r.Q=0,r=>r.at=W-1,r=>r.after.masteryMs=101]){const r=structuredClone(row);mutate(r);assert.throws(()=>applyCadenceEventV29(initialCadenceV29('calendar',W),r));}
});
test('zero kernel is exactly native inside maximum eligibility, including partial work budgets',async()=>{
 const lab=await createAdapterV29({mode:'zero'});try{
  let a=initialRunV6(account,W+7*D+12*H,17),b=structuredClone(a);const end=a.economy.economicThroughMs+120000;
  for(let i=0;i<2000;i++){const x=advanceRunV6(a,end,1),y=lab.kernel.advanceRunV6(b,end,1);assert.deepEqual(y,x);a=x.state;b=y.state;if(!x.backlog)break;assert.ok(i<1999);}
  assert.equal(lab.cadence.state.potentialSavedMs,0);assert.ok(lab.cadence.state.scheduled>0);assert.equal(Object.values(lab.trace.snapshot().groups).reduce((n,g)=>n+(g.unclassifiedMs??0),0),0);
 }finally{await lab.dispose();}
});
test('only completed victory wait changes; native grant, RNG, initial approach and 6000ms between waves stay intact',async()=>{
 const a=await createAdapterV29({mode:'calendar'}),b=await createAdapterV29({mode:'zero'});try{
  let x=initialRunV6(account,W+7*D+12*H,17),y=structuredClone(x);const end=x.economy.economicThroughMs+120000;
  for(let i=0;i<2000&&!a.cadence.state.scheduled;i++){const p=a.kernel.advanceRunV6(x,end,1),q=b.kernel.advanceRunV6(y,end,1);x=p.state;y=q.state;if(!a.cadence.state.scheduled)assert.deepEqual(p,q);}
  assert.equal(a.cadence.state.scheduled,1);assert.equal(b.cadence.state.scheduled,1);assert.equal(x.nextAt,y.nextAt-1200);assert.deepEqual({...x,nextAt:y.nextAt},y);assert.ok(Object.values(a.trace.snapshot().groups).reduce((n,g)=>n+(g.internalTransitionMs??0),0)>=6000);
  const before=structuredClone(x),pending=structuredClone(a.cadence.state.pending),r=a.kernel.advanceRunV6(x,x.nextAt,1);assert.deepEqual(r.state.economy.balances,before.economy.balances);assert.equal(r.state.economy.masteryMs,before.economy.masteryMs);assert.equal(r.state.xpCarry,before.xpCarry);assert.equal(r.state.encounter,null);
  const saved=JSON.parse(JSON.stringify({run:r.state,cadence:a.cadence.state,trace:a.trace.snapshot()})),restart=await createAdapterV29({mode:'calendar',savedCadence:saved.cadence,savedTrace:saved.trace});try{const p=a.kernel.advanceRunV6(r.state,pending.until+100,1),q=restart.kernel.advanceRunV6(saved.run,pending.until+100,1);assert.deepEqual(p,q);assert.deepEqual(a.cadence.state,restart.cadence.state);assert.deepEqual(a.trace.snapshot(),restart.trace.snapshot());}finally{await restart.dispose();}
  for(const reset of ['offline','pause','select']){const resetLab=await createAdapterV29({mode:'calendar',savedCadence:saved.cadence,savedTrace:saved.trace});try{
   const input=structuredClone(saved.run),out=reset==='offline'?resetLab.offline.beginOfflineV7(input,input.economy.economicThroughMs+H):resetLab.kernel.applyEconomyActionV6(input,reset==='pause'?{type:'pause',paused:true}:{type:'select',activity:'main',floor:1});
   assert.equal(out.nextAt,input.economy.economicThroughMs+3000);assert.equal(resetLab.cadence.state.pending,null);assert.equal(resetLab.cadence.state.cancelled,1);assert.equal(resetLab.cadence.state.completed,0);assert.deepEqual(out.economy.balances,input.economy.balances);assert.equal(out.economy.masteryMs,input.economy.masteryMs);
  }finally{await resetLab.dispose();}}
 }finally{await a.dispose();await b.dispose();}
});
test('native full campaign state and daily trace remain valid with zero bonus',async()=>{
 const config={schedule:'casual',build:'swift',seed:4213,startHour:0},a=await createAdapterV29({mode:'zero'});try{const x=initialCampaign(config),y=a.campaign.initialCampaign(config);campaignDay(x);a.campaign.campaignDay(y);assert.deepEqual(y,x);const trace=a.trace.finishDay(1),day=a.cadence.finishDay(1);validateEvidenceV24(y,trace,config,1);validateCadenceV29(day.state,trace,y);}finally{await a.dispose();}
});
test('calendar observer is transparent and JSON restart preserves acquired state, ledger chain and midnight quota',async()=>{
 const config={schedule:'casual',build:'swift',seed:17,startHour:12},a=await createAdapterV29({mode:'calendar',startHour:12}),b=await createAdapterV29({mode:'calendar',startHour:12,observe:false});try{
  const x=a.campaign.initialCampaign(config),y=b.campaign.initialCampaign(config);a.campaign.campaignDay(x);b.campaign.campaignDay(y);assert.deepEqual(x,y);const trace=a.trace.finishDay(1),day=a.cadence.finishDay(1);b.cadence.finishDay(1);validateEvidenceV24(x,trace,config,1);validateCadenceV29(day.state,trace,x);assert.ok(day.state.potentialSavedMs>0);
  const saved=JSON.parse(JSON.stringify({campaign:x,cadence:day.state,trace})),r=await createAdapterV29({mode:'calendar',startHour:12,savedCadence:saved.cadence,savedTrace:saved.trace});try{a.campaign.campaignDay(x);r.campaign.campaignDay(saved.campaign);assert.deepEqual(x,saved.campaign);const t=a.trace.finishDay(2),d=a.cadence.finishDay(2);assert.deepEqual(t,r.trace.finishDay(2));assert.deepEqual(d,r.cadence.finishDay(2));validateEvidenceV24(x,t,config,2);validateCadenceV29(d.state,t,x);assert.ok(x.offlineMs<=16*H);}finally{await r.dispose();}
 }finally{await a.dispose();await b.dispose();}
});

test('defeat and timeout recovery receive no discounted approach; executed sources are bound',async()=>{
 const a=await createAdapterV29({mode:'calendar'}),b=await createAdapterV29({mode:'zero'});try{
  const s=initialRunV6(account,W+7*D+12*H,17);s.economy.floor=1000;
  const x=a.kernel.advanceRunV6(s,s.economy.economicThroughMs+120000,10000),y=b.kernel.advanceRunV6(s,s.economy.economicThroughMs+120000,10000);assert.deepEqual(x,y);assert.equal(x.state.paused,true);assert.equal(a.cadence.state.scheduled,0);assert.equal(x.state.nextAt,x.state.log.at(-1).at+3000);assert.ok(x.state.log.at(-1).text.startsWith('Derrota'));
  const started=a.kernel.advanceRunV6(s,s.economy.economicThroughMs+1,10000).state;assert.ok(started.encounter);started.encounter.combat.deadlineMs=started.encounter.combat.clockMs;
  const timeout=a.kernel.advanceRunV6(started,started.economy.economicThroughMs+120000,10000),nativeTimeout=b.kernel.advanceRunV6(started,started.economy.economicThroughMs+120000,10000);assert.deepEqual(timeout,nativeTimeout);assert.ok(timeout.state.log.at(-1).text.startsWith('Tempo esgotado'));assert.equal(timeout.state.nextAt,timeout.state.log.at(-1).at+3000);assert.equal(a.cadence.state.scheduled,0);
  const {sourcesV29}=await import('../economy-v2/progression-sources-v29.mjs');const sources=await sourcesV29(0);for(const k of ['modelHash','compiledRuntimeHash','compiledBaseModelHash','factoryHash','baseObserverHash','hypothesisHash','protocolSourceHash'])assert.match(sources[k],/^[a-f0-9]{64}$/);
 }finally{await a.dispose();await b.dispose();}
});
