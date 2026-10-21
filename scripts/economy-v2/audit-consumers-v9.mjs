import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {initialRunV6,initialIntegratedV9,advanceIntegratedV9,integratedEconomyV9,integratedEventV9,integratedMarketV9,economyConsumersV9,presetBuildV3,masteryLevel,ECONOMY_XP_V2,ECONOMY_V2_ACTIVE} from '../../packages/shared/dist/index.js';
const at=Date.parse('2026-10-21T15:00:00Z'),id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
function fresh(count,seed,high=false){const runs=Object.fromEntries(Array.from({length:count},(_,i)=>{const account=id(i+1),r=initialRunV6(account,at);r.seed=seed+i;if(high){r.economy=presetBuildV3(1000,'swift','legendary20');r.economy.accountId=account;r.economy.economicThroughMs=at;r.economy.highest.main=1000;r.economy.balances.coin='2000000000';r.economy.balances.coal='10000000';for(const item of r.economy.inventory){const old=item.id;item.id=account+'/'+old;item.enhancement=15;for(const k of Object.keys(r.economy.equipped))if(r.economy.equipped[k]===old)r.economy.equipped[k]=item.id;}r.paused=true;}return [account,r];}));return initialIntegratedV9(runs,Object.fromEntries(Object.keys(runs).map((a,i)=>[a,{accountId:a,name:'Coorte '+(i+1),suspended:false}])),at);}
function advance(w,to,mode='online'){for(let i=0;i<2000;i++){const r=advanceIntegratedV9(w,to,mode,1000);w=r.state;if(!r.backlog)return w;}throw Error('COHORT_UNDRAINED');}
const rows=[];
for(const policy of ['force-vitality','balanced-entry','agility-entry'])for(const seed of [1,4213,3735928559]){
 let w=fresh(2,seed),moments=Object.fromEntries(Object.keys(w.market.runs).map(a=>[a,{}])),attempted=-100;
 const act=(a,action)=>{try{w=integratedEconomyV9(w,a,action);return true;}catch{return false;}};
 for(let tick=0;tick<720;tick++){
  w=advance(w,w.events.clockMs+10000);
  for(const a of Object.keys(w.market.runs)){
   for(let j=0;j<10;j++){const attrs=w.market.runs[a].economy.attributes;const k=policy==='agility-entry'&&attrs.force>=4&&attrs.vitality>=2&&attrs.agility<2?'agility':policy==='balanced-entry'&&attrs.force>=6&&attrs.vitality>=3&&attrs.physical<2?'physical':attrs.force<=attrs.vitality*2?'force':'vitality';if(attrs[k]>=9||!act(a,{type:'train',attribute:k}))break;}
   let r=w.market.runs[a];for(const k of ['main','coal','iron'])if(r.economy.highest[k]>=(k==='main'?5:1))moments[a][k]??=(w.events.clockMs-at)/1000;
   if(r.paused){act(a,{type:'auto',enabled:false});const h=r.economy.highest.main;act(a,{type:'select',activity:'main',floor:Math.max(1,h-(h%10===0?1:0))});}
   if(tick-attempted>=30){r=w.market.runs[a];if(r.economy.highest.main>=5&&!moments[a].coal)act(a,{type:'select',activity:'coal',floor:1});else if(r.economy.highest.main>=5&&!moments[a].iron)act(a,{type:'select',activity:'iron',floor:1});else {act(a,{type:'auto',enabled:true});act(a,{type:'select',activity:'main',floor:Math.min(1000,r.economy.highest.main+1)});}}
  }
  if(tick-attempted>=30)attempted=tick;
  if(Object.values(moments).every(m=>m.coal&&m.iron))break;
 }
 // Actual bounded absence, selected cleared main floor; no injected balances/gear/XP.
 for(const a of Object.keys(w.market.runs)){const r=w.market.runs[a],h=r.economy.highest.main;act(a,{type:'auto',enabled:false});act(a,{type:'select',activity:'main',floor:Math.max(1,h-(h%10===0?1:0))});}
 const pre=structuredClone(w);w=advance(w,w.events.clockMs+8*3600000,'offline');
 for(const a of Object.keys(w.market.runs)){const r=w.market.runs[a],before=pre.market.runs[a];assert.deepEqual(r.economy.highest,before.economy.highest);assert.ok(r.economy.offline.usedMs<=28800000);assert.equal(r.economy.balances.jade,'0');assert.ok(r.economy.masteryMs<=w.events.clockMs-at);const view=economyConsumersV9(r,w.events,w.market.book,a);assert.equal(view.balances.coin,r.economy.balances.coin);rows.push({policy,seed:seed+Object.keys(w.market.runs).indexOf(a),account:a,entrySeconds:moments[a],entryPassed:!!(moments[a].main&&moments[a].coal&&moments[a].iron),level:view.level,highest:view.highest,balances:view.balances,attributes:view.attributes,kills:r.killSequence,offlineUsedMs:r.economy.offline.usedMs,offlineStoppedByDefeat:r.paused,offlineMasteryGainedMs:r.economy.masteryMs-before.economy.masteryMs,listingFeeAffordable:BigInt(view.balances.coin)>=100000000n,censoredBeforeMaxLevel:view.level<1000});}
}
assert.ok(rows.every(r=>r.entryPassed),'Each sampled early policy must unlock both entry materials without external grants');
// Coupled late-game cohort: explicit synthetic gear/attributes and starting funds, never a campaign proof.
let late=fresh(12,4213,true);for(const a of Object.keys(late.market.runs))late=integratedEventV9(late,a,'boss',4213+Number(a.slice(-3)));
for(let i=0;i<100;i++){late=advance(late,late.events.clockMs+10000);for(const a of Object.keys(late.market.runs))late=integratedEventV9(late,a,'heartbeat',4213);}
assert.equal(late.events.daily.hp,0);assert.equal(Object.values(late.events.daily.members).reduce((n,m)=>n+BigInt(m.damage),0n),100000000n);
const jade=Object.values(late.market.runs).map(r=>Number(BigInt(r.economy.balances.jade)/1000n)),expected=12*3+1100+250;assert.equal(jade.reduce((a,b)=>a+b,0),expected);assert.equal(late.events.broadcasts.length,1);
for(const a of Object.keys(late.market.runs)){late=integratedEventV9(late,a,'leave',1);late=integratedEventV9(late,a,'protection',4213);}
for(let i=0;i<32;i++){late=advance(late,late.events.clockMs+10000);for(const a of Object.keys(late.market.runs))late=integratedEventV9(late,a,'heartbeat',4213);}
assert.ok(Object.values(late.market.runs).every(r=>r.economy.protection===5));for(const a of Object.keys(late.market.runs))late=integratedEventV9(late,a,'leave',1);
const seller=id(1),buyer=id(2),coinBefore=Object.values(late.market.runs).reduce((n,r)=>n+BigInt(r.economy.balances.coin),0n),coalBefore=Object.values(late.market.runs).reduce((n,r)=>n+BigInt(r.economy.balances.coal),0n);
late=integratedMarketV9(late,seller,{type:'list.resource',resource:'coal',quantity:'100000',price:'200000000',currency:'coin'},()=>id(101));late=integratedMarketV9(late,buyer,{type:'buy',listingId:id(101)},()=>id(102));
assert.equal(Object.values(late.market.runs).reduce((n,r)=>n+BigInt(r.economy.balances.coin),0n),coinBefore-120000000n);assert.equal(Object.values(late.market.runs).reduce((n,r)=>n+BigInt(r.economy.balances.coal),0n),coalBefore);
const before=JSON.stringify(late.market.runs);late=advance(late,late.events.clockMs);assert.equal(JSON.stringify(late.market.runs),before);
const minimumDays=ECONOMY_XP_V2[999]/86400000;assert.ok(minimumDays>=90&&minimumDays<=120);assert.equal(ECONOMY_V2_ACTIVE,false);
const report={version:'consumers-cohorts-v9-1',integrationPassed:true,activationReady:false,early:{accounts:rows.length,seeds:[1,4213,3735928559],policies:3,initialLevel:1,externalCurrencyOrGear:0,entryPassed:rows.every(r=>r.entryPassed),rows},late:{members:12,fixture:'Synthetic level1000/swift/legendary15 and2millionCoin each; NOT acquired progression',actualCombatAndLeases:true,totalJade:expected,perMemberJade:jade,topRecipientShareBp:Math.round(Math.max(...jade)*10000/expected),broadcasts:1,weeklyScrollsPerMember:5,marketCoinBurnMilli:'120000000',materialConservation:true},timeGate:{qualifiedMinimumDays:minimumDays,campaign90To120DaysApproved:false,reason:'Minimum qualified XP clock only; no full120-day acquisition/cost/demand campaign was run. Early samples are censored and synthetic late fixtures are excluded from progression claims.'},blockingGates:['Full paid-free campaign with earned equipment/refinement/materials and high-end achievements in90–120days','Market population demand/liquidity/concentration, provisional100k listing fee','Global daily population/sharding/alternate-account and last-hit concentration','Authenticated live consumers/arena/guild season migration and operational cutover/rollback','Capacity and free-player playtest'],scope:'Deterministic integration cohorts. No activation, no live-account writes, no store, no+16–20 unlock.'};
await writeFile('docs/plans/hunts-builds/consumers-v9/cohort-results.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({...report,early:{...report.early,rows:undefined}}));
