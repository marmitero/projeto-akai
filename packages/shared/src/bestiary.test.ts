import {it,expect} from 'vitest';
import {createLocalSnapshot} from '../../../apps/client/src/local/session.js';
import {ENEMY_TEMPLATES,encounterEnemies,enemyDefinition,floorDefinition,LocalSnapshotSchema,startEncounter,advanceCombat} from './index.js';
it('all 27 common templates are reachable, deterministic and excluded from bosses',()=>{
 const seen=new Set<string>();
 for(let f=1;f<=1000;f++)for(let w=1;w<=3;w++){
  const a=encounterEnemies(f,w);expect(a).toEqual(encounterEnemies(f,w));expect(a).toHaveLength(f%10===0?0:3);
  a.forEach(t=>{expect(t.minFloor).toBeLessThanOrEqual(f);seen.add(t.id);});
 }
 expect(ENEMY_TEMPLATES).toHaveLength(27);expect(seen.size).toBe(27);
});
it('each template has monotone HP, damage, coins and XP on all common floors',()=>{
 for(const t of ENEMY_TEMPLATES){let previous=[0,0,0,0];for(let f=1;f<=1000;f++){
  if(f%10===0)continue;const d=enemyDefinition(f,t.id), next=[d.hp,d.attack,d.coin,Math.floor(f*10*d.xpBp/10000)];
  next.forEach((v,i)=>expect(v).toBeGreaterThanOrEqual(previous[i]!));previous=next;
 }}
});
it('preserves all 100 boss definitions and anonymous legacy encounters',()=>{
 for(let f=10;f<=1000;f+=10){const d=enemyDefinition(f,'slime-red'),base=floorDefinition(f);
  for(const k of ['hp','attack','coin','interval'] as const)expect(d[k]).toBe(base[k]);expect(d.xpBp).toBe(10000);
 }
 const s=createLocalSnapshot(0);s.battle.enemies.forEach(e=>delete e.templateId);
 const restored=LocalSnapshotSchema.parse(JSON.parse(JSON.stringify(s)));expect(restored.battle.enemies[0]?.templateId).toBeUndefined();
 expect(enemyDefinition(15)).toMatchObject(floorDefinition(15));
});
it('commits per-enemy stats and exact identity/rewards, without duplicate grants',()=>{
 const s=createLocalSnapshot(0);s.upgrades.attack=1000;startEncounter(s,31);
 const roster=encounterEnemies(31,1);
 s.battle.enemies.forEach((e,i)=>{const d=enemyDefinition(31,roster[i]!.id);expect(e.templateId).toBe(roster[i]!.id);expect(e.maxHp).toBe(d.hp);expect(e.nextAt).toBe(s.battle.time+d.interval);});
 advanceCombat(s,3000,0,()=>9999);
 const reports=s.battle.reports.filter(r=>r.kind==='reward');expect(reports).toHaveLength(3);
 reports.forEach((r,i)=>{const d=enemyDefinition(31,roster[i]!.id);expect(r.enemyId).toBe(roster[i]!.id);expect(r.coin).toBe(String(d.coin*1000));expect(r.heroXp).toBe(Math.floor(31*10*d.xpBp/10000));});
 const coins=s.balances.coin;advanceCombat(s,1000,3000,()=>9999);expect(s.balances.coin).toBe(coins);
});
