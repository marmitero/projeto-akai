// Isolated H29 model. This module is never imported by a game consumer.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {WORLD_START_V24 as WORLD,DAY_V24 as DAY} from './progression-panel-v24.mjs';
import {quoteMasteryV22} from '../../packages/shared/dist/progression-bonus-v22/index.js';
const MAX=8294400000;
export const shaV29=x=>createHash('sha256').update(x).digest('hex');
const safe=x=>assert.ok(Number.isSafeInteger(x)&&x>=0,'INVALID_CADENCE_COUNTER');
const gcd=(a,b)=>b?gcd(b,a%b):a;
export function guildBpsV29(rank){assert.ok(Number.isInteger(rank)&&rank>=1&&rank<=10000);return rank===1?1000:rank===2?700:rank===3?500:rank<=10?300:100;}
export function waitRateV29(at,offline,mode='calendar',rank=1){
 safe(at);assert.ok(at>=WORLD);assert.equal(typeof offline,'boolean');assert.ok(['zero','calendar'].includes(mode));const base=WORLD+Math.floor((at-WORLD)/DAY)*DAY,h=(at-base)/3600000;
 return {bonusBps:mode==='zero'?0:(at>=WORLD+7*DAY?guildBpsV29(rank):0)+(!offline&&h>=12&&h<18?3000:0),boundary:Math.min(...[base+12*3600000,base+18*3600000,base+DAY,WORLD+7*DAY].filter(x=>x>at))};
}
/** Exact rational remaining work. Each new wait starts with 3000 native work-ms.
 * Calendar changes split this same wait; integer completion uses ceil, never early credit.
 * Native offline-entry/return, manual selection and pause discard it rather than carry a bonus. */
