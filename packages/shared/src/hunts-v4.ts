import {z} from 'zod';
import {floorDefinition} from './content.js';
import {EconomyV2Schema,type EconomyV2} from './economy-v2.js';
import {CombatStatsV3Schema} from './combat-v3.js';
import {HUNT_MATERIAL_V4} from './hunt-material-v4.js';
export const HUNT_IDS=['coal','iron','gold'] as const;
export type HuntV4=typeof HUNT_IDS[number];
export const HUNT_THEMES_V4={coal:{name:'Hunt de carvão',tint:'#4b395b',magicBp:3000},iron:{name:'Hunt de ferro',tint:'#466b81',magicBp:1000},gold:{name:'Hunt de ouro',tint:'#997228',magicBp:6000}} as const;
const huntCache=new Map<string,ReturnType<typeof calculateHunt>>();
/** Independent hunt anchors; never calls a tower boss encounter/reward handler. */
export function huntEnemyV4(kind:HuntV4,floor:number){
 z.enum(HUNT_IDS).parse(kind);z.number().int().min(1).max(1000).parse(floor);
 const key=kind+'/'+floor;
 if(!huntCache.has(key))huntCache.set(key,calculateHunt(kind,floor));
 const result=huntCache.get(key)!;return {...result,stats:{...result.stats}};
}
function calculateHunt(kind:HuntV4,floor:number){
 const reference=10*Math.ceil(floor/10),x=BigInt(Math.max(0,floor-100)),den=900n;
 const multiplier={coal:100n,iron:125n,gold:160n}[kind];
 const ceil=(a:bigint,b:bigint)=>Number((a+b-1n)/b);
 const ramp=den*den+x*x;
 // Block transitions must not become easier when the within-block offset resets.
 let hpAnchor=0n,attackAnchor=0n;
 for(let f=1;f<=floor;f++){const b=floorDefinition(10*Math.ceil(f/10)),offset=BigInt((f-1)%10);hpAnchor=BigInt(Math.max(Number(hpAnchor),b.hp*Number(100n+4n*offset)));attackAnchor=BigInt(Math.max(Number(attackAnchor),b.attack*Number(1000n+25n*offset)));}
 const stats=CombatStatsV3Schema.parse({
  maxHp:ceil(hpAnchor*multiplier*ramp,10000n*den*den),
  attack:ceil(attackAnchor*multiplier*ramp*(den**3n+4n*x**3n),100000n*den**5n),
  intervalMs:1800,physicalDefense:0,magicDefense:0,dexterity:0,evasion:reference,criticalPpm:0,physicalShareBp:10000-HUNT_THEMES_V4[kind].magicBp});
 return {id:`hunt-${kind}`,name:HUNT_THEMES_V4[kind].name,reference,stats,material:HUNT_MATERIAL_V4[kind][floor-1]!,deadlineMs:30000};
}
/** Caller must settle the old activity to `at` before switching (R6 transaction). */
export function selectActivityV4(input:EconomyV2,kind:EconomyV2['activity'],floor:number,expectedRevision:number,at:number){
 const s=EconomyV2Schema.parse(input);z.enum(['main',...HUNT_IDS]).parse(kind);z.number().int().min(1).max(1000).parse(floor);
 if(expectedRevision!==s.revision)throw Error('STALE_REVISION');
 if(at!==s.economicThroughMs)throw Error('ACTIVITY_NOT_SETTLED');
 if(kind!=='main'&&s.highest.main<(kind==='gold'?20:5))throw Error('HUNT_LOCKED');
 if(floor>s.highest[kind]+1)throw Error('FLOOR_NOT_UNLOCKED');
 if(kind==='main'&&floor%10===0){if(floor<=s.highest.main)throw Error('BOSS_NOT_REPEATABLE');throw Error('BOSS_CONTENT_RESERVED');}
 s.activity=kind;s.floor=floor;s.revision++;return EconomyV2Schema.parse(s);
}
/** Pure plan for R6: no balance writer, no replayable claim endpoint. */
export function huntVictoryPlanV4(kind:HuntV4,floor:number,outcome:'victory'|'defeat'|'timeout'|'fighting'){
 const e=huntEnemyV4(kind,floor);z.enum(['victory','defeat','timeout','fighting']).parse(outcome);
 return {material:kind,amount:outcome==='victory'?String(e.material*1000):'0',coin:'0',jade:'0',equipment:false,protection:false,reference:e.reference};
}

/** Victory progression only, called once from a trusted resolved run inside R6's transaction.
 * Expected revision is the run's opening revision; a duplicate/concurrent result is rejected.
 * Rewards remain a separate plan until ledger integration. */
export function completeHuntV4(input:EconomyV2,kind:HuntV4,floor:number,expectedRevision:number,outcome:'victory'|'defeat'|'timeout'){
 const s=EconomyV2Schema.parse(input),plan=huntVictoryPlanV4(kind,floor,outcome);
 if(s.revision!==expectedRevision)throw Error('STALE_REVISION');
 if(s.activity!==kind||s.floor!==floor)throw Error('ACTIVITY_CHANGED');
 if(floor>s.highest[kind]+1)throw Error('FLOOR_NOT_UNLOCKED');
 if(outcome==='victory')s.highest[kind]=Math.max(s.highest[kind],floor);
 s.revision++;return {state:EconomyV2Schema.parse(s),plan};
}
