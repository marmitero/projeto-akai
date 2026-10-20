import { z } from 'zod';
import { JADE_V2 } from './economy-v2.js';
const uuid=z.uuid().transform(s=>s.toLowerCase());
const Member=z.object({accountId:uuid,name:z.string().min(1).max(24),damage:z.string().regex(/^(0|[1-9]\d{0,37})$/),
  qualifiedSeconds:z.number().int().nonnegative().safe(),highestFloor:z.number().int().min(0).max(1000),suspended:z.boolean()}).strict();
const Edition=z.object({edition:z.string().regex(/^boss:\d{4}-\d{2}-\d{2}$/),defeated:z.boolean(),lastHit:uuid.nullable(),members:z.array(Member).max(5000)}).strict();
export type DailyBossJadeInput=z.input<typeof Edition>;
/** Receives a server-owned final encounter snapshot, never client damage claims. */
export function planDailyBossJade(input:DailyBossJadeInput) {
  const e=Edition.parse(input);
  if(new Set(e.members.map(m=>m.accountId)).size!==e.members.length)throw Error('DUPLICATE_BOSS_MEMBER');
  if(!e.defeated&&e.lastHit)throw Error('LAST_HIT_WITHOUT_DEFEAT');
  const eligible=e.members.filter(m=>!m.suspended&&m.highestFloor>=JADE_V2.minimumFloor&&BigInt(m.damage)>0n);
  const ranked=e.defeated?[...eligible].sort((a,b)=>BigInt(a.damage)===BigInt(b.damage)?(a.accountId<b.accountId?-1:a.accountId>b.accountId?1:0):BigInt(a.damage)>BigInt(b.damage)?-1:1).slice(0,10):[];
  const killer=e.lastHit?eligible.find(m=>m.accountId===e.lastHit):undefined;
  if(e.lastHit&&!killer)throw Error('INELIGIBLE_LAST_HIT');
  const grants: {source:string;accountId:string;kind:'participation'|'ranking'|'last-hit';jade:number}[]=[];
  for(const m of eligible)if(m.qualifiedSeconds>=JADE_V2.seconds)grants.push({source:`${e.edition}:v2:participation`,accountId:m.accountId,kind:'participation',jade:JADE_V2.participation});
  const ranking=ranked.map((m,i)=>({rank:i+1,accountId:m.accountId,name:m.name,damage:m.damage,jade:JADE_V2.top10[i]!}));
  for(const r of ranking)grants.push({source:`${e.edition}:v2:ranking`,accountId:r.accountId,kind:'ranking',jade:r.jade});
  if(killer)grants.push({source:`${e.edition}:v2:last-hit`,accountId:killer.accountId,kind:'last-hit',jade:JADE_V2.lastHit});
  return {edition:e.edition,ranking,grants,
    broadcast:killer?{id:`${e.edition}:v2:last-hit`,accountId:killer.accountId,name:killer.name,jade:JADE_V2.lastHit,
      text:`${killer.name} deu o último golpe no boss diário e ganhou ${JADE_V2.lastHit} jade!`}:null};
}

export type DailyBossBroadcast = NonNullable<ReturnType<typeof planDailyBossJade>['broadcast']> & {at:number};
