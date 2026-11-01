// Read-only observer for disposable lab adapters. Never attach this to the game writer.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {quoteMasteryV22} from '../../packages/shared/dist/progression-bonus-v22/index.js';
import {ECONOMY_XP_V2} from '../../packages/shared/dist/economy-v2.js';
const MAX=ECONOMY_XP_V2[999];
const hash=()=>createHash('sha256');
const phase=s=>s.economy.masteryMs===MAX?'afterMax':'preMax';
const key=s=>`${s.offlineJob?'offline':'online'}/${s.economy.activity}/${phase(s)}`;
const add=(object,k,n=1)=>{assert.ok(Number.isSafeInteger(n)&&n>=0,'INVALID_TRACE_COUNTER');object[k]=(object[k]??0)+n;assert.ok(Number.isSafeInteger(object[k]));};
export function partitionV23(from,to,spans){
 assert.ok(Number.isSafeInteger(from)&&Number.isSafeInteger(to)&&to>=from);
 const clipped=spans.map(x=>({...x,from:Math.max(from,x.from),to:Math.min(to,x.to)})).filter(x=>x.to>x.from).sort((a,b)=>a.from-b.from||a.to-b.to),merged=[];
 for(const x of clipped){const last=merged.at(-1);if(last&&x.from<last.to)assert.equal(x.kind+'|'+x.group,last.kind+'|'+last.group,'TRACE_OVERLAP');if(last&&x.from<=last.to&&x.kind===last.kind&&x.group===last.group)last.to=Math.max(last.to,x.to);else merged.push({...x});}
 const amounts={};let covered=0;for(const x of merged){add(amounts,x.kind,x.to-x.from);covered+=x.to-x.from;}
 assert.ok(covered<=to-from);return {spans:merged,amounts,unclassifiedMs:to-from-covered,elapsedMs:to-from};
}
export function createTraceV23(saved){
 let state=saved?structuredClone(saved):{version:'progression-trace-v23-1',groups:{},actions:{},actionCategories:{},actionDebits:{},actionCredits:{},needs:{},decisions:{},rng:{},farmWallMs:0,nativeWallMs:0,returnJumpMs:0,eventMs:0,eventByPhase:{},maxReachedAtMs:null,drawCount:0,actionCount:0,decisionCount:0,days:[]};
 assert.equal(state.version,'progression-trace-v23-1');let context=null,drawHash=hash(),actionHash=hash(),decisionHash=hash();
 const group=k=>state.groups[k]??(state.groups[k]={});
 const span=(kind,from,to,k)=>{if(context&&to>from)context.spans.push({kind,from,to,group:k});};
 const pending=s=>{if(s.paused)return;const e=s.encounter;if(!e)span('externalTransitionMs',s.nextAt-3000,s.nextAt,key(s));else if(e.combat.status==='victory'&&e.activity==='main'&&e.floor%10!==0&&e.wave<3)span('internalTransitionMs',s.nextAt-3000,s.nextAt,key(s));};
 return {
  beginAdvance(s){assert.equal(context,null);context={from:s.economy.economicThroughMs,group:key(s),spans:[]};pending(s);},
  endAdvance(s){assert.ok(context);const end=s.economy.economicThroughMs;pending(s);if(s.paused)span('pausedMs',Math.max(context.from,s.nextAt-3000),end,key(s));const p=partitionV23(context.from,end,context.spans);for(const x of p.spans)add(group(x.group),x.kind,x.to-x.from);add(group(context.group),'unclassifiedMs',p.unclassifiedMs);add(state,'nativeWallMs',p.elapsedMs);context=null;},
  abortAdvance(){context=null;},
  combat(s,from,to){span('combatMs',from,to,key(s));},
  start(s,at,wave){span(wave===1?'externalTransitionMs':'internalTransitionMs',at-3000,at,key(s));add(group(key(s)),wave===1?'encounters':'waves');},
  rng(s,k,bound,before,value){const category=k.startsWith('fight/')?'fight':k.startsWith('refine/')?'refine':k.split('/').at(-1);add(state.rng,category);add(state,'drawCount');drawHash.update(JSON.stringify([k,bound,before,s.seed,value])+'\n');},
  mastery(before,after,Q,activity,reference,benchmark){
   const k=`${before.offline?'offline':'online'}/${activity}/${before.masteryMs===MAX?'afterMax':'preMax'}`,g=group(k),input={masteryMs:before.masteryMs,carry:before.carry,qualifiedMs:Q,reference,bonusBps:0};
   if(before.masteryMs<MAX&&after.masteryMs===MAX&&state.maxReachedAtMs===null){assert.ok(Number.isSafeInteger(after.at));state.maxReachedAtMs=after.at;}
   const base=quoteMasteryV22(input,benchmark),referenceOnly=quoteMasteryV22(input,()=>Q),ideal=Math.min(Q,MAX-before.masteryMs),actual=after.masteryMs-before.masteryMs;
   assert.ok(actual>=base.gainedMs&&referenceOnly.gainedMs>=base.gainedMs&&ideal>=referenceOnly.gainedMs,'TRACE_QUOTE_ORDER');
   for(const [name,n]of Object.entries({victories:1,qualifiedVictoryMs:Q,creditMs:actual,sameEncounterBaseMs:base.gainedMs,directExtraMs:actual-base.gainedMs,referenceLossMs:ideal-referenceOnly.gainedMs,benchmarkLossMs:referenceOnly.gainedMs-base.gainedMs,maximumCapLossMs:Q-ideal}))add(g,name,n);
  },
  action(before,action,after){add(state.actions,action.type);add(state.actionCategories,action.type+'/'+(action.attribute??action.slot??''));for(const currency of ['coin','coal','iron','gold','jade']){const delta=BigInt(after.economy.balances[currency])-BigInt(before.economy.balances[currency]),target=delta<0n?state.actionDebits:state.actionCredits;target[currency]=String(BigInt(target[currency]??'0')+(delta<0n?-delta:delta));}add(state,'actionCount');actionHash.update(JSON.stringify([before.economy.economicThroughMs,action,before.seed,after.seed,after.economy.attributes,after.economy.equipped])+'\n');},
  need(c){add(state.needs,c.need?.resource??'none');},
  decision(before,c){add(state,'decisionCount');add(state.decisions,`${before.need??'none'}->${c.run.economy.activity}`);decisionHash.update(JSON.stringify([before,c.run.economy.activity,c.run.economy.floor,c.run.autoAdvance,c.run.paused])+'\n');},
  farm(from,to,deltaNative){assert.ok(to>=from&&to-from>=deltaNative);add(state,'farmWallMs',to-from);add(state,'returnJumpMs',to-from-deltaNative);},
  event(ms,masteryMs=0){add(state,'eventMs',ms);add(state.eventByPhase,masteryMs===MAX?'afterMax':'preMax',ms);},
  nativeWall(){return state.nativeWallMs;},
  finishDay(day){assert.equal(context,null);assert.equal(day,state.days.length+1);state.days.push({day,drawDigest:drawHash.digest('hex'),actionDigest:actionHash.digest('hex'),decisionDigest:decisionHash.digest('hex'),drawCount:state.drawCount,actionCount:state.actionCount,decisionCount:state.decisionCount});drawHash=hash();actionHash=hash();decisionHash=hash();return structuredClone(state);},
  snapshot(){assert.equal(context,null);return structuredClone(state);},
 };
}
export function validateTraceV23(s,days){
 assert.equal(s.version,'progression-trace-v23-1');assert.equal(s.days.length,days);assert.equal(s.farmWallMs+s.eventMs,days*86400000);assert.equal(s.nativeWallMs+s.returnJumpMs,s.farmWallMs);
 assert.equal(Object.values(s.eventByPhase).reduce((a,b)=>a+b,0),s.eventMs);assert.ok(s.maxReachedAtMs===null||Number.isSafeInteger(s.maxReachedAtMs)&&s.maxReachedAtMs>=0);
 let wall=0,Q=0,combat=0,internal=0,draws=0;
 for(const [k,g]of Object.entries(s.groups)){
  assert.match(k,/^(online|offline)\/(main|coal|iron|gold)\/(preMax|afterMax)$/);
  for(const n of Object.values(g))assert.ok(Number.isSafeInteger(n)&&n>=0);
  wall+=(g.combatMs??0)+(g.internalTransitionMs??0)+(g.externalTransitionMs??0)+(g.pausedMs??0)+(g.unclassifiedMs??0);Q+=g.qualifiedVictoryMs??0;combat+=g.combatMs??0;internal+=g.internalTransitionMs??0;
  assert.equal(g.qualifiedVictoryMs??0,(g.sameEncounterBaseMs??0)+(g.referenceLossMs??0)+(g.benchmarkLossMs??0)+(g.maximumCapLossMs??0));assert.equal(g.creditMs??0,(g.sameEncounterBaseMs??0)+(g.directExtraMs??0));
 }
 assert.equal(wall,s.nativeWallMs);assert.ok(Q<=combat+internal,'QUALIFIED_TIME_EXCEEDS_OBSERVED_TIME');for(const n of Object.values(s.rng))draws+=n;assert.equal(draws,s.drawCount);assert.equal(Object.values(s.actions).reduce((a,b)=>a+b,0),s.actionCount);assert.equal(Object.values(s.decisions).reduce((a,b)=>a+b,0),s.decisionCount);
 assert.equal(Object.values(s.actionCategories).reduce((a,b)=>a+b,0),s.actionCount);for(const totals of [s.actionDebits,s.actionCredits])for(const n of Object.values(totals))assert.match(n,/^(0|[1-9][0-9]*)$/);
 for(const [i,d]of s.days.entries()){assert.equal(d.day,i+1);for(const k of ['drawDigest','actionDigest','decisionDigest'])assert.match(d[k],/^[a-f0-9]{64}$/);for(const k of ['drawCount','actionCount','decisionCount'])assert.ok(d[k]>=0&&(i===0||d[k]>=s.days[i-1][k]));}for(const k of ['drawCount','actionCount','decisionCount'])assert.equal(s.days.at(-1)?.[k]??0,s[k]);return true;
}
