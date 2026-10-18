import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {ENEMY_TEMPLATES,encounterEnemies,enemyDefinition,LocalSnapshotSchema,newLoopState,CONFIG_VERSION,startEncounter,advanceCombat,heroStats,createEquipment} from '../packages/shared/dist/index.js';
const seen=new Map(),samples=[];
for(let f=1;f<=1000;f++){
 if(f%10===0)continue;
 for(let w=1;w<=3;w++)for(const t of encounterEnemies(f,w))if(!seen.has(t.id))seen.set(t.id,f);
 const s=LocalSnapshotSchema.parse({...newLoopState(),schemaVersion:3,configVersion:CONFIG_VERSION,mode:'local',generation:0,savedAt:0,lastReconciledAt:0,profile:{id:'local-test',name:'Simulação'},screen:'battle',activeMs:0,balances:{coin:'0',iron:'0',coal:'0',gold:'0',jade:'0',ruby:'0'}});
 s.rpg.heroXp=25*f*f;s.upgrades.attack=f-1;s.upgrades.vitality=f-1;
 if(f>1)for(const [slot,id] of Object.entries({weapon:'sword',shield:'shield',chest:'armor',head:'hat',hands:'gloves',feet:'boots',neck:'pendant',ring1:'ring',ring2:'ring'})){
  const item=createEquipment(s,id,Math.min(100,Math.ceil(f/10)),'common',()=>9999);item.enhancement=Math.floor(f/100);s.rpg.inventory.push(item);s.rpg.equipped[slot]=item.id;
 }
 s.battle.heroHp=heroStats(s).hp;startEncounter(s,f);let elapsed=0;
 while(s.battle.highest<f && s.battle.phase!=='failed' && elapsed<120000){advanceCombat(s,1000,elapsed,()=>9999);elapsed+=1000;}
 samples.push({floor:f,won:s.battle.highest>=f,elapsedMs:elapsed,healthRemaining:s.battle.heroHp,coins:s.balances.coin,xp:s.rpg.heroXp-25*f*f});
}
for(const t of ENEMY_TEMPLATES){let previous=[0,0,0,0];for(let f=1;f<=1000;f++){if(f%10===0)continue;const d=enemyDefinition(f,t.id),values=[d.hp,d.attack,d.coin,Math.floor(f*10*d.xpBp/10000)];values.forEach((v,i)=>assert.ok(v>=previous[i]));previous=values;}}
assert.equal(seen.size,27);assert.equal(samples.filter(s=>!s.won).length,0);
const report={version:'common-1',floors:samples.length,templates:seen.size,monotoneCurves:true,firstAppearances:Object.fromEntries(seen),referenceBuild:'Common full gear from floor2, level ceil(f/10), enhancement floor(f/100), upgrades f-1, prior hero XP25*f². No acquisition/farming simulation, criticals or random loot.',minClearMs:Math.min(...samples.map(s=>s.elapsedMs)),maxClearMs:Math.max(...samples.map(s=>s.elapsedMs)),samples};
await writeFile(new URL('../docs/bestiary/balance-simulation.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log({floors:report.floors,templates:report.templates,minClearMs:report.minClearMs,maxClearMs:report.maxClearMs});
