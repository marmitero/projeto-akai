import {z} from 'zod';
import {EconomyV2Schema,EconomyItemV2Schema,type EconomyV2} from './economy-v2.js';
import {RARITIES} from './content.js';
type Item=z.infer<typeof EconomyItemV2Schema>;
export const REFINEMENT_SUCCESS_PPM_V5=[980000,950000,920000,900000,850000,800000,750000,700000,650000,600000,550000,500000,480000,460000,440000,320000,270000,220000,170000,120000] as const;
export const REFINEMENT_BREAK_PPM_V5=[0,0,0,0,0,0,0,50000,80000,120000,180000,250000,1000000,1000000,1000000,1000000,1000000,1000000,1000000,1000000] as const;
const rollSchema=z.number().int().min(0).max(999999),seedSchema=z.number().int().min(1).max(4294967295);
const COST_RARITY=[100n,115n,135n,175n,225n] as const;
/** Exact rational recipes, rounded to whole units BEFORE the R1.1 late multipliers. */
export function refinementQuoteV5(input:Item,protect=false){
 const item=EconomyItemV2Schema.parse(input);z.boolean().parse(protect);
 const target=item.enhancement+1;if(target>20)throw Error('REFINEMENT_MAXIMUM');
 if(target>=16&&item.rarity!=='legendary')throw Error('LEGENDARY_REQUIRED');
 if(protect&&target<8)throw Error('PROTECTION_NOT_ALLOWED');
 const v=BigInt(24+item.level)*COST_RARITY[RARITIES.indexOf(item.rarity)]!;
 const recipe=(base:bigint,baseDen:bigint,num:bigint,den:bigint,power:number,late:bigint)=>{
  const a=base*v*num**BigInt(power),b=baseDen*2500n*den**BigInt(power);
  return String(((a+b-1n)/b)*(target>=11?late:1n)*1000n);
 };
 const cost={coin:recipe(100n,1n,33n,25n,target-1,4n),coal:recipe(2n,1n,5n,4n,target-1,4n),
  iron:target<6?'0':recipe(10n,1n,5n,4n,target-6,8n),gold:target<11?'0':recipe(2n,1n,5n,4n,target-11,4n),jade:target<16?'0':recipe(1n,10n,5n,4n,target-16,1n)};
 const successPpm=REFINEMENT_SUCCESS_PPM_V5[target-1]!,conditionalBreakPpm=protect?0:REFINEMENT_BREAK_PPM_V5[target-1]!;
 return {target,cost,successPpm,conditionalBreakPpm,breakPpm:(1000000-successPpm)*conditionalBreakPpm/1000000,
  failure:target<=3?'maintain' as const:protect||target<=7?'regress' as const:target<=12?'mixed' as const:'destroy' as const,
  protectionCost:protect?1:0,available:target<=15};
}
/** Mathematical outcome only, also usable to inspect the locked high range. No grants/debits. */
export function refinementOutcomeV5(item:Item,protect:boolean,successRoll:number,breakRoll:number){
 const quote=refinementQuoteV5(item,protect);rollSchema.parse(successRoll);rollSchema.parse(breakRoll);
 if(successRoll<quote.successPpm)return {outcome:'success' as const,enhancement:quote.target};
 if(quote.failure==='maintain')return {outcome:'maintained' as const,enhancement:item.enhancement};
 if(breakRoll<quote.conditionalBreakPpm)return {outcome:'destroyed' as const,enhancement:null};
 return {outcome:'regressed' as const,enhancement:item.enhancement-1};
}
function draw(seed:number){let x=seed;do{x^=x<<13;x^=x>>>17;x^=x<<5;x>>>=0;}while(x>=4294000000);return {seed:x,roll:x%1000000};}
/** Pure all-or-nothing transition; seed is private server state, NEVER a client command field.
 * R6 must commit seed/snapshot/ledger/receipt together with an idempotent command key. */
export function refineItemV5(input:EconomyV2,command:{itemId:string;expectedRevision:number;protect:boolean},privateSeed:number){
 const s=EconomyV2Schema.parse(input);seedSchema.parse(privateSeed);
 const cmd=z.object({itemId:z.string().min(1),expectedRevision:z.number().int().nonnegative(),protect:z.boolean()}).strict().parse(command);
 if(cmd.expectedRevision!==s.revision)throw Error('STALE_REVISION');
 const item=s.inventory.find(i=>i.id===cmd.itemId);if(!item)throw Error('ITEM_NOT_AVAILABLE');
 const quote=refinementQuoteV5(item,cmd.protect);if(!quote.available)throw Error('JADE_SOURCE_UNAVAILABLE');
 for(const key of Object.keys(quote.cost) as (keyof typeof quote.cost)[])if(BigInt(s.balances[key])<BigInt(quote.cost[key]))throw Error('INSUFFICIENT_'+key.toUpperCase());
 if(s.protection<quote.protectionCost)throw Error('INSUFFICIENT_PROTECTION');
 const first=draw(privateSeed);
 const needsBreak=first.roll>=quote.successPpm&&quote.failure==='mixed';
 const second=needsBreak?draw(first.seed):null;
 const result=refinementOutcomeV5(item,cmd.protect,first.roll,second?.roll??0);
 for(const key of Object.keys(quote.cost) as (keyof typeof quote.cost)[])s.balances[key]=String(BigInt(s.balances[key])-BigInt(quote.cost[key]));
 s.protection-=quote.protectionCost;
 if(result.outcome==='destroyed'){
  s.inventory=s.inventory.filter(i=>i.id!==item.id);
  for(const slot of Object.keys(s.equipped) as (keyof typeof s.equipped)[])if(s.equipped[slot]===item.id)s.equipped[slot]=null;
 }else item.enhancement=result.enhancement!;
 s.revision++;
 return {state:EconomyV2Schema.parse(s),seed:second?.seed??first.seed,receipt:{itemId:item.id,from:quote.target-1,...result,cost:quote.cost,protectionSpent:quote.protectionCost}};
}
