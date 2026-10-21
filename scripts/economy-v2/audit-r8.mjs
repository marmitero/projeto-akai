import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {towerBossV8,presetBuildV3,heroStatsV3,startCombatV3,advanceCombatV3,BUILD_PRESETS,initialRunV6,advanceRunV6} from '../../packages/shared/dist/index.js';
const floors=[10,100,500,1000],rows=[];
let prev={maxHp:0,attack:0};for(let floor=10;floor<=1000;floor+=10){const b=towerBossV8(floor);assert.ok(b.stats.maxHp>prev.maxHp&&b.stats.attack>prev.attack);assert.equal(b.deadlineMs,30000);prev=b.stats;}
for(const floor of floors)for(const build of Object.keys(BUILD_PRESETS))for(const gear of ['starter','epic9','legendary15']){
 const e=presetBuildV3(floor,build,gear==='legendary15'?'legendary20':gear);if(gear==='legendary15')for(const i of e.inventory)i.enhancement=15;
 for(const seed of [1,4213,3735928559]){const hero=heroStatsV3(e),enemy=towerBossV8(floor),r=advanceCombatV3(startCombatV3(hero,[{id:'boss',stats:enemy.stats}],{seed,floor,deadlineMs:30000}),30000,10000).state;
 rows.push({floor,build,gear,seed,status:r.status,ms:r.clockMs,hpLossBp:Math.round((1-r.actors[0].hp/hero.maxHp)*10000)});}
}
const late=rows.filter(r=>r.floor===1000&&r.gear==='epic9'),wins=late.filter(r=>r.status==='victory');
assert.ok(late.some(r=>r.hpLossBp>1000),'late boss must exert materially more pressure than old0.4%');
assert.ok(rows.some(r=>r.floor===1000&&r.gear==='legendary15'&&r.status==='victory'),'campaign must not require+20 in every tested build');
const compare=[];for(const floor of [999,1000]){let run=initialRunV6('00000000-0000-4000-8000-000000000008');run.economy=presetBuildV3(1000,'swift','epic9');run.economy.floor=floor;run.economy.highest.main=floor-1;run.autoAdvance=false;for(let t=100;t<=120000;t+=100){run=advanceRunV6(run,t).state;const v=run.log.find(l=>l.text.startsWith('Vitória'));if(v||run.paused){compare.push({floor,result:v?'victory':'failure',ms:v?.at??run.nextAt-3000});break;}}}
const report={version:'r8-tower-audit-1',passed:true,encounters:rows.length,all100BossStatsMonotone:true,lateEpic9:{wins:wins.length,cases:late.length,minHpLossBp:Math.min(...late.map(r=>r.hpLossBp)),maxHpLossBp:Math.max(...late.map(r=>r.hpLossBp))},summaries:['starter','epic9','legendary15'].map(gear=>({gear,wins:rows.filter(r=>r.gear===gear&&r.status==='victory').length,defeats:rows.filter(r=>r.gear===gear&&r.status==='defeat').length,timeouts:rows.filter(r=>r.gear===gear&&r.status==='timeout').length})),compare,rows,limits:'All100 stat anchors checked; combat sample4floors×6equal-point-builds×3gear×3seeds. Gear synthetic, not acquisition or affordability. No proof of all100 fights/campaign90–120days, player skill, loot market, daily boss population or+20rarity. Hunts keep independentV4 anchors, legacy live bosses unchanged.'};
await writeFile('docs/plans/hunts-builds/r8/tower-audit.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({...report,rows:undefined}));
