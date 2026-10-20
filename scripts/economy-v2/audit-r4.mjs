import {writeFile} from 'node:fs/promises';
import {huntEnemyV4,HUNT_IDS,presetBuildV3,heroStatsV3,startCombatV3,advanceCombatV3,BUILD_PRESETS} from '../../packages/shared/dist/index.js';
const rows=[],heroes=new Map();
for(const level of [100,500,1000])for(const floor of [10,100,500,900])for(const kind of HUNT_IDS)for(const build of Object.keys(BUILD_PRESETS)){
 const key=`${level}/${build}`;if(!heroes.has(key))heroes.set(key,heroStatsV3(presetBuildV3(level,build,'epic9')));
 const enemy=huntEnemyV4(kind,floor),hero=heroes.get(key);
 const r=advanceCombatV3(startCombatV3(hero,[enemy],{seed:4213,floor:enemy.reference,deadlineMs:enemy.deadlineMs}),60000).state;
 rows.push({level,floor,kind,build,status:r.status,ms:r.clockMs,remainingHp:r.actors[0].hp,materialPreview:r.status==='victory'?enemy.material:0});
}
const summary=Object.fromEntries(HUNT_IDS.map(k=>[k,Object.fromEntries(['victory','defeat','timeout'].map(s=>[s,rows.filter(r=>r.kind===k&&r.status===s).length]))]));
await writeFile('docs/plans/hunts-builds/r4/audit-results.json',JSON.stringify({fixture:'Synthetic equal-point Epic+9; one fixed seed; not acquisition/XP cohorts',summary,rows},null,2)+'\n');console.log(JSON.stringify({encounters:rows.length,summary}));
