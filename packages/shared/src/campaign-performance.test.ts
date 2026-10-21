import {describe,it,expect} from 'vitest';
import {createHash} from 'node:crypto';
import {startCombatV3,advanceCombatV3} from './combat-v3.js';
import {heroStatsV3} from './builds-v3.js';
import {presetBuildV3} from './build-presets-v3.js';
import {commonEnemyV3} from './enemies-v3.js';
import {huntEnemyV4} from './hunts-v4.js';
// Captured from main6192b1d BEFORE the hot-loop/cache changes. Fixtures test combat replay, not acquisition.
const golden=[
 [100,1,'6b03cfb74834bde36e94ee13c2ac78c6ef757a997e910785653d92bc4f25d6fe'],
 [100,4213,'747b7180d0cfdd0fd60b20e13f07dcecb9a2ec023707d5952437dc601e885780'],
 [500,1,'628d6ea510eea11a432ccbdcb6b0c5c1ebc0aaa271de92dad3572d3e9479ce0f'],
 [500,4213,'1c2187bedb18c60708813fdfab4cd91931f15743e1289f93c34dd21edb91f4cb'],
 [1000,1,'0102a051564af6ccf2600f6d2a49e40426c18a734f70f90a5fb7d6ffeeaa37cf'],
 [1000,4213,'961ed39c66ae3398c7611dc86396524e488a240218fb6cd202fc57ce3887fc71'],
] as const;
describe('campaign hot-loop replay',()=>{
 it('preserves pre-optimization HP, hit order/ties, RNG, deadlines and cursor in bounded JSON reads',()=>{
  for(const [level,seed,hash] of golden){const floor=level===1000?999:level+1;
   let state=startCombatV3(heroStatsV3(presetBuildV3(level,'swift','epic9')),(['shield-skeleton','shadow','archer'] as const).map(id=>({id,stats:commonEnemyV3(floor,id).stats})),{seed,floor,deadlineMs:300000});
   while(true){const result=advanceCombatV3(JSON.parse(JSON.stringify(state)),300000,7);state=result.state;if(!result.backlog)break;}
   expect(createHash('sha256').update(JSON.stringify(state)).digest('hex')).toBe(hash);
  }
 },30000);
 it('keeps damage caches distinct for actor IDs containing separators',()=>{
  const hero={attack:100,maxHp:1000,physicalDefense:0,magicDefense:0,intervalMs:1000,dexterity:10000,evasion:0,criticalPpm:0,physicalShareBp:10000};
  const enemies=[{id:'foo/hero',stats:{...hero,attack:1,intervalMs:5000}},{id:'hero/foo',stats:{...hero,attack:999}}];
  const result=advanceCombatV3(startCombatV3(hero,enemies,{seed:4213,floor:1}),1000).state;
  expect(result.hits.map(h=>h.damage)).toEqual([100,999]);expect(result.actors[0]!.hp).toBe(1);
 });
 it('cannot poison another hunt/account by mutating a cached returned enemy',()=>{
  const before=huntEnemyV4('gold',1000);huntEnemyV4('gold',1000).stats.attack=1;expect(huntEnemyV4('gold',1000)).toEqual(before);expect(()=>huntEnemyV4('coal',1001)).toThrow();
 });
});
