import {describe,it,expect} from 'vitest';
import {initialEconomyV2,ECONOMY_XP_V2,type EconomyV2} from './economy-v2.js';
import {attributeCost,trainAttribute,heroStatsV3,validateBuild,ATTACK_INTERVAL_V3} from './builds-v3.js';
import {startCombatV3,advanceCombatV3,attackDamageV3,hitChancePpm,type CombatStatsV3} from './combat-v3.js';
import {commonEnemyV3} from './enemies-v3.js';
const state=()=>initialEconomyV2('00000000-0000-4000-8000-000000000001',0);
const stats=(s:Partial<CombatStatsV3>={}):CombatStatsV3=>({attack:100,maxHp:100000,physicalDefense:0,magicDefense:0,intervalMs:1000,dexterity:0,evasion:0,criticalPpm:5000,physicalShareBp:10000,...s});
const fight=()=>startCombatV3(stats(),[{id:'enemy',stats:stats({attack:50})}],{seed:4213,floor:100});
describe('R3 builds and spending',()=>{
 it('spends exact integer milestone costs atomically and respects weighted budget',()=>{
  const s=state();s.masteryMs=ECONOMY_XP_V2[10]!;s.attributes.force=9;s.balances.coin='1000000000';
  const before=structuredClone(s);expect(()=>trainAttribute(s,'force')).toThrow('INSUFFICIENT');expect(s).toEqual(before);
  s.balances.iron='25000';const r=trainAttribute(s,'force');expect(r.cost.iron).toBe('25000');expect(r.state.attributes.force).toBe(10);expect(s.attributes.force).toBe(9);
  expect(attributeCost('force',11).iron).toBe('0');expect(attributeCost('force',50).coal).toBe('50000');expect(attributeCost('force',200).gold).toBe('40000');
  expect(attributeCost('agility',1).coin).toBe('150000');expect(BigInt(attributeCost('force',1000).coin)>0n).toBe(true);
  const low=state();low.masteryMs=ECONOMY_XP_V2[1]!;low.attributes.agility=1;low.attributes.force=1;expect(()=>validateBuild(low)).not.toThrow();low.attributes.force=2;expect(()=>validateBuild(low)).toThrow('BUDGET');
 });
 it('caps speed at 5/s only with late training and full advanced equipment',()=>{
  expect(ATTACK_INTERVAL_V3[0]).toBe(1000);expect(ATTACK_INTERVAL_V3[1000]).toBe(200);
  for(let i=1;i<=1000;i++)expect(ATTACK_INTERVAL_V3[i]!).toBeLessThanOrEqual(ATTACK_INTERVAL_V3[i-1]!);
  const s=state();s.masteryMs=ECONOMY_XP_V2[999]!;s.attributes.agility=800;
  expect(heroStatsV3(s).intervalMs).toBeGreaterThan(200);
  const slots={weapon:'dagger',shield:'shield',chest:'armor',head:'hat',hands:'gloves',feet:'boots',neck:'pendant',ring1:'ring',ring2:'ring'} as const;
  s.inventory=[];
  for(const [slot,definitionId] of Object.entries(slots)){const id='test-'+slot;s.inventory.push({id,definitionId,rarity:'legendary',origin:'tower',level:100,enhancement:20,qualityBp:10000});s.equipped[slot as keyof EconomyV2['equipped']]=id;}
  expect(heroStatsV3(s).gearAgility).toBe(200);expect(heroStatsV3(s).intervalMs).toBe(200);
  s.attributes.agility=801;expect(()=>heroStatsV3(s)).toThrow('CAP');
 });
 it('makes luck and dexterity distinct from speed and attack',()=>{
  const s=state();s.masteryMs=ECONOMY_XP_V2[999]!;const initial=heroStatsV3(s);
  s.attributes.luck=1000;s.attributes.dexterity=1000;const trained=heroStatsV3(s);
  expect(trained.criticalPpm).toBe(45000);expect(hitChancePpm(trained,stats())).toBe(99500);
  expect(trained.intervalMs).toBe(initial.intervalMs);expect(trained.attack).toBe(initial.attack);
 });
});
describe('R3 hit pipeline and event clock',()=>{
 it('applies separate defenses to pure and mixed damage, with critical after hit and positive floor',()=>{
  const physical=stats(),magic=stats({physicalShareBp:0}),mixed=stats({physicalShareBp:5000});
  const df=stats({physicalDefense:100000}),dm=stats({magicDefense:100000});
  expect(attackDamageV3(physical,df,100,false)).toBeLessThan(attackDamageV3(physical,dm,100,false));
  expect(attackDamageV3(magic,dm,100,false)).toBeLessThan(attackDamageV3(magic,df,100,false));
  expect(attackDamageV3(mixed,df,100,false)).toBeGreaterThan(attackDamageV3(physical,df,100,false));
  expect(attackDamageV3(stats({attack:1}),stats({physicalDefense:1e12}),1,false)).toBe(1);
  expect(attackDamageV3(physical,stats(),1,true)).toBe(150);
  const r=advanceCombatV3(fight(),60000).state;expect(r.hits.some(h=>!h.hit)).toBe(true);expect(r.hits.every(h=>h.hit||(!h.critical&&h.damage===0))).toBe(true);
 });
 it('gives identical state at 30/60/144 FPS, one offline batch and JSON resume',()=>{
  const expected=advanceCombatV3(fight(),60000).state;
  for(const fps of [30,60,144]){let s=fight();for(let t=1;t<=fps*60;t++)s=advanceCombatV3(s,Math.floor(t*1000/fps)).state;expect(s).toEqual(expected);}
  const resumed=JSON.parse(JSON.stringify(advanceCombatV3(fight(),12345).state));expect(advanceCombatV3(resumed,60000).state).toEqual(expected);
 },30000);
 it('carries backlog without dropping attacks, gives fixed simultaneous priority and rejects rewinds',()=>{
  let s=fight(),r=advanceCombatV3(s,60000,3);expect(r.backlog).toBe(true);
  for(let i=0;r.backlog&&i<100;i++)r=advanceCombatV3(r.state,60000,3);
  expect(r.state).toEqual(advanceCombatV3(s,60000).state);expect(()=>advanceCombatV3(r.state,0)).toThrow('REWIND');
  const simultaneous=startCombatV3(stats({attack:100000,dexterity:10000}),[{id:'enemy',stats:stats({maxHp:1,attack:100000})}],{seed:42,floor:1});
  const end=advanceCombatV3(simultaneous,1000).state;expect(end.status).toBe('victory');expect(end.hits).toHaveLength(1);expect(end.hits[0]!.damage).toBe(1);
 });
 it('uses exclusive deadlines and never revives or attacks after terminal results',()=>{
  const s=fight();s.deadlineMs=1000;const r=advanceCombatV3(s,1000).state;expect(r.status).toBe('timeout');expect(r.sequence).toBe(0);expect(advanceCombatV3(r,100000).state).toEqual(r);
  const dead=fight();dead.actors[0]!.hp=0;expect(advanceCombatV3(dead,1000).state.status).toBe('defeat');
 });
 it('introduces real magical common enemies without modifying reserved bosses',()=>{
  expect(commonEnemyV3(101,'shadow').stats.physicalShareBp).toBe(0);
  expect(commonEnemyV3(101,'shadow').style).toBe('ranged');
  expect(()=>commonEnemyV3(100,'shadow')).toThrow('BOSS');expect(()=>commonEnemyV3(1,'shadow')).toThrow('UNLOCKED');
 });
});