export function quoteWaitV29({at,offline,mode='calendar',rank=1}){
 safe(at);let cursor=at,n=3000n,d=1n;const segments=[];
 while(n>0n){const {bonusBps,boundary}=waitRateV29(cursor,offline,mode,rank),den=BigInt(10000-bonusBps),need=Number((n*den+d*10000n-1n)/(d*10000n)),ms=Math.min(need,boundary-cursor);assert.ok(ms>0);
  segments.push({from:cursor,to:cursor+ms,bonusBps});cursor+=ms;
  if(ms===need)break;
  n=n*den-BigInt(ms)*10000n*d;d*=den;const g=gcd(n,d);n/=g;d/=g;
 }
 safe(cursor);assert.ok(cursor-at>=1800&&cursor-at<=3000,'WAIT_TIME_LIMIT');return {until:cursor,durationMs:cursor-at,segments};
}
export function initialCadenceV29(mode,start){assert.ok(['zero','calendar'].includes(mode));safe(start);return {version:'progression-cadence-v29-1',mode,start,lastAt:start,scheduled:0,completed:0,cancelled:0,nominalMs:0,scheduledMs:0,potentialSavedMs:0,qualifiedMs:0,masteryMs:0,carry:0,maxReachedAtMs:null,groups:{},pending:null,lastStarted:null,eventCount:0,days:[]};}
const counters=s=>Object.fromEntries(['lastAt','scheduled','completed','cancelled','nominalMs','scheduledMs','potentialSavedMs','qualifiedMs','masteryMs','carry','maxReachedAtMs','eventCount','groups','pending','lastStarted'].map(k=>[k,structuredClone(s[k])]));
export function applyCadenceEventV29(s,row,benchmark){
 assert.ok(row&&typeof row==='object');safe(row.at);assert.ok(row.at>=s.lastAt,'CADENCE_TIME_ORDER');safe(row.id);assert.ok(row.id>0);
 if(row.kind==='schedule'){
  assert.deepEqual(Object.keys(row).sort(),['kind','id','at','until','offline','activity','floor','reference','Q','before','after'].sort());assert.equal(s.pending,null,'DOUBLE_PENDING_WAIT');assert.equal(row.id,s.scheduled+1);assert.ok(['main','coal','iron','gold'].includes(row.activity));assert.equal(typeof row.offline,'boolean');
  for(const x of [row.Q,row.floor,row.reference,row.before.masteryMs,row.before.carry,row.after.masteryMs,row.after.carry])safe(x);assert.ok(row.Q>0&&row.floor>=1&&row.floor<=1000&&row.reference>=1&&row.reference<=1000);for(const b of [row.before,row.after]){assert.deepEqual(Object.keys(b).sort(),['masteryMs','carry'].sort());assert.ok(b.masteryMs<=MAX&&b.carry<1000000);}
  assert.deepEqual(row.before,{masteryMs:s.masteryMs,carry:s.carry},'NATIVE_CREDIT_PREFIX');assert.ok(row.after.masteryMs>=row.before.masteryMs&&row.after.masteryMs-row.before.masteryMs<=row.Q);assert.ok(row.Q<=row.at-(s.lastVictoryAt??s.start),'QUALIFIED_TIME_ORDER');
  if(benchmark){const q=quoteMasteryV22({...row.before,qualifiedMs:row.Q,reference:row.reference,bonusBps:0},benchmark);assert.deepEqual(row.after,{masteryMs:q.masteryMs,carry:q.carry},'NON_NATIVE_MASTERY');}
  const quote=quoteWaitV29({at:row.at,offline:row.offline,mode:s.mode});assert.equal(row.until,quote.until,'WAIT_QUOTE_MISMATCH');s.scheduled++;s.nominalMs+=3000;s.scheduledMs+=quote.durationMs;s.potentialSavedMs+=3000-quote.durationMs;s.qualifiedMs+=row.Q;s.lastVictoryAt=row.at;s.masteryMs=row.after.masteryMs;s.carry=row.after.carry;
  const key=`${row.offline?'offline':'online'}/${row.activity}/${row.before.masteryMs===MAX?'afterMax':'preMax'}`,g=s.groups[key]??(s.groups[key]={victories:0,qualifiedMs:0,creditMs:0});g.victories++;g.qualifiedMs+=row.Q;g.creditMs+=row.after.masteryMs-row.before.masteryMs;
  if(s.maxReachedAtMs===null&&s.masteryMs===MAX){assert.ok(row.at-s.start>=MAX&&s.qualifiedMs>=MAX,'CADENCE_96DAY_FLOOR');s.maxReachedAtMs=row.at;}
  s.pending=structuredClone(row);
 }else if(row.kind==='start'){
  assert.deepEqual(Object.keys(row).sort(),['kind','id','at'].sort());assert.ok(s.pending,'START_WITHOUT_WAIT');assert.equal(row.id,s.pending.id);assert.equal(row.at,s.pending.until,'EARLY_OR_LATE_START');s.completed++;s.lastStarted=s.pending;s.pending=null;
 }else{
  assert.equal(row.kind,'cancel');assert.deepEqual(Object.keys(row).sort(),['kind','id','at','reason'].sort());assert.ok(['action','offline-entry','offline-return','reset','weekly'].includes(row.reason));assert.ok(s.pending,'CANCEL_WITHOUT_WAIT');assert.equal(row.id,s.pending.id);s.cancelled++;s.pending=null;s.lastStarted=null;
 }
 s.lastAt=row.at;s.eventCount++;for(const k of ['scheduled','completed','cancelled','nominalMs','scheduledMs','potentialSavedMs','qualifiedMs','eventCount'])safe(s[k]);assert.equal(s.completed+s.cancelled+(s.pending?1:0),s.scheduled);assert.equal(s.scheduledMs+s.potentialSavedMs,s.nominalMs);return s;
}
export function finishCadenceDayV29(s,day,events,bytes){
 assert.equal(day,s.days.length+1);assert.ok(Array.isArray(events)&&events.length<=100000);const raw=Buffer.from(JSON.stringify(events)+'\n'),archive=bytes??gzipSync(raw,{level:6}),rawHash=shaV29(raw),archiveHash=shaV29(archive),chainHash=shaV29((s.days.at(-1)?.chainHash??'0'.repeat(64))+'\n'+day+'\n'+rawHash),record={day,eventCount:events.length,rawHash,archiveHash,chainHash,...counters(s),lastVictoryAt:s.lastVictoryAt??null};
 // eventCount in the record is the cumulative counter; daily count is separate.
 record.dailyEvents=events.length;s.days.push(record);return {record,archive};
}
export function decodeCadenceDayV29(bytes,record){assert.equal(shaV29(bytes),record.archiveHash,'WAIT_ARCHIVE_HASH');const raw=gunzipSync(bytes,{maxOutputLength:64*1024*1024});assert.equal(shaV29(raw),record.rawHash,'WAIT_RAW_HASH');const events=JSON.parse(raw);assert.ok(Array.isArray(events)&&events.length<=100000);assert.equal(events.length,record.dailyEvents);return events;}
export function createCadenceV29({mode,start,saved}={}){
 const state=saved?structuredClone(saved):initialCadenceV29(mode,start);assert.equal(state.mode,mode);assert.equal(state.start,start);let events=[];
 const emit=row=>{assert.ok(events.length<100000,'DAILY_WAIT_LEDGER_LIMIT');applyCadenceEventV29(state,row);events.push(structuredClone(row));};
 const cancel=(at,reason)=>{if(state.pending)emit({kind:'cancel',id:state.pending.id,at,reason});};
 return {state,
  schedule(s,at,e,v){assert.ok(v&&v.at===at);const quote=quoteWaitV29({at,offline:!!s.offlineJob,mode});emit({kind:'schedule',id:state.scheduled+1,at,until:quote.until,offline:!!s.offlineJob,activity:e.activity,floor:e.floor,reference:e.reference,Q:v.Q,before:v.before,after:v.after});return quote.until;},
  start(s,at){if(state.pending)emit({kind:'start',id:state.pending.id,at});},cancel,
  sync(s){if(state.pending&&(s.paused||s.encounter||s.nextAt!==state.pending.until))cancel(s.economy.economicThroughMs,'reset');},
  externalFrom(s,until){const row=state.pending?.until===until?state.pending:state.lastStarted?.until===until?state.lastStarted:null;return row?row.at:until-3000;},
  finishDay(day){const r=finishCadenceDayV29(state,day,events);events=[];return {...r,state:structuredClone(state)};},
  snapshot(){assert.equal(events.length,0,'UNCOMMITTED_DAILY_EVENTS');return structuredClone(state);},
 };
}
export function validateCadenceV29(s,trace,c){
 assert.equal(s.version,'progression-cadence-v29-1');assert.equal(s.days.length,c.day);assert.equal(s.masteryMs,c.run.economy.masteryMs);assert.equal(s.carry,c.run.xpCarry);assert.equal(s.maxReachedAtMs,trace.maxReachedAtMs);assert.equal(s.completed+s.cancelled+(s.pending?1:0),s.scheduled);assert.equal(s.nominalMs,3000*s.scheduled);assert.equal(s.nominalMs,s.scheduledMs+s.potentialSavedMs);if(s.mode==='zero')assert.equal(s.potentialSavedMs,0);
 let n=0,Q=0;for(const k of new Set([...Object.keys(s.groups),...Object.keys(trace.groups)])){const a=s.groups[k]??{},b=trace.groups[k]??{};assert.equal(a.victories??0,b.victories??0);assert.equal(a.qualifiedMs??0,b.qualifiedVictoryMs??0);assert.equal(a.creditMs??0,b.creditMs??0);assert.equal(b.directExtraMs??0,0,'MASTERY_BONUS_FORBIDDEN');n+=a.victories??0;Q+=a.qualifiedMs??0;}assert.equal(n,s.scheduled);assert.equal(Q,s.qualifiedMs);assert.ok(Q<=c.activeFarmMs+c.offlineMs);
 if(s.pending){assert.equal(c.run.encounter,null);assert.equal(c.run.nextAt,s.pending.until);assert.equal(c.run.paused,false);}return true;
}
