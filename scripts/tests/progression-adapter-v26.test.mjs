import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialRunV6,advanceRunV6} from '../../packages/shared/dist/index.js';
import {initialCampaign,campaignDay} from '../economy-v2/campaign-policy.mjs';
import {createAdapterV26} from '../economy-v2/progression-adapter-v26.mjs';
import {NEW_CASES_V24,INHERITED_CASES_V24,WORLD_START_V24,caseKeyV24,validateCaseV24} from '../economy-v2/progression-panel-v24.mjs';
import {validateEvidenceV24} from '../economy-v2/progression-evidence-v24.mjs';
const H=3600000,account='00000000-0000-4000-8000-000000000001';
test('matrix is fixed, has seven new pairs, two new seeds and retains the negative inherited case',()=>{
 assert.equal(NEW_CASES_V24.length,7);assert.equal(INHERITED_CASES_V24.length,7);assert.equal(new Set([...NEW_CASES_V24,...INHERITED_CASES_V24].map(caseKeyV24)).size,14);assert.ok(INHERITED_CASES_V24.some(c=>c.seed===3735928559));assert.deepEqual([...new Set(NEW_CASES_V24.map(c=>c.seed))].sort((a,b)=>a-b),[17,1337,4213]);for(const startHour of [0,12,20])assert.ok([...NEW_CASES_V24,...INHERITED_CASES_V24].some(c=>c.schedule==='casual'&&c.seed===4213&&c.startHour===startHour));
 for(const c of [{schedule:'best',build:'swift',seed:17,startHour:12},{schedule:'casual',build:'swift',seed:0,startHour:0},{schedule:'casual',build:'swift',seed:17,startHour:1}])assert.throws(()=>validateCaseV24(c));
});
test('offset zero native control reproduces the original controller complete state',async()=>{
 const c={schedule:'casual',build:'swift',seed:4213,startHour:0},lab=await createAdapterV26({mode:'zero',startHour:0});try{
  const a=initialCampaign(c),b=lab.campaign.initialCampaign(c);campaignDay(a);lab.campaign.campaignDay(b);assert.deepEqual(b,a);validateEvidenceV24(b,lab.trace.finishDay(1),c,1);
 }finally{await lab.dispose();}
});
test('zero arm uses native grants even inside a full guild/global overlap',async()=>{
 const lab=await createAdapterV26({mode:'zero',startHour:12});try{
  let a=initialRunV6(account,WORLD_START_V24+7*86400000+12*H,17),b=structuredClone(a),x,y;const to=a.economy.economicThroughMs+H;
  do{x=advanceRunV6(a,to,1000);y=lab.kernel.advanceRunV6(b,to,1000);assert.deepEqual(y,x);a=x.state;b=y.state;}while(x.backlog);
  assert.equal(Object.values(lab.trace.snapshot().groups).reduce((n,g)=>n+(g.directExtraMs??0),0),0);
 }finally{await lab.dispose();}
});
test('global event and guild keep world boundaries; offline never gets the event',async()=>{
 const lab=await createAdapterV26({mode:'calendar',startHour:20});try{
  const f=lab.kernel.segmentsV26,s=WORLD_START_V24;assert.deepEqual(f(s+12*H-1,s+12*H+1,false),[{ms:1,bonusBps:0},{ms:1,bonusBps:3000}]);assert.deepEqual(f(s+18*H-1,s+18*H+1,false),[{ms:1,bonusBps:3000},{ms:1,bonusBps:0}]);assert.deepEqual(f(s+12*H,s+14*H,true),[{ms:2*H,bonusBps:0}]);assert.deepEqual(f(s+7*86400000-1,s+7*86400000+1,true),[{ms:1,bonusBps:0},{ms:1,bonusBps:1000}]);assert.deepEqual(f(s+7*86400000+12*H,s+7*86400000+14*H,false),[{ms:2*H,bonusBps:4000}]);assert.deepEqual(f(s+7*86400000+12*H,s+7*86400000+14*H,true),[{ms:2*H,bonusBps:1000}]);
 }finally{await lab.dispose();}
});
test('shifted cycles have24hours and identical state with observer disabled; midnight quota stays bounded',async()=>{
 for(const startHour of [12,20]){const c={schedule:'casual',build:'swift',seed:17,startHour},a=await createAdapterV26({mode:'calendar',startHour}),b=await createAdapterV26({mode:'calendar',startHour,observe:false});try{
  const x=a.campaign.initialCampaign(c),y=b.campaign.initialCampaign(c);assert.equal(x.run.economy.economicThroughMs,WORLD_START_V24+startHour*H);
  for(let day=1;day<=2;day++){a.campaign.campaignDay(x);b.campaign.campaignDay(y);assert.deepEqual(x,y);const t=a.trace.finishDay(day);validateEvidenceV24(x,t,c,day);assert.ok(x.offlineMs<=day*8*H);assert.equal(x.run.economy.economicThroughMs,WORLD_START_V24+startHour*H+day*86400000);}
 }finally{await a.dispose();await b.dispose();}}
});
test('shifted checkpoint resumes state/digests and corruption cannot pass time or purchasing accounting',async()=>{
 const c={schedule:'casual',build:'swift',seed:17,startHour:20},a=await createAdapterV26({mode:'zero',startHour:20});try{
  const x=a.campaign.initialCampaign(c);a.campaign.campaignDay(x);const saved=a.trace.finishDay(1),b=await createAdapterV26({mode:'zero',startHour:20,savedTrace:saved});try{
   const y=structuredClone(x);a.campaign.campaignDay(x);b.campaign.campaignDay(y);assert.deepEqual(x,y);const t=a.trace.finishDay(2);assert.deepEqual(t,b.trace.finishDay(2));validateEvidenceV24(x,t,c,2);
   for(const mutate of [(z,v)=>{z.idleMs++;},(z,v)=>{z.run.economy.balances.coin=String(BigInt(z.run.economy.balances.coin)+1n);},(z,v)=>{v.nativeWallMs++;},(z,v)=>{z.firstMaxDay=1;}]){const z=structuredClone(x),v=structuredClone(t);mutate(z,v);assert.throws(()=>validateEvidenceV24(z,v,c,2));}
  }finally{await b.dispose();}
 }finally{await a.dispose();}
});


