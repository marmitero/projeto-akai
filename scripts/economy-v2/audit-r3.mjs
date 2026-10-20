import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {BUILD_PRESETS,presetBuildV3,heroStatsV3,commonEnemyV3,startCombatV3,advanceCombatV3,usedAttributePoints,ATTACK_INTERVAL_V3} from '../../packages/shared/dist/index.js';
const rows=[];
for(const level of [100,500,1000])for(const enemyId of ['shield-skeleton','shadow','archer'])for(const build of Object.keys(BUILD_PRESETS)){
 const s=presetBuildV3(level,build,'epic9'),{gearAgility,...hero}=heroStatsV3(s),floor=level===1000?999:level+1,enemy=commonEnemyV3(floor,enemyId);
 const outcomes=[];
 for(const seed of [1101,2221,3301,4411,5501]){
  const result=advanceCombatV3(startCombatV3(hero,[{id:enemy.id,stats:enemy.stats}],{seed,floor,deadlineMs:300000}),300000).state;
  assert.ok(result.clockMs<=300000);assert.ok(result.actors.every(a=>a.hp>=0));
  outcomes.push({seed,status:result.status,ms:result.clockMs,hp:result.actors[0].hp,attacks:result.sequence});
 }
 rows.push({level,enemyId,build,weightedPoints:usedAttributePoints(s),intervalMs:hero.intervalMs,gearAgility,wins:outcomes.filter(o=>o.status==='victory').length,outcomes});
}
for(let i=0;i<rows.length;i+=6)assert.ok(new Set(rows.slice(i,i+6).map(r=>r.weightedPoints)).size===1,'Unequal point budgets');
const winners=[];
for(let i=0;i<rows.length;i+=6){const context=rows.slice(i,i+6);context.sort((a,b)=>b.wins-a.wins||a.outcomes.reduce((s,r)=>s+r.ms,0)-b.outcomes.reduce((s,r)=>s+r.ms,0));winners.push({level:context[0].level,enemyId:context[0].enemyId,build:context[0].build,wins:context[0].wins});}
const result={version:'r3-audit-1',scope:'Equal-point synthetic builds; 3 levels × 3 common enemy roles × 6 builds × 5 seeds',encounters:rows.length*5,
 frozenSpeedSha256:createHash('sha256').update(JSON.stringify(ATTACK_INTERVAL_V3)).digest('hex'),rows,winners,
 productionApproved:false,limits:['No item acquisition or resource affordability model','One enemy per encounter in this grid, not full tower waves','Not a statistical proof of build balance or human satisfaction','No boss, PvP, hunt, offline reward or economy activation','Old R1.1 progression and +20 estimates are not revalidated by this combat grid']};
await writeFile(new URL('../../docs/plans/hunts-builds/r3/audit-results.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({encounters:result.encounters,winners,productionApproved:false}));
