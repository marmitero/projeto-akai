// Read-only export of published definitions for the independent proposed-economy model.
import { writeFile } from 'node:fs/promises';
import { floorDefinition, ITEMS, RARITY, encounterEnemies, enemyDefinition } from '../../packages/shared/dist/index.js';
const data={origin:'Published current game; not proposed future combat',floors:Array.from({length:1000},(_,i)=>floorDefinition(i+1)),encounters:Array.from({length:1000},(_,i)=>{const f=i+1;return Array.from({length:f%10===0?1:3},(_,w)=>(f%10===0?[enemyDefinition(f)]:encounterEnemies(f,w+1).map(t=>enemyDefinition(f,t.id))).map(e=>[e.hp,e.attack,e.interval,e.coin,e.xpBp]));}),items:ITEMS,rarities:RARITY};
await writeFile(new URL('../../docs/plans/hunts-builds/r1/content-baseline.json',import.meta.url),JSON.stringify(data)+'\n');
