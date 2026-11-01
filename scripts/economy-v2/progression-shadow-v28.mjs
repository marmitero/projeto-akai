// Diagnostic banks only: these values never feed the native campaign or its RNG.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {ECONOMY_XP_V2} from '../../packages/shared/dist/economy-v2.js';
import {quoteMasterySegmentsV26} from '../../packages/shared/dist/progression-bonus-v26/index.js';
import {WORLD_START_V24 as WORLD} from './progression-panel-v24.mjs';
export const MAX_V28=ECONOMY_XP_V2[999],DAY_V28=86400000,LEDGER_LIMIT_V28=100000;
export const shaV28=x=>createHash('sha256').update(x).digest('hex');
const safe=x=>assert.ok(Number.isSafeInteger(x)&&x>=0,'INVALID_SHADOW_COUNTER');
const bank=()=>({masteryMs:0,carry:0,witness:null});
export function initialShadowV28(start){safe(start);return {version:'progression-shadow-v28-1',start,ordinal:0,lastAt:start,qualifiedMs:0,groups:{},banks:{zero:bank(),h26:bank(),oracle:bank()},days:[]};}
export function segmentsV28(from,to,offline){
 safe(from);safe(to);assert.ok(to>from);assert.equal(typeof offline,'boolean');const out=[];let cursor=from;
 while(cursor<to){const day=Math.floor((cursor-WORLD)/DAY_V28),base=WORLD+day*DAY_V28,hour=(cursor-base)/3600000,guild=cursor>=WORLD+7*DAY_V28?1000:0,event=!offline&&hour>=12&&hour<18?3000:0,end=Math.min(to,...[base+12*3600000,base+18*3600000,base+DAY_V28,WORLD+7*DAY_V28].filter(t=>t>cursor));out.push({ms:end-cursor,bonusBps:guild+event});cursor=end;}
 return out;
}
export function applyVictoryV28(s,row,benchmark){
 assert.deepEqual(Object.keys(row).sort(),['Q','activity','after','at','before','floor','offline','reference'].sort(),'LEDGER_FIELDS');
 for(const x of [row.at,row.Q,row.floor,row.reference,row.before.masteryMs,row.before.carry,row.after.masteryMs,row.after.carry])safe(x);
 assert.ok(row.at>s.lastAt&&row.Q>0&&row.Q<=row.at-s.lastAt,'LEDGER_TIME_ORDER');assert.ok(['main','coal','iron','gold'].includes(row.activity));assert.ok(row.floor>=1&&row.floor<=1000&&row.reference>=1&&row.reference<=1000);assert.equal(typeof row.offline,'boolean');
 for(const v of [row.before,row.after]){assert.deepEqual(Object.keys(v).sort(),['carry','masteryMs']);assert.ok(v.masteryMs<=MAX_V28&&v.carry<1000000);}
 assert.equal(s.banks.zero.masteryMs,row.before.masteryMs,'ZERO_PREFIX_MASTERY');assert.equal(s.banks.zero.carry,row.before.carry,'ZERO_PREFIX_CARRY');
 s.ordinal++;s.lastAt=row.at;s.qualifiedMs+=row.Q;safe(s.qualifiedMs);const phase=row.before.masteryMs===MAX_V28?'afterMax':'preMax',key=`${row.offline?'offline':'online'}/${row.activity}/${phase}`,g=s.groups[key]??(s.groups[key]={qualifiedMs:0,creditMs:0,victories:0});g.qualifiedMs+=row.Q;g.creditMs+=row.after.masteryMs-row.before.masteryMs;g.victories++;
 const segments=segmentsV28(row.at-row.Q,row.at,row.offline);
 for(const name of ['zero','h26','oracle']){
  const b=s.banks[name],before={masteryMs:b.masteryMs,carry:b.carry};let result;
  if(name==='oracle')result={masteryMs:Math.min(MAX_V28,b.masteryMs+row.Q),carry:0};
  else result=quoteMasterySegmentsV26({masteryMs:b.masteryMs,carry:b.carry,qualifiedMs:row.Q,reference:row.reference,segments:name==='zero'?[{ms:row.Q,bonusBps:0}]:segments},benchmark);
  assert.ok(result.masteryMs>=b.masteryMs&&result.masteryMs-b.masteryMs<=row.Q,'SHADOW_TIME_CEILING');b.masteryMs=result.masteryMs;b.carry=result.carry;
  if(!b.witness&&b.masteryMs===MAX_V28){assert.ok(row.at-s.start>=MAX_V28&&s.qualifiedMs>=MAX_V28,'SHADOW_96DAY_FLOOR');b.witness={at:row.at,ordinal:s.ordinal,qualifiedMs:s.qualifiedMs,before,after:{masteryMs:b.masteryMs,carry:b.carry},eventHash:shaV28(JSON.stringify(row))};}
 }
 assert.equal(s.banks.zero.masteryMs,row.after.masteryMs,'ZERO_VICTORY_MASTERY');assert.equal(s.banks.zero.carry,row.after.carry,'ZERO_VICTORY_CARRY');assert.ok(s.banks.h26.masteryMs>=s.banks.zero.masteryMs,'H26_SHADOW_BELOW_ZERO');assert.ok(s.banks.oracle.masteryMs>=s.banks.h26.masteryMs,'ORACLE_BELOW_SHADOW');
 return s;
}
export function finishShadowDayV28(s,day,events,archive){
 assert.equal(day,s.days.length+1);assert.ok(Array.isArray(events)&&events.length<=LEDGER_LIMIT_V28);const raw=Buffer.from(JSON.stringify(events)+'\n'),bytes=archive??gzipSync(raw,{level:6});
 const previous=s.days.at(-1)?.chainHash??'0'.repeat(64),rawHash=shaV28(raw),archiveHash=shaV28(bytes),chainHash=shaV28(previous+'\n'+day+'\n'+rawHash);
 const record={day,eventCount:events.length,rawHash,archiveHash,chainHash,ordinal:s.ordinal,qualifiedMs:s.qualifiedMs,lastAt:s.lastAt,banks:structuredClone(s.banks)};s.days.push(record);return {record,archive:bytes,raw};
}
export function decodeDayV28(archive,record){
 assert.equal(shaV28(archive),record.archiveHash,'LEDGER_ARCHIVE_HASH');const raw=gunzipSync(archive,{maxOutputLength:64*1024*1024});assert.equal(shaV28(raw),record.rawHash,'LEDGER_RAW_HASH');const rows=JSON.parse(raw);assert.ok(Array.isArray(rows)&&rows.length<=LEDGER_LIMIT_V28);assert.equal(rows.length,record.eventCount);return rows;
}
export function validateShadowV28(s,trace,c){
 assert.equal(s.version,'progression-shadow-v28-1');assert.equal(s.days.length,c.day);assert.equal(s.banks.zero.masteryMs,c.run.economy.masteryMs);assert.equal(s.banks.zero.carry,c.run.xpCarry);
 assert.equal(s.banks.zero.witness?.at??null,trace.maxReachedAtMs);assert.equal(s.ordinal,s.days.at(-1)?.ordinal??0);assert.ok(s.qualifiedMs<=c.activeFarmMs+c.offlineMs);assert.ok(s.lastAt<=s.start+c.day*DAY_V28);
 for(const name of ['zero','h26','oracle']){const b=s.banks[name];safe(b.masteryMs);safe(b.carry);assert.ok(b.masteryMs<=MAX_V28&&b.carry<1000000);assert.equal(b.witness!==null,b.masteryMs===MAX_V28);if(b.witness){assert.ok(b.witness.at>=s.start+MAX_V28&&b.witness.at<=s.start+c.day*DAY_V28);assert.equal(b.carry,0);}}
 const keys=[...new Set([...Object.keys(s.groups),...Object.keys(trace.groups)])];let Q=0,n=0;
 for(const k of keys){const a=s.groups[k]??{qualifiedMs:0,creditMs:0,victories:0},b=trace.groups[k]??{};assert.equal(a.qualifiedMs,b.qualifiedVictoryMs??0);assert.equal(a.creditMs,b.creditMs??0);assert.equal(a.victories,b.victories??0);Q+=a.qualifiedMs;n+=a.victories;}
 assert.equal(Q,s.qualifiedMs);assert.equal(n,s.ordinal);return true;
}
