import {describe,it,expect} from 'vitest';
import {initialRunV6,applyEconomyActionV6} from './economy-run-v6.js';
import {initialMarketV2,applyMarketV2,syncMarketV2,MarketV2ActionSchema,marketV2Tax,MarketV2WorldSchema,type MarketV2World,type MarketV2Action} from './market-v2.js';
const ids=[1,2,3].map(n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`);let seq=100;
const uuid=()=>`00000000-0000-4000-8000-${String(++seq).padStart(12,'0')}`;
function fixture(){return initialMarketV2(Object.fromEntries(ids.map(id=>{const r=initialRunV6(id);r.paused=true;r.economy.highest.main=10;r.economy.balances.coin='2000000000';r.economy.balances.iron='100000';r.economy.equipped.weapon=null;r.economy.inventory[0]!.enhancement=7;return [id,r];})),0);}
const act=(w:MarketV2World,who:number,a:MarketV2Action,t=0)=>applyMarketV2(w,ids[who]!,a,t,uuid).world;
const list=(w:MarketV2World)=>act(w,0,{type:'list.item',itemId:w.runs[ids[0]!]!.economy.inventory[0]!.id,price:'200000001',currency:'coin'});
describe('market v2 atomic ownership',()=>{
 it('rejects bound assets/currencies and validates exact integer taxes',()=>{
  for(const resource of ['jade','ruby','protection','legacyCredit','xp'])expect(MarketV2ActionSchema.safeParse({type:'list.resource',resource,quantity:'1',price:'100',currency:'coin'}).success).toBe(false);
  for(const currency of ['iron','jade','ruby'])expect(MarketV2ActionSchema.safeParse({type:'list.item',itemId:'uuid/loot/1',price:'100',currency}).success).toBe(false);
  expect(marketV2Tax('200000001')).toBe(20000001n);expect(marketV2Tax('99999999999999999999999999999999999999')).toBe(10000000000000000000000000000000000000n);
 });
 it('escrows equipment and blocks all item mutation paths until bought/claimed',()=>{
  const s=fixture(),original=s.runs[ids[0]!]!.economy.inventory[0]!;const w=list(s),r=w.runs[ids[0]!]!;
  expect(r.economy.inventory).toHaveLength(0);expect(w.book.listings[0]!.asset).toEqual({kind:'item',item:original});expect(s.runs[ids[0]!]!.economy.inventory).toHaveLength(1);
  for(const type of ['equip','refine','salvage'] as const)expect(()=>applyEconomyActionV6(r,type==='refine'?{type,itemId:original.id,protect:false}:type==='salvage'?{type,itemId:original.id,confirmed:true}:{type,itemId:original.id})).toThrow();
 });
 it('preserves instance/refinement/quality and conserves wallets plus exact fee sinks',()=>{
  const s=fixture(),original=structuredClone(s.runs[ids[0]!]!.economy.inventory[0]!),w=list(s),done=act(w,1,{type:'buy',listingId:w.book.listings[0]!.id});
  expect(done.runs[ids[1]!]!.economy.inventory.at(-1)).toEqual(original);expect(done.book.trades[0]).toMatchObject({price:'200000001',fee:'20000001',net:'180000000'});
  const sum=(x:MarketV2World)=>Object.values(x.runs).reduce((n,r)=>n+BigInt(r.economy.balances.coin),0n);expect(sum(s)-sum(done)).toBe(120000001n);expect(done.runs[ids[1]!]!.economy.masteryMs).toBe(0);
  expect(()=>act(done,2,{type:'buy',listingId:w.book.listings[0]!.id})).toThrow('LISTING_CLOSED');
 });
 it('holds cancelled/expired assets until one claim and enforces cancellation cooldown',()=>{
  const w=list(fixture()),lid=w.book.listings[0]!.id,cancelled=act(w,0,{type:'cancel',listingId:lid}),claimed=act(cancelled,0,{type:'claim',listingId:lid});
  expect(()=>act(claimed,0,{type:'claim',listingId:lid})).toThrow('NOT_CLAIMABLE');expect(()=>list(claimed)).toThrow('RELIST_COOLDOWN');
  const i=claimed.runs[ids[0]!]!.economy.inventory[0]!;expect(act(claimed,0,{type:'list.item',itemId:i.id,price:'100',currency:'coin'},86400000).book.listings).toHaveLength(2);
  const expired=syncMarketV2(w,72*3600000);expect(expired.book.listings[0]!.status).toBe('expired');expect(()=>act(expired,1,{type:'buy',listingId:lid},72*3600000)).toThrow('LISTING_CLOSED');expect(act(expired,0,{type:'claim',listingId:lid},72*3600000).runs[ids[0]!]!.economy.inventory[0]).toEqual(i);
 });
 it('revalidates unreserved offers and closes competing offers when one trade commits',()=>{
  let w=list(fixture());const lid=w.book.listings[0]!.id;w=act(w,1,{type:'offer',listingId:lid,price:'100000001',currency:'coin'});const offer=w.book.offers[0]!.id;expect(w.runs[ids[1]!]!.economy.balances.coin).toBe('2000000000');
  w.runs[ids[1]!]!.economy.balances.coin='0';expect(()=>act(w,0,{type:'offer.accept',offerId:offer})).toThrow('INSUFFICIENT_FUNDS');expect(w.book.offers[0]!.status).toBe('pending');
  w.runs[ids[1]!]!.economy.balances.coin='2000000000';w=act(w,2,{type:'offer',listingId:lid,price:'90000000',currency:'coin'});const done=act(w,0,{type:'offer.accept',offerId:offer});expect(done.book.offers.map(o=>o.status)).toEqual(['accepted','closed']);expect(done.book.trades).toHaveLength(1);
 });
 it('trades only selected materials; no XP/Jade/protection and item overflow or high level goes to vault',()=>{
  let w=fixture();w=act(w,0,{type:'list.resource',resource:'iron',quantity:'1000',price:'1001',currency:'coin'});const before=structuredClone(w.runs[ids[1]!]!.economy);w=act(w,1,{type:'buy',listingId:w.book.listings[0]!.id});expect(w.runs[ids[1]!]!.economy.balances.iron).toBe('101000');expect(w.runs[ids[1]!]!.economy.masteryMs).toBe(before.masteryMs);expect(w.runs[ids[1]!]!.economy.protection).toBe(before.protection);
  w=fixture();w.runs[ids[0]!]!.economy.inventory[0]!.level=100;w=list(w);const item=w.book.listings[0]!.asset;w=act(w,1,{type:'buy',listingId:w.book.listings[0]!.id});expect(w.runs[ids[1]!]!.economy.vault).toEqual(item.kind==='item'?[item.item]:[]);
 });
 it('rejects Coin overflow atomically and routes a full bag to vault without loss',()=>{
  let w=fixture();w.runs[ids[0]!]!.economy.balances.coin='9'.repeat(38);w=list(w);const before=structuredClone(w);expect(()=>act(w,1,{type:'buy',listingId:w.book.listings[0]!.id})).toThrow('BALANCE_LIMIT');expect(w).toEqual(before);
  w=fixture();const buyer=w.runs[ids[1]!]!.economy;while(buyer.inventory.length<120)buyer.inventory.push({...buyer.inventory[0]!,id:ids[1]+'/filler/'+buyer.inventory.length});w=list(w);const done=act(w,1,{type:'buy',listingId:w.book.listings[0]!.id});expect(done.runs[ids[1]!]!.economy.inventory).toHaveLength(120);expect(done.runs[ids[1]!]!.economy.vault).toHaveLength(1);
 });
 it('rejects self trade, equipped/unowned items, locked progression, cloned IDs and backwards clocks',()=>{
  const w=fixture();const owner=w.runs[ids[0]!]!.economy;owner.equipped.weapon=owner.inventory[0]!.id;expect(()=>list(w)).toThrow('ITEM_EQUIPPED');owner.equipped.weapon=null;expect(()=>act(w,0,{type:'list.item',itemId:'other/item',price:'100',currency:'coin'})).toThrow('ITEM_NOT_AVAILABLE');w.runs[ids[0]!]!.economy.highest.main=9;expect(()=>list(w)).toThrow('COMPLETE_FLOOR_TEN');w.runs[ids[0]!]!.economy.highest.main=10;
  const listed=list(w);expect(()=>act(listed,0,{type:'buy',listingId:listed.book.listings[0]!.id})).toThrow('SELF_TRADE');expect(()=>syncMarketV2(syncMarketV2(w,100),99)).toThrow('CLOCK_REWIND');
  const cloned=structuredClone(w);cloned.runs[ids[1]!]!.economy.inventory.push(structuredClone(w.runs[ids[0]!]!.economy.inventory[0]!));expect(MarketV2WorldSchema.safeParse(cloned).success).toBe(false);
 });
});
