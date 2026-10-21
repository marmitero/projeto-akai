import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialRunV6,initialMarketV2,applyMarketV2,ECONOMY_XP_V2} from '../../packages/shared/dist/index.js';
import {rekeyRun,totals,assertConservation,utility,reserve} from '../economy-v2/liquidity.mjs';
const id=n=>`30000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
test('joining independent worlds rekeys every ownership reference reversibly without granting assets',()=>{
 const source=initialRunV6(id(1));const copy=rekeyRun(source,id(2));
 assert.deepEqual(copy.economy.balances,source.economy.balances);assert.notEqual(copy.economy.inventory[0].id,source.economy.inventory[0].id);
 assert.equal(copy.economy.equipped.weapon,copy.economy.inventory[0].id);
 assert.deepEqual(rekeyRun(copy,id(1)),source);
 assert.doesNotThrow(()=>initialMarketV2({[id(1)]:source,[id(2)]:copy},0));
});
test('reconciliation includes escrow and rejects Coin minting, altered quality or protection',()=>{
 const a=initialRunV6(id(1)),b=rekeyRun(a,id(2));a.economy.highest.main=10;a.economy.balances.coin='100000000';a.economy.equipped.weapon=null;
 const before=initialMarketV2({[id(1)]:a,[id(2)]:b},0);
 const after=applyMarketV2(before,id(1),{type:'list.item',itemId:a.economy.inventory[0].id,price:'200000000',currency:'coin'},0,()=>id(3)).world;
 assertConservation(totals(before),totals(after),{coin:100000000n});
 for(const corrupt of [w=>{w.runs[id(2)].economy.balances.coin='1';},w=>{w.book.listings[0].asset.item.qualityBp++;},w=>{w.runs[id(2)].economy.protection++;}]){
  const bad=structuredClone(after);corrupt(bad);assert.throws(()=>assertConservation(totals(before),totals(bad),{coin:100000000n}));
 }
 const duplicate=structuredClone(after);duplicate.runs[id(1)].economy.inventory.push(duplicate.book.listings[0].asset.item);assert.throws(()=>totals(duplicate));
});
test('buying utility respects level requirements and the shield lost with a two-handed weapon',()=>{
 const e=initialRunV6(id(1)).economy,item={...e.inventory[0],level:100};assert.equal(utility(e,item),null);
 assert.equal(utility(e,{...e.inventory[0]}),null);
 e.masteryMs=ECONOMY_XP_V2[999];
 const shield={...e.inventory[0],id:'shield',definitionId:'shield',rarity:'legendary',level:100,enhancement:15};e.inventory.push(shield);e.equipped.shield=shield.id;
 const twoHanded={...e.inventory[0],definitionId:'greatsword',level:1,qualityBp:11000};
 // Discovering an invalid definition would fail the test rather than silently skipping its penalty.
 assert.equal(utility(e,twoHanded),null);
});

test('material plan for a purchased +0 item quotes the unprotected early levels and paid protected late levels',()=>{
 const e=initialRunV6(id(1)).economy;
 const result=reserve(e,[{itemId:e.inventory[0].id,target:12}]);
 assert.ok(result.coal>0n);assert.ok(result.iron>0n);assert.ok(result.gold>0n);
 assert.deepEqual(Object.keys(result),['coal','iron','gold']);
});