test('future wave start across a work-budget boundary classifies the pending transition without changing state',async()=>{
 const lab=await createAdapterV26({mode:'zero',startHour:0});try{
  let a=initialRunV6(account,WORLD_START_V24,17),b=structuredClone(a),found=false;const to=WORLD_START_V24+120000;
  for(let n=0;n<1000;n++){const x=advanceRunV6(a,to,1),y=lab.kernel.advanceRunV6(b,to,1);assert.deepEqual(y,x);a=x.state;b=y.state;if(a.encounter?.wave>1&&a.encounter.combat.clockMs>a.economy.economicThroughMs){found=true;break;}if(!x.backlog)break;}
  assert.ok(found,'Native boundary fixture must reach a future wave start');const x=advanceRunV6(a,to,10000),y=lab.kernel.advanceRunV6(b,to,10000);assert.deepEqual(y,x);const groups=Object.values(lab.trace.snapshot().groups);assert.equal(groups.reduce((n,g)=>n+(g.unclassifiedMs??0),0),0);assert.ok(groups.reduce((n,g)=>n+(g.internalTransitionMs??0),0)>=3000);
 }finally{await lab.dispose();}
});


test('H26 observer is transparent through an eligible global window',async()=>{
 const config={schedule:'casual',build:'swift',seed:17,startHour:12},a=await createAdapterV26({mode:'calendar',startHour:12}),b=await createAdapterV26({mode:'calendar',startHour:12,observe:false});
 try{const x=a.campaign.initialCampaign(config),y=b.campaign.initialCampaign(config);a.campaign.campaignDay(x);b.campaign.campaignDay(y);assert.deepEqual(x,y);const t=a.trace.finishDay(1);validateEvidenceV24(x,t,config,1);assert.ok(Object.values(t.groups).reduce((n,g)=>n+(g.directExtraMs??0),0)>0);}finally{await a.dispose();await b.dispose();}
});


test('H26 panel retains the exact14cases and mandatory native replays',async()=>{const {CASES_V26,PANEL_PROTOCOL_V26}=await import('../economy-v2/progression-panel-v26.mjs');assert.deepEqual(CASES_V26,[...INHERITED_CASES_V24,...NEW_CASES_V24]);assert.equal(CASES_V26.length,14);assert.equal(PANEL_PROTOCOL_V26.days,120);assert.equal(PANEL_PROTOCOL_V26.minimumPrimaryBenefit,0.01);assert.equal(PANEL_PROTOCOL_V26.runtimeEnabled,false);});
