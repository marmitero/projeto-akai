import { z } from 'zod';
const n=z.number().int().min(0).max(1_000_000_000_000),time=z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
export const CombatStatsV3Schema=z.object({attack:n.min(1),maxHp:n.min(1),physicalDefense:n,magicDefense:n,
  intervalMs:n.min(200).max(60000),dexterity:n.max(10000),evasion:n.max(10000),criticalPpm:n.max(45000),physicalShareBp:n.max(10000)}).strict();
export type CombatStatsV3=z.infer<typeof CombatStatsV3Schema>;
const Actor=z.object({id:z.string().min(1).max(160),hp:n,stats:CombatStatsV3Schema,nextAt:time}).strict().refine(a=>a.hp<=a.stats.maxHp);
const Hit=z.object({sequence:time,at:time,attacker:z.string(),target:z.string(),hit:z.boolean(),critical:z.boolean(),damage:n});
export const CombatV3Schema=z.object({version:z.literal('combat-v3-1'),clockMs:time,deadlineMs:time.nullable(),seed:z.number().int().min(1).max(4294967295),sequence:time,
  equivalentFloor:n.min(1).max(1000),actors:z.array(Actor).min(2).max(4),status:z.enum(['fighting','victory','defeat','timeout']),hits:z.array(Hit).max(64)}).strict().superRefine((s,c)=>{
    if(s.deadlineMs!==null&&s.deadlineMs<s.clockMs)c.addIssue({code:'custom',message:'Deadline before clock'});
    if(new Set(s.actors.map(a=>a.id)).size!==s.actors.length)c.addIssue({code:'custom',message:'Duplicate combat actor'});
    if(s.actors.some(a=>a.hp>0&&a.nextAt<s.clockMs)&&s.status==='fighting')c.addIssue({code:'custom',message:'Attack scheduled in past'});
  });
export type CombatV3=z.infer<typeof CombatV3Schema>;
export const hitChancePpm=(attacker:CombatStatsV3,target:CombatStatsV3)=>Math.max(60000,Math.min(99500,85000+15*attacker.dexterity-target.evasion));
export function attackDamageV3(attacker:CombatStatsV3,target:CombatStatsV3,floor:number,critical:boolean){
  z.number().int().min(1).max(1000).parse(floor);
  const raw=BigInt(attacker.attack)*(critical?3n:2n)/2n;
  const physical=raw*BigInt(attacker.physicalShareBp)/10000n,magic=raw-physical,k=BigInt(100+2*floor);
  const d=BigInt(target.physicalDefense),m=BigInt(target.magicDefense);
  // Mitigate each damage component only once, and round once after summing rational fractions.
  const pDen=4n*(d+k),mDen=4n*(m+k);
  return Math.max(1,Number((physical*(d+4n*k)*mDen+magic*(m+4n*k)*pDen)/(pDen*mDen)));
}
function roll(s:CombatV3){
  let value:number;
  do{let x=s.seed;x^=x<<13;x^=x>>>17;x^=x<<5;s.seed=x>>>0;value=s.seed;}while(value>=4294900000);
  return value%100000;
}
export function startCombatV3(hero:CombatStatsV3,enemies:{id:string;stats:CombatStatsV3}[],options:{seed:number;floor:number;at?:number;deadlineMs?:number}){
  const at=options.at??0;
  hero=CombatStatsV3Schema.strip().parse(hero);
  enemies=enemies.map(e=>({id:e.id,stats:CombatStatsV3Schema.strip().parse(e.stats)}));
  return CombatV3Schema.parse({version:'combat-v3-1',clockMs:at,deadlineMs:options.deadlineMs??null,seed:options.seed,sequence:0,equivalentFloor:options.floor,
    actors:[{id:'hero',stats:hero,hp:hero.maxHp,nextAt:at+hero.intervalMs},...enemies.map(e=>({id:e.id,stats:e.stats,hp:e.stats.maxHp,nextAt:at+e.stats.intervalMs})).sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0)],status:'fighting',hits:[]});
}
/** Authoritative event clock, shared by online/offline simulation. No rewards are minted here. */
export function advanceCombatV3(input:CombatV3,toMs:number,maxEvents=10000){
  CombatV3Schema.parse(input);time.parse(toMs);z.number().int().min(1).max(100000).parse(maxEvents);
  if(toMs<input.clockMs)throw Error('COMBAT_CLOCK_REWIND');
  const result=advanceOwnedCombatV3(structuredClone(input),toMs,maxEvents);
  if(!result.backlog)result.state=CombatV3Schema.parse(result.state);return result;
}
/** Internal hot loop: caller owns a validated clone. Never use on caller-owned snapshots. */
export function advanceOwnedCombatV3(s:CombatV3,toMs:number,maxEvents:number){
  let processed=0;
  while(s.status==='fighting'){
    const hero=s.actors[0]!,alive=s.actors.slice(1).filter(a=>a.hp>0);
    if(hero.hp===0){s.status='defeat';break;}if(!alive.length){s.status='victory';break;}
    const due=s.actors.map((a,i)=>({a,i})).filter(x=>x.a.hp>0).sort((a,b)=>a.a.nextAt-b.a.nextAt||a.i-b.i)[0]!;
    // Deadline is exclusive: an attack at the exact deadline cannot rescue the fight.
    if(s.deadlineMs!==null&&s.deadlineMs<=Math.min(toMs,due.a.nextAt)){s.clockMs=s.deadlineMs;s.status='timeout';break;}
    if(due.a.nextAt>toMs){s.clockMs=toMs;break;}
    if(processed>=maxEvents)return {state:s,backlog:true,processed};
    s.clockMs=due.a.nextAt;
    const target=due.i===0?alive[0]!:hero;
    const hit=roll(s)<hitChancePpm(due.a.stats,target.stats),critical=hit&&roll(s)<due.a.stats.criticalPpm;
    const damage=hit?Math.min(target.hp,attackDamageV3(due.a.stats,target.stats,s.equivalentFloor,critical)):0;
    target.hp-=damage;due.a.nextAt+=due.a.stats.intervalMs;s.sequence++;processed++;
    s.hits.push({sequence:s.sequence,at:s.clockMs,attacker:due.a.id,target:target.id,hit,critical,damage});if(s.hits.length>64)s.hits.shift();
  }
  return {state:s,backlog:false,processed};
}
