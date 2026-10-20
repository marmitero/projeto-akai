import {describe,it,expect} from 'vitest';
import {initialRunV6,advanceRunV6,applyEconomyActionV6,type EconomyRunV6} from './economy-run-v6.js';
import {beginOfflineV7,drainOfflineV7,settleElapsedV7,offlineDayV7,OFFLINE_LIMIT_V7} from './offline-v7.js';
import {ECONOMY_XP_V2,masteryLevel} from './economy-v2.js';
import {heroStatsV3} from './builds-v3.js';
import {presetBuildV3} from './build-presets-v3.js';
const ID='00000000-0000-4000-8000-000000000001';
const at=Date.parse('2026-10-20T12:00:00-03:00');
function fixture(start=at){const s=initialRunV6(ID,start);s.economy=presetBuildV3(1000,'swift','epic9');s.economy.accountId=ID;s.economy.economicThroughMs=start;s.economy.highest={main:1000,coal:1,iron:1,gold:1};s.economy.activity='coal';s.economy.floor=1;return s;}
function drain(s:EconomyRunV6,budget=100000){for(let i=0;i<10000;i++){const r=drainOfflineV7(s,budget);expect(r.processed).toBeLessThanOrEqual(budget);s=r.state;if(!r.backlog)return s;}throw Error('stalled');}
function normalized(s:EconomyRunV6){const c=structuredClone(s);c.economy.revision=0;return c;}
describe('R7 bounded offline',()=>{
 it('uses IANA Brasília midnight and rejects backwards clocks without mutating input',()=>{
  const midnight=Date.parse('2026-10-21T00:00:00-03:00');expect(offlineDayV7(midnight-1)).toBe('2026-10-20');expect(offlineDayV7(midnight)).toBe('2026-10-21');
  const s=fixture();expect(()=>beginOfflineV7(s,at-1)).toThrow('CLOCK_REWIND');expect(s.offlineJob).toBeNull();
 });
 it('caps one absence to8h even when it spans several days and does not replay on reconnect',()=>{
  const s=fixture();s.paused=true;const r=settleElapsedV7(s,at+3*86400000).state;expect(r.killSequence).toBe(0);expect(r.economy.economicThroughMs).toBe(at+3*86400000);
  const active=fixture(),job=beginOfflineV7(active,at+3*86400000);expect(job.offlineJob!.untilMs).toBe(at+OFFLINE_LIMIT_V7);
  // Small remaining daily quota exercises the long-absence path without a large fixture.
  active.economy.offline={day:offlineDayV7(at),usedMs:OFFLINE_LIMIT_V7-10000};const done=drain(beginOfflineV7(active,at+3*86400000));expect(done.killSequence).toBeGreaterThan(0);expect(done.economy.offline.usedMs).toBe(0);expect(done.economy.offline.day).toBe('2026-10-23');
  expect(settleElapsedV7(done,done.economy.economicThroughMs).state.killSequence).toBe(done.killSequence);
 });
 it('segments midnight, shares the daily quota across absences and never credits skipped quota time',()=>{
  const start=Date.parse('2026-10-20T23:59:55-03:00'),s=fixture(start);s.economy.offline={day:'2026-10-20',usedMs:OFFLINE_LIMIT_V7-2000};
  const done=drain(beginOfflineV7(s,start+15000));expect(done.economy.offline).toEqual({day:'2026-10-21',usedMs:10000});
  const again=drain(beginOfflineV7(done,start+25000));expect(again.economy.offline.usedMs).toBe(20000);
  again.economy.offline.usedMs=OFFLINE_LIMIT_V7;const capped=drain(beginOfflineV7(again,start+35000));expect(capped.killSequence).toBe(again.killSequence);expect(capped.economy.offline.usedMs).toBe(OFFLINE_LIMIT_V7);
 });
 it('matches the same frozen active schedule including XP, material, PRNG and JSON/backlog resumption',()=>{
  const s=fixture(),end=at+120000;let active=structuredClone(s);active.autoAdvance=false;active.nextAt=at+3000;active=advanceRunV6(active,end,100000).state;
  const job=beginOfflineV7(s,end),all=drain(job),small=drain(JSON.parse(JSON.stringify(job)),7);
  expect(normalized(small)).toEqual(normalized(all));expect(all.economy.balances).toEqual(active.economy.balances);expect(all.economy.masteryMs).toBe(active.economy.masteryMs);expect(all.seed).toBe(active.seed);expect(all.killSequence).toBe(active.killSequence);expect(all.xpCarry).toBe(active.xpCarry);
  expect(all.economy.balances.coin).toBe('0');expect(all.economy.balances.jade).toBe('0');expect(all.economy.inventory).toEqual(s.economy.inventory);expect(all.economy.highest).toEqual(s.economy.highest);
 });
 it('freezes stats across level gains and rejects mutations/active processing until job completes',()=>{
  const s=fixture();s.economy.activity='main';s.economy.floor=999;const job=beginOfflineV7(s,at+120000),stats=job.offlineJob!.stats;
  expect(()=>applyEconomyActionV6(job,{type:'auto',enabled:true})).toThrow('SETTLEMENT_PENDING');expect(()=>advanceRunV6(job,at+100)).toThrow('SETTLEMENT_PENDING');
  const partial=drainOfflineV7(job,1);expect(partial.backlog).toBe(true);expect(partial.state.offlineJob!.stats).toEqual(stats);expect(partial.state.encounter!.combat.actors[0]!.stats).toEqual(stats);expect(()=>settleElapsedV7(partial.state,at+1000)).toThrow('CLOCK_REWIND');
  expect(drain(partial.state).offlineJob).toBeNull();expect(s.offlineJob).toBeNull();
 });
 it('keeps the original combat stats after an offline level boundary and preserves tower drop rolls',()=>{
  let s=initialRunV6(ID,at);s.economy=presetBuildV3(2,'balanced','epic9');s.economy.economicThroughMs=at;s.economy.masteryMs=ECONOMY_XP_V2[2]!-1;s.economy.highest.main=1;
  const frozen=heroStatsV3(s.economy);let p=beginOfflineV7(s,at+120000),checked=false;
  for(let i=0;i<100;i++){const r=drainOfflineV7(p,1);p=r.state;if(masteryLevel(p.economy.masteryMs)>2&&p.encounter){expect(p.encounter.combat.actors[0]!.stats).toMatchObject({attack:frozen.attack,maxHp:frozen.maxHp,intervalMs:frozen.intervalMs});checked=true;break;}if(!r.backlog)break;}expect(checked).toBe(true);
  s=fixture();s.economy.activity='main';s.economy.floor=101;const entropy=()=>0,job=beginOfflineV7(s,at+60000);let offline=job;for(let i=0;i<100;i++){const r=drainOfflineV7(offline,9,entropy);offline=JSON.parse(JSON.stringify(r.state));if(!r.backlog)break;}
  let active=structuredClone(s);active.autoAdvance=false;active.nextAt=at+3000;active=advanceRunV6(active,at+60000,100000,entropy,job.offlineJob!.stats).state;
  expect(offline.killSequence).toBe(active.killSequence);expect(offline.economy.inventory).toEqual(active.economy.inventory);expect(offline.economy.protection).toBe(active.economy.protection);expect(offline.economy.balances).toEqual(active.economy.balances);
  expect(settleElapsedV7(offline,at+60000).state.economy.inventory).toEqual(offline.economy.inventory);
 });
 it('uses cleared selected floors, excludes tower bosses and never changes independent progress',()=>{
  const s=fixture();s.economy.activity='main';s.economy.floor=1000;const job=beginOfflineV7(s,at+20000);expect(job.economy.floor).toBe(999);expect(job.autoAdvance).toBe(false);const done=drain(job);expect(done.economy.highest).toEqual(s.economy.highest);expect(done.economy.floor).toBe(1000);expect(done.log.some(l=>l.text.includes('main 1000'))).toBe(false);
  const starter=initialRunV6(ID,at),empty=settleElapsedV7(starter,at+60000).state;expect(empty.killSequence).toBe(0);expect(empty.economy.masteryMs).toBe(0);expect(empty.economy.offline.usedMs).toBe(0);
 });
 it('stops on defeat without advancing and never resumes fighting later in the same absence',()=>{
  const s=initialRunV6(ID,at);s.economy.floor=999;s.economy.highest.main=999;const done=drain(beginOfflineV7(s,at+60000));expect(done.paused).toBe(true);expect(done.economy.highest.main).toBe(999);expect(done.killSequence).toBe(0);expect(done.economy.masteryMs).toBe(0);expect(done.economy.offline.usedMs).toBeLessThan(60000);expect(done.economy.economicThroughMs).toBe(at+60000);
 });
});
