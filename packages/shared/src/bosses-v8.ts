import {z} from 'zod';
import {floorDefinition} from './content.js';
import {CombatStatsV3Schema} from './combat-v3.js';
/** V2 tower only. Hunt anchors and legacy live encounters retain their versioned tables. */
export function towerBossV8(floor:number){
 z.number().int().min(10).max(1000).refine(f=>f%10===0).parse(floor);
 const b=floorDefinition(floor),f=BigInt(floor),den=1000000n,ceil=(a:bigint,d:bigint)=>Number((a+d-1n)/d);
 return {id:'tower-guardian',name:floor%30===0?'Guardião arcano':floor%20===0?'Guardião do eclipse':'Guardião de ferro',stats:CombatStatsV3Schema.parse({
  maxHp:ceil(BigInt(b.hp)*(den+2n*f*f),den),attack:ceil(BigInt(b.attack)*(den+70n*f*f),den),
  physicalDefense:Math.floor(floor/2),magicDefense:Math.floor(floor/2),intervalMs:1800,dexterity:Math.floor(floor/2),evasion:floor,criticalPpm:5000,
  physicalShareBp:floor%30===0?2500:floor%20===0?5000:10000,
 }),deadlineMs:30000};
}
