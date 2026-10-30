import {z} from 'zod';
import {masteryLevel,ECONOMY_XP_V2} from '../economy-v2.js';
export const PROGRESSION_BONUS_V26={version:'progression-bonus-v26-1',runtimeEnabled:false,guildBps:[1000,700,500,300,100] as const,eventBps:3000,maximumBps:4000,minimumQualifiedMs:ECONOMY_XP_V2[999]!} as const;
const safe=z.number().int().nonnegative().safe();
const QuoteSchema=z.object({masteryMs:safe.max(ECONOMY_XP_V2[999]!),carry:safe.max(999999),qualifiedMs:safe.positive(),reference:safe.min(1).max(1000),bonusBps:safe.max(4000)}).strict();
const SegmentsSchema=z.object({masteryMs:safe.max(ECONOMY_XP_V2[999]!),carry:safe.max(999999),qualifiedMs:safe.positive(),reference:safe.min(1).max(1000),segments:z.array(z.object({ms:safe.positive(),bonusBps:safe.max(4000)}).strict()).min(1).max(1024)}).strict();
export function guildRateV26(rank:number){z.number().int().min(1).max(10000).parse(rank);return rank===1?1000:rank===2?700:rank===3?500:rank<=10?300:100;}
/** Quotation only. No run, wallet, fight, quota or ledger can be mutated here. */
export function quoteMasteryV26(input:{masteryMs:number;carry:number;qualifiedMs:number;reference:number;bonusBps:number},benchmark:(level:number)=>number){
 const x=QuoteSchema.parse(input);
 return quoteMasterySegmentsV26({masteryMs:x.masteryMs,carry:x.carry,qualifiedMs:x.qualifiedMs,reference:x.reference,segments:[{ms:x.qualifiedMs,bonusBps:x.bonusBps}]},benchmark);
}
export function quoteMasterySegmentsV26(input:{masteryMs:number;carry:number;qualifiedMs:number;reference:number;segments:Array<{ms:number;bonusBps:number}>},benchmark:(level:number)=>number){
 const x=SegmentsSchema.parse(input);
 if(x.segments.reduce((n,s)=>n+s.ms,0)!==x.qualifiedMs)throw Error('SEGMENT_TIME_MISMATCH');
 const segments:Array<{ms:number;bonusBps:number}>=[];for(const segment of x.segments){const last=segments.at(-1);if(last?.bonusBps===segment.bonusBps)last.ms+=segment.ms;else segments.push({...segment});}
 let mastery=x.masteryMs,carry=x.carry;
 for(const segment of segments){let budget=BigInt(segment.ms)*1000000n;
 while(budget>0n&&mastery<ECONOMY_XP_V2[999]!){
  const level=masteryLevel(mastery),cap=safe.positive().parse(benchmark(level)),levelSquare=BigInt(level*level),referenceSquare=BigInt(Math.min(x.reference*x.reference,level*level));
  // H26: recover a share of benchmark deficit while retaining quadratic reference limits.
  const referenceDenominator=levelSquare*10000n;
  const boostedReference=referenceSquare*BigInt(10000+segment.bonusBps);
  const referenceNumerator=boostedReference<referenceDenominator?boostedReference:referenceDenominator;
  const qualified=BigInt(x.qualifiedMs),capped=BigInt(Math.min(x.qualifiedMs,cap));
  const benchmarkNumerator=capped*10000n+(qualified-capped)*BigInt(segment.bonusBps);
  const numerator=referenceNumerator*benchmarkNumerator,denominator=referenceDenominator*qualified*10000n;
  const need=BigInt(ECONOMY_XP_V2[level]!-mastery)*1000000n-BigInt(carry),raw=(need*denominator+numerator-1n)/numerator;
  if(budget>=raw){budget-=raw;mastery=ECONOMY_XP_V2[level]!;carry=0;}else{const credit=budget*numerator/denominator+BigInt(carry);mastery+=Number(credit/1000000n);carry=Number(credit%1000000n);break;}
 }
 }
 if(mastery===ECONOMY_XP_V2[999])carry=0;
 return {version:PROGRESSION_BONUS_V26.version,masteryMs:mastery,carry,gainedMs:mastery-x.masteryMs,quotedOnly:true as const};
}
/** Future trusted source projection. These inputs do not constitute an authenticated grant. */
export function bonusRateV26(x:{now:number;start:number;availableAt:number;end:number;rank:number|null;sameMembership:boolean;qualifiedAtBoundary:boolean;online:boolean;eventWindow:boolean}){
 for(const t of [x.now,x.start,x.availableAt,x.end])safe.parse(t);if(x.end<=x.start)throw Error('INVALID_BONUS_WINDOW');
 const guild=x.rank!==null&&x.sameMembership&&x.qualifiedAtBoundary&&x.now>=Math.max(x.start,x.availableAt)&&x.now<x.end?guildRateV26(x.rank):0,event=x.online&&x.eventWindow?PROGRESSION_BONUS_V26.eventBps:0;
 return {guildBps:guild,eventBps:event,totalBps:Math.min(PROGRESSION_BONUS_V26.maximumBps,guild+event)};
}
