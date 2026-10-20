import {describe,it,expect} from 'vitest';
import {completeHuntV4,huntEnemyV4,huntVictoryPlanV4,selectActivityV4,HUNT_IDS} from './hunts-v4.js';
import {initialEconomyV2} from './economy-v2.js';
import {floorDefinition} from './content.js';
import {startCombatV3,advanceCombatV3} from './combat-v3.js';
import {presetBuildV3} from './build-presets-v3.js';
import {heroStatsV3} from './builds-v3.js';
const state=()=>initialEconomyV2('00000000-0000-4000-8000-000000000001',0);
describe('R4 hunts and single activity',()=>{
 it('locks entry, prevents skips and boss repeats, preserves independent floors',()=>{
  const s=state();expect(()=>selectActivityV4(s,'coal',1,0,0)).toThrow('LOCKED');s.highest.main=20;
  for(const k of HUNT_IDS){const n=selectActivityV4(s,k,1,0,0);expect(n.activity).toBe(k);expect(n.highest).toEqual(s.highest);expect(n.revision).toBe(1);}
  expect(()=>selectActivityV4(s,'iron',2,0,0)).toThrow('NOT_UNLOCKED');
  expect(()=>selectActivityV4(s,'main',10,0,0)).toThrow('NOT_REPEATABLE');expect(selectActivityV4(s,'main',19,0,0).floor).toBe(19);
  expect(()=>selectActivityV4(s,'coal',1,1,0)).toThrow('STALE');expect(()=>selectActivityV4(s,'coal',1,0,1)).toThrow('NOT_SETTLED');
  expect(s.activity).toBe('main');expect(s.revision).toBe(0);
 });
 it('advances only the selected hunt on confirmed victory, rejects replay and preserves balances',()=>{
  const s=state();s.highest.main=20;const a=selectActivityV4(s,'coal',1,0,0),win=completeHuntV4(a,'coal',1,1,'victory');
  expect(win.state.highest).toEqual({main:20,coal:1,iron:0,gold:0});expect(win.state.balances).toEqual(s.balances);
  expect(()=>completeHuntV4(win.state,'coal',1,1,'victory')).toThrow('STALE');expect(()=>completeHuntV4(a,'iron',1,1,'victory')).toThrow('CHANGED');
  const next=selectActivityV4(win.state,'coal',2,2,0);expect(completeHuntV4(next,'coal',2,3,'defeat').state.highest.coal).toBe(1);
  expect(completeHuntV4(next,'coal',2,3,'timeout').plan.amount).toBe('0');
 });
 it('uses boss strength anchors with monotone difficulty/materials across all 1000 floors',()=>{
  expect(huntEnemyV4('coal',1).stats.maxHp).toBe(floorDefinition(10).hp);
  for(let f=1;f<=1000;f++){
   const [c,i,g]=HUNT_IDS.map(k=>huntEnemyV4(k,f));
   expect(i!.stats.maxHp).toBeGreaterThan(c!.stats.maxHp);expect(g!.stats.maxHp).toBeGreaterThan(i!.stats.maxHp);
   expect(g!.stats.attack).toBeGreaterThanOrEqual(i!.stats.attack);expect(i!.stats.attack).toBeGreaterThanOrEqual(c!.stats.attack);
   for(const k of HUNT_IDS){const e=huntEnemyV4(k,f);expect(e.material).toBeGreaterThan(0);if(f>1){const p=huntEnemyV4(k,f-1);expect(e.stats.maxHp).toBeGreaterThanOrEqual(p.stats.maxHp);expect(e.material).toBeGreaterThanOrEqual(p.material);}}
  }
 });
 it('plans only the own material on victory; no drops on losses or partial fights',()=>{
  for(const k of HUNT_IDS)for(const result of ['victory','defeat','timeout','fighting'] as const){const p=huntVictoryPlanV4(k,10,result);expect(p.coin).toBe('0');expect(p.jade).toBe('0');expect(p.equipment||p.protection).toBe(false);expect(BigInt(p.amount)>0n).toBe(result==='victory');}
  expect(()=>huntEnemyV4('coal',0)).toThrow();expect(()=>huntEnemyV4('coal',1001)).toThrow();
 });
 it('uses the R3 clock with exclusive 30s deadline, deterministic resume and no mutation',()=>{
  const e=huntEnemyV4('gold',750),hero=heroStatsV3(presetBuildV3(1000,'swift','epic9'));
  const c=startCombatV3(hero,[e],{seed:4213,floor:e.reference,deadlineMs:e.deadlineMs});
  const batch=advanceCombatV3(c,60000).state;let small=c;for(let t=1000;t<=60000;t+=1000)small=advanceCombatV3(small,t).state;
  expect(small).toEqual(batch);expect(c.sequence).toBe(0);expect(batch.clockMs).toBeLessThanOrEqual(30000);
 });
});
