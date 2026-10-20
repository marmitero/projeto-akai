import {z} from 'zod';
const ppm=z.number().int().min(0).max(999999);
/** Plans only: R6/R8 must commit unique keys with inventory/ledger/outbox. */
export function planTowerProtectionV5(input:{accountId:string;killId:string;activity:'main'|'coal'|'iron'|'gold';floor:number;defeated:boolean;roll:number}){
 const s=z.object({accountId:z.uuid(),killId:z.string().min(1).max(160),activity:z.enum(['main','coal','iron','gold']),floor:z.number().int().min(1).max(1000),defeated:z.boolean(),roll:ppm}).strict().parse(input);
 const amount=s.defeated&&s.activity==='main'&&s.floor>=100&&s.floor%10!==0&&s.roll<20?1:0;
 return {key:`protection:tower:${s.accountId}:${s.killId}`,amount,bound:true as const};
}
export function planWeeklyProtectionV5(input:{accountId:string;week:string;qualifiedMs:number;deliveredMilestones:number}){
 const s=z.object({accountId:z.uuid(),week:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),qualifiedMs:z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),deliveredMilestones:z.number().int().min(0).max(6)}).strict().parse(input);
 const date=new Date(s.week+'T00:00:00Z');
 if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==s.week||date.getUTCDay()!==1)throw Error('INVALID_WEEK');
 const milestones=Math.min(6,Math.floor(s.qualifiedMs/300000));if(s.deliveredMilestones>milestones)throw Error('PROTECTION_PROGRESS_REWIND');
 return Array.from({length:milestones-s.deliveredMilestones},(_,i)=>({key:`protection:week:${s.week}:${s.accountId}:${s.deliveredMilestones+i+1}`,milestone:s.deliveredMilestones+i+1,amount:5,bound:true as const}));
}
