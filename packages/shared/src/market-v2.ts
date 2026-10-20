import {z} from 'zod';
import {EconomyItemV2Schema,masteryLevel,type EconomyV2} from './economy-v2.js';
import {EconomyRunV6Schema,type EconomyRunV6} from './economy-run-v6.js';
const time=z.number().int().nonnegative().safe(),id=z.uuid();
export const MarketV2AmountSchema=z.string().regex(/^[1-9]\d{0,37}$/);
const price=MarketV2AmountSchema.refine(n=>BigInt(n)>1n,'Price must exceed rounded tax');
export const MARKET_V2_RESOURCES=['coal','iron','gold'] as const;
export const MARKET_V2_RULES={listingMilli:'100000000',taxBp:1000,ttlMs:72*3600000,cancelMs:24*3600000,minimumFloor:10,maxListingsPerSeller:20} as const;
export const MarketV2AssetSchema=z.discriminatedUnion('kind',[
 z.object({kind:z.literal('item'),item:EconomyItemV2Schema}).strict(),
 z.object({kind:z.literal('resource'),resource:z.enum(MARKET_V2_RESOURCES),quantity:MarketV2AmountSchema}).strict(),
]);
export const MarketV2ActionSchema=z.discriminatedUnion('type',[
 z.object({type:z.literal('list.item'),itemId:z.string().min(1).max(160),price,currency:z.literal('coin')}).strict(),
 z.object({type:z.literal('list.resource'),resource:z.enum(MARKET_V2_RESOURCES),quantity:MarketV2AmountSchema,price,currency:z.literal('coin')}).strict(),
 z.object({type:z.literal('buy'),listingId:id}).strict(),z.object({type:z.literal('cancel'),listingId:id}).strict(),z.object({type:z.literal('claim'),listingId:id}).strict(),
 z.object({type:z.literal('offer'),listingId:id,price,currency:z.literal('coin')}).strict(),
 z.object({type:z.literal('offer.accept'),offerId:id}).strict(),z.object({type:z.literal('offer.reject'),offerId:id}).strict(),z.object({type:z.literal('offer.withdraw'),offerId:id}).strict(),
 z.object({type:z.literal('sync')}).strict(),
]);
export type MarketV2Action=z.infer<typeof MarketV2ActionSchema>;
export const MarketV2CommandSchema=z.object({commandId:id,expectedRevision:time,action:MarketV2ActionSchema}).strict();
const Listing=z.object({id,seller:id,asset:MarketV2AssetSchema,price,currency:z.literal('coin'),createdAt:time,expiresAt:time,status:z.enum(['active','sold','cancelled','expired']),claimed:z.boolean()}).strict();
const Offer=z.object({id,listingId:id,buyer:id,price,currency:z.literal('coin'),expiresAt:time,status:z.enum(['pending','accepted','rejected','withdrawn','expired','closed'])}).strict();
const Trade=z.object({id,listingId:id,buyer:id,seller:id,price,fee:MarketV2AmountSchema,net:MarketV2AmountSchema,asset:MarketV2AssetSchema,at:time}).strict();
export const MarketV2BookSchema=z.object({version:z.literal('market-v2-1'),clockMs:time,revision:time,listings:z.array(Listing).max(5000),offers:z.array(Offer).max(5000),trades:z.array(Trade).max(5000),cooldowns:z.array(z.object({owner:id,key:z.string(),until:time}).strict()).max(5000)}).strict();
export const MarketV2WorldSchema=z.object({book:MarketV2BookSchema,runs:z.record(id,EconomyRunV6Schema).refine(r=>Object.keys(r).length>=2&&Object.keys(r).length<=20,'Private cohort requires2–20 members')}).strict().superRefine((w,c)=>{
 const accounts=Object.values(w.runs).map(r=>r.economy.accountId);if(new Set(accounts).size!==accounts.length)c.addIssue({code:'custom',message:'Duplicate account in market cohort'});
 const owned=Object.values(w.runs).flatMap(r=>[...r.economy.inventory,...r.economy.vault].map(i=>i.id));
 for(const l of w.book.listings){if(!w.runs[l.seller])c.addIssue({code:'custom',message:'Unknown seller'});if(l.asset.kind==='item'&&l.status!=='sold'&&!l.claimed)owned.push(l.asset.item.id);}
 if(new Set(owned).size!==owned.length)c.addIssue({code:'custom',message:'Duplicate v2 item ownership or escrow'});
 for(const list of [w.book.listings,w.book.offers,w.book.trades])if(new Set(list.map(x=>x.id)).size!==list.length)c.addIssue({code:'custom',message:'Duplicate market record'});
 for(const o of w.book.offers)if(!w.runs[o.buyer]||!w.book.listings.some(l=>l.id===o.listingId))c.addIssue({code:'custom',message:'Unknown offer member/listing'});
});
export type MarketV2World=z.infer<typeof MarketV2WorldSchema>;
export type MarketV2Book=z.infer<typeof MarketV2BookSchema>;
export function initialMarketV2(runs:Record<string,EconomyRunV6>,at:number){return MarketV2WorldSchema.parse({book:{version:'market-v2-1',clockMs:at,revision:0,listings:[],offers:[],trades:[],cooldowns:[]},runs});}
export const marketV2Tax=(p:string)=>(BigInt(p)+9n)/10n;
function rule(ok:unknown,code:string):asserts ok{if(!ok)throw Error(code);}
function delta(e:EconomyV2,k:keyof EconomyV2['balances'],n:bigint){const v=BigInt(e.balances[k])+n;rule(v>=0n,'INSUFFICIENT_FUNDS');rule(v<10n**38n,'BALANCE_LIMIT');e.balances[k]=String(v);}
const key=(a:z.infer<typeof MarketV2AssetSchema>)=>a.kind==='item'?'item:'+a.item.id:'resource:'+a.resource;
export function syncMarketV2(input:MarketV2World,now:number){const w=MarketV2WorldSchema.parse(input);time.parse(now);rule(now>=w.book.clockMs,'MARKET_CLOCK_REWIND');w.book.clockMs=now;
 for(const l of w.book.listings)if(l.status==='active'&&l.expiresAt<=now)l.status='expired';
 for(const o of w.book.offers)if(o.status==='pending'&&(o.expiresAt<=now||w.book.listings.find(l=>l.id===o.listingId)!.status!=='active'))o.status=o.expiresAt<=now?'expired':'closed';
 w.book.cooldowns=w.book.cooldowns.filter(x=>x.until>now);return w;
}
/** Pure atomic ownership transition. Run IDs are private-cohort identities, item IDs never change owner prefix. */
export function applyMarketV2(input:MarketV2World,actor:string,inputAction:MarketV2Action,now:number,newId:()=>string){
 const w=syncMarketV2(input,now),a=MarketV2ActionSchema.parse(inputAction),book=w.book,run=w.runs[actor];rule(run,'MEMBER_NOT_FOUND');
 for(const r of Object.values(w.runs))rule(!r.offlineJob,'SETTLEMENT_BACKLOG');
 const e=run.economy;const fresh=()=>{const x=id.parse(newId());rule(![...book.listings,...book.offers,...book.trades].some(r=>r.id===x),'MARKET_ID_CONFLICT');return x;};
 const deliver=(owner:string,asset:z.infer<typeof MarketV2AssetSchema>)=>{const dst=w.runs[owner]!.economy;if(asset.kind==='resource')delta(dst,asset.resource,BigInt(asset.quantity));else (dst.inventory.length<120&&masteryLevel(dst.masteryMs)>=1+(asset.item.level-1)*10?dst.inventory:dst.vault).push(structuredClone(asset.item));};
 const eligible=(owner:string)=>rule(w.runs[owner]!.economy.highest.main>=10,'COMPLETE_FLOOR_TEN');
 let listingId:string|undefined;
 const trade=(l:z.infer<typeof Listing>,buyer:string,p:string,offer?:z.infer<typeof Offer>)=>{
  rule(w.runs[buyer]!.economy.accountId!==w.runs[l.seller]!.economy.accountId,'SELF_TRADE');eligible(buyer);eligible(l.seller);
  const fee=marketV2Tax(p),net=BigInt(p)-fee;delta(w.runs[buyer]!.economy,'coin',-BigInt(p));delta(w.runs[l.seller]!.economy,'coin',net);deliver(buyer,l.asset);
  l.status='sold';l.claimed=true;for(const o of book.offers)if(o.listingId===l.id&&o.status==='pending')o.status=o===offer?'accepted':'closed';
  book.trades.push({id:fresh(),listingId:l.id,buyer,seller:l.seller,price:p,fee:String(fee),net:String(net),asset:structuredClone(l.asset),at:now});
 };
 if(a.type==='list.item'||a.type==='list.resource'){
  eligible(actor);rule(book.listings.filter(l=>l.seller===actor&&(l.status==='active'||l.status!=='sold'&&!l.claimed)).length<20,'LISTING_LIMIT');rule(book.listings.length<5000,'MARKET_CAPACITY');
  let asset:z.infer<typeof MarketV2AssetSchema>;
  if(a.type==='list.item'){
   const i=e.inventory.findIndex(i=>i.id===a.itemId);rule(i>=0,'ITEM_NOT_AVAILABLE');rule(!Object.values(e.equipped).includes(a.itemId),'ITEM_EQUIPPED');asset={kind:'item',item:e.inventory.splice(i,1)[0]!};
  }else{delta(e,a.resource,-BigInt(a.quantity));asset={kind:'resource',resource:a.resource,quantity:a.quantity};}
  rule(!book.cooldowns.some(c=>c.owner===actor&&c.key===key(asset)&&c.until>now),'RELIST_COOLDOWN');delta(e,'coin',-BigInt(MARKET_V2_RULES.listingMilli));
  listingId=fresh();book.listings.push({id:listingId,seller:actor,asset,price:a.price,currency:'coin',createdAt:now,expiresAt:now+MARKET_V2_RULES.ttlMs,status:'active',claimed:false});
 }else if(a.type!=='sync'){
  const o='offerId' in a?book.offers.find(o=>o.id===a.offerId):undefined;const lid='listingId' in a?a.listingId:o?.listingId;const l=book.listings.find(l=>l.id===lid);rule(l,'LISTING_NOT_FOUND');listingId=l.id;
  if(a.type==='claim'){
   rule(l.seller===actor,'FORBIDDEN');rule((l.status==='cancelled'||l.status==='expired')&&!l.claimed,'NOT_CLAIMABLE');deliver(actor,l.asset);l.claimed=true;
  }else{
   rule(l.status==='active'&&l.expiresAt>now,'LISTING_CLOSED');
   if(a.type==='cancel'){rule(l.seller===actor,'FORBIDDEN');l.status='cancelled';book.cooldowns.push({owner:actor,key:key(l.asset),until:now+MARKET_V2_RULES.cancelMs});for(const offer of book.offers)if(offer.listingId===l.id&&offer.status==='pending')offer.status='closed';}
   else if(a.type==='buy')trade(l,actor,l.price);
   else if(a.type==='offer'){
    eligible(actor);rule(l.seller!==actor,'SELF_TRADE');rule(BigInt(e.balances.coin)>=BigInt(a.price),'INSUFFICIENT_FUNDS');rule(book.offers.filter(o=>o.buyer===actor&&o.status==='pending').length<20,'OFFER_LIMIT');rule(!book.offers.some(o=>o.listingId===l.id&&o.buyer===actor&&o.status==='pending'),'OFFER_EXISTS');
    book.offers.push({id:fresh(),listingId:l.id,buyer:actor,price:a.price,currency:'coin',expiresAt:Math.min(l.expiresAt,now+MARKET_V2_RULES.ttlMs),status:'pending'});
   }else{
    rule(o&&o.status==='pending'&&o.expiresAt>now,'OFFER_CLOSED');rule(a.type==='offer.withdraw'?o.buyer===actor:l.seller===actor,'FORBIDDEN');
    if(a.type==='offer.accept')trade(l,o.buyer,o.price,o);else o.status=a.type==='offer.withdraw'?'withdrawn':'rejected';
   }
  }
 }
 book.revision++;return {world:MarketV2WorldSchema.parse(w),listingId};
}
