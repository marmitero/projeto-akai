import {z} from 'zod';
import {CombatStatsV3Schema,hitChancePpm,attackDamageV3,type CombatStatsV3} from '../combat-v3.js';
export const ARENA_V15_RULES={version:'arena-v15-1',minimumFloor:5,cooldownMs:60000,windowMs:86400000,challenges:20,opponents:5,deadlineMs:120000} as const;
export const ArenaV15CommandSchema=z.object({commandId:z.uuid(),expectedRevision:z.number().int().nonnegative().safe(),arenaRevision:z.number().int().nonnegative().safe(),seasonId:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),action:z.discriminatedUnion('type',[z.object({type:z.literal('enroll')}).strict(),z.object({type:z.literal('challenge'),opponentId:z.uuid()}).strict()])}).strict();
/** Both fighters attack from full HP; attacks due together resolve simultaneously. No economy grants. */
export function duelV15(attacker:CombatStatsV3,defender:CombatStatsV3,seed:number,floor:number){
 const a=CombatStatsV3Schema.strip().parse(attacker),b=CombatStatsV3Schema.strip().parse(defender);z.number().int().min(1).max(4294967295).parse(seed);z.number().int().min(1).max(1000).parse(floor);
 let hpA=a.maxHp,hpB=b.maxHp,nextA=a.intervalMs,nextB=b.intervalMs,at=0,attacks=0,x=seed;
 const roll=()=>{let value:number;do{x^=x<<13;x^=x>>>17;x^=x<<5;x>>>=0;value=x;}while(value>=4294900000);return value%100000;};
 const hit=(from:CombatStatsV3,to:CombatStatsV3)=>{attacks++;if(roll()>=hitChancePpm(from,to))return 0;return attackDamageV3(from,to,floor,roll()<from.criticalPpm);};
 while(hpA>0&&hpB>0){
  at=Math.min(nextA,nextB);if(at>=ARENA_V15_RULES.deadlineMs){at=ARENA_V15_RULES.deadlineMs;break;}
  const damageB=nextA===at?hit(a,b):0,damageA=nextB===at?hit(b,a):0;
  if(nextA===at)nextA+=a.intervalMs;if(nextB===at)nextB+=b.intervalMs;
  hpA=Math.max(0,hpA-damageA);hpB=Math.max(0,hpB-damageB);
 }
 return {version:ARENA_V15_RULES.version,won:hpA>0&&hpB===0,hpA,hpB,elapsedMs:at,attacks,reason:hpA===0&&hpB===0?'tie_defender':hpA===0?'defender':hpB===0?'attacker':'timeout_defender'};
}
export type ArenaV15View={version:string;revision:number;season:{id:string;start:number;end:number};serverNow:number;eligible:boolean;enrolled:boolean;own:{accountId:string;name:string;position:number;trophies:number}|null;board:Array<{accountId:string;name:string;position:number;trophies:number}>;opponents:Array<{accountId:string;name:string;position:number;trophies:number}>;nextAt:number;challengesUsed:number;challengesRemaining:number;history:Array<{id:string;seasonId:string;attacker:string;defender:string;at:number;won:boolean;result:ReturnType<typeof duelV15>}>;rehearsalOnly:boolean};
