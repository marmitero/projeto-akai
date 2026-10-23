import {z} from 'zod';
import type {CombatStatsV3} from '../combat-v3.js';
import type {duelV15} from '../arena-v15/index.js';
export const WAR_V19_RULES={version:'guild-wars-v19-1',membershipMs:86400000,minimumMembers:2,winnerXp:100,winCoin:'500000',drawCoin:'250000',loseCoin:'100000'} as const;
const revision=z.number().int().nonnegative().safe();
export const WarV19CommandSchema=z.object({commandId:z.uuid(),expectedRevision:revision,warRevision:revision,seasonId:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),action:z.discriminatedUnion('type',[z.object({type:z.literal('enroll')}).strict(),z.object({type:z.literal('sync')}).strict(),z.object({type:z.literal('attack')}).strict()])}).strict();
export type WarFighterV19={accountId:string;name:string;joinedAt:number;floor:number;stats:CombatStatsV3};
export type WarTeamV19={id:string;name:string;level:number;roster:WarFighterV19[]};
export type WarAttackV19={accountId:string;targetId:string;side:0|1;result:ReturnType<typeof duelV15>;maxHp:number};
export type WarMatchV19={id:string;teams:[WarTeamV19,WarTeamV19];attacks:WarAttackV19[]};
export type WarPeriodV19={id:string;start:number;end:number;open:number;close:number;opened:boolean;enrollments:WarTeamV19[];matches:WarMatchV19[]};
/** Exact rational comparison; no rounded damage tie or client-selected outcome. */
export function scoreWarV19(m:WarMatchV19){
 const scores=[0,0],fractions=[{n:0n,d:1n},{n:0n,d:1n}];
 for(const a of m.attacks){scores[a.side]!+=a.result.won?3:0;const f=fractions[a.side]!;f.n=f.n*BigInt(a.maxHp)+BigInt(a.maxHp-a.result.hpB)*f.d;f.d*=BigInt(a.maxHp);}
 const delta=scores[0]!-scores[1]!,damage=fractions[0]!.n*fractions[1]!.d-fractions[1]!.n*fractions[0]!.d;
 return {scores,winner:delta>0?0:delta<0?1:damage>0n?0:damage<0n?1:null} as {scores:number[];winner:0|1|null};
}
export function pairWarV19(teams:WarTeamV19[]):Array<[WarTeamV19,WarTeamV19]>{const sorted=[...teams].sort((a,b)=>b.level-a.level||a.id.localeCompare(b.id));const pairs:Array<[WarTeamV19,WarTeamV19]>=[];for(let i=0;i+1<sorted.length;i+=2)pairs.push([sorted[i]!,sorted[i+1]!]);return pairs;}
export type WarPublicMatchV19={id:string;teams:Array<{id:string;name:string;members:Array<{accountId:string;name:string}>}>;scores:number[];winner:0|1|null;attacks:Array<{accountId:string;targetId:string;won:boolean;hpA:number;hpB:number;maxHp:number}>};
export type WarArchiveV19={id:string;closedAt:number;matches:WarPublicMatchV19[]};
export type WarV19View={version:string;revision:number;serverNow:number;seasonId:string;open:number;close:number;phase:'registration'|'opening_required'|'active'|'close_required'|'finished';canEnroll:boolean;enrolled:boolean;canAttack:boolean;target:{accountId:string;name:string}|null;matches:WarPublicMatchV19[];archives:WarArchiveV19[];rewards:Array<{seasonId:string;coin:string}>;rehearsalOnly:true};
