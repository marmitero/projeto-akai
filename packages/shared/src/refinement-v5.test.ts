import {describe,it,expect} from 'vitest';
import {initialEconomyV2,ECONOMY_XP_V2,type EconomyV2} from './economy-v2.js';
import {refinementQuoteV5,refinementOutcomeV5,refineItemV5,REFINEMENT_SUCCESS_PPM_V5} from './refinement-v5.js';
import {planWeeklyProtectionV5,planTowerProtectionV5} from './protection-v5.js';
const id='00000000-0000-4000-8000-000000000001';
function state(enhancement=0){const s=initialEconomyV2(id,0);s.masteryMs=ECONOMY_XP_V2[999]!;s.inventory[0]!.rarity='legendary';s.inventory[0]!.enhancement=enhancement;for(const k of Object.keys(s.balances) as (keyof EconomyV2['balances'])[])s.balances[k]='999999999999999';s.protection=100;return s;}
const item=(n=0)=>state(n).inventory[0]!;
const command=(s:EconomyV2,protect=false)=>({itemId:s.inventory[0]!.id,protect,expectedRevision:s.revision});
describe('R5 refinement',()=>{
 it('charges exact recipes, thresholds, late multipliers and rarity cap',()=>{
  const i=item();i.rarity='common';expect(refinementQuoteV5(i).cost).toEqual({coin:'100000',coal:'2000',iron:'0',gold:'0',jade:'0'});
  i.enhancement=4;expect(refinementQuoteV5(i).cost.iron).toBe('0');i.enhancement=5;expect(refinementQuoteV5(i).cost.iron).toBe('10000');
  i.enhancement=10;expect(refinementQuoteV5(i).cost).toEqual({coin:'6424000',coal:'76000',iron:'248000',gold:'8000',jade:'0'});
  i.enhancement=15;expect(()=>refinementQuoteV5(i)).toThrow('LEGENDARY');i.rarity='legendary';expect(BigInt(refinementQuoteV5(i).cost.jade)>0n).toBe(true);
  i.enhancement=20;expect(()=>refinementQuoteV5(i)).toThrow('MAXIMUM');expect(()=>refinementQuoteV5(item(0),true)).toThrow('NOT_ALLOWED');
 });
 it('uses destination levels, exact chance boundaries and conditional destruction rules',()=>{
  for(let n=1;n<=20;n++){
   const i=item(n-1),p=REFINEMENT_SUCCESS_PPM_V5[n-1]!;
   expect(refinementOutcomeV5(i,false,p-1,999999)).toEqual({outcome:'success',enhancement:n});
   const fail=refinementOutcomeV5(i,false,p,999999);expect(fail.outcome).toBe(n<=3?'maintained':n<=12?'regressed':'destroyed');
   if(n>=8){const q=refinementQuoteV5(i);expect(refinementOutcomeV5(i,false,p,q.conditionalBreakPpm-1).outcome).toBe('destroyed');
    if(n<=12)expect(refinementOutcomeV5(i,false,p,q.conditionalBreakPpm).outcome).toBe('regressed');
    expect(refinementOutcomeV5(i,true,p,0)).toEqual({outcome:'regressed',enhancement:n-2});expect(refinementQuoteV5(i,true).successPpm).toBe(p);}
  }
 });
 it('debits all costs and protection once even on success; immutable, deterministic and stale-safe',()=>{
  const s=state(7),before=structuredClone(s),q=refinementQuoteV5(s.inventory[0]!,true),r=refineItemV5(s,command(s,true),4213);
  expect(s).toEqual(before);expect(r).toEqual(refineItemV5(s,command(s,true),4213));expect(r.state.protection).toBe(99);expect(r.receipt.protectionSpent).toBe(1);
  for(const k of Object.keys(q.cost) as (keyof typeof q.cost)[])expect(BigInt(s.balances[k])-BigInt(r.state.balances[k])).toBe(BigInt(q.cost[k]));
  expect(()=>refineItemV5(r.state,command(s,true),r.seed)).toThrow('STALE');
  expect(r.receipt.outcome).toBe('success');
 });
 it('rejects unpaid attempts, missing scroll, unavailable items and high range without mutation',()=>{
  const s=state(7);s.protection=0;let before=structuredClone(s);expect(()=>refineItemV5(s,command(s,true),1)).toThrow('PROTECTION');expect(s).toEqual(before);
  for(const k of ['coin','coal','iron'] as const){const a=state(7);a.balances[k]='0';before=structuredClone(a);expect(()=>refineItemV5(a,command(a),1)).toThrow('INSUFFICIENT');expect(a).toEqual(before);}
  const h=state(15);expect(()=>refineItemV5(h,command(h),1)).toThrow('JADE_SOURCE');
  const v=state();const cmd=command(v);v.equipped.weapon=null;v.vault.push(v.inventory.pop()!);expect(()=>refineItemV5(v,cmd,1)).toThrow('NOT_AVAILABLE');
  expect(()=>refineItemV5(state(),command(state()),0)).toThrow();
 });
 it('removes broken equipped instances without refund or cloned replacements',()=>{
  const s=state(12);let r;
  for(let seed=1;seed<100;seed++){const candidate=refineItemV5(s,command(s),seed);if(candidate.receipt.outcome==='destroyed'){r=candidate;break;}}
  expect(r).toBeDefined();expect(r!.state.inventory).toEqual([]);expect(r!.state.equipped.weapon).toBeNull();expect(r!.state.vault).toEqual([]);expect(r!.state.protection).toBe(100);expect(BigInt(r!.state.balances.coin)).toBeLessThan(BigInt(s.balances.coin));
 });
});
describe('R5 free protection plans',()=>{
 it('grants five per 5min milestone, capped at30/week with stable unique keys',()=>{
  const input={accountId:id,week:'2026-10-19',qualifiedMs:1800000,deliveredMilestones:0};const p=planWeeklyProtectionV5(input);
  expect(p).toHaveLength(6);expect(planWeeklyProtectionV5({...input,qualifiedMs:7200000})).toEqual(p);expect(p.reduce((a,b)=>a+b.amount,0)).toBe(30);expect(new Set(p.map(g=>g.key)).size).toBe(6);expect(planWeeklyProtectionV5(input)).toEqual(p);
  expect(planWeeklyProtectionV5({...input,deliveredMilestones:6})).toEqual([]);expect(planWeeklyProtectionV5({...input,qualifiedMs:299999})).toEqual([]);
  expect(()=>planWeeklyProtectionV5({...input,week:'2026-10-20'})).toThrow('INVALID_WEEK');expect(()=>planWeeklyProtectionV5({...input,qualifiedMs:0,deliveredMilestones:1})).toThrow('REWIND');
 });
 it('permits rare scrolls only on confirmed common tower kills at100+ and no luck modifier',()=>{
  const input={accountId:id,killId:'encounter-1/enemy-1',activity:'main' as const,floor:101,defeated:true,roll:19};
  expect(planTowerProtectionV5(input).amount).toBe(1);expect(planTowerProtectionV5({...input,roll:20}).amount).toBe(0);
  for(const activity of ['coal','iron','gold'] as const)expect(planTowerProtectionV5({...input,activity}).amount).toBe(0);
  for(const floor of [1,99,100,110])expect(planTowerProtectionV5({...input,floor}).amount).toBe(0);
  expect(planTowerProtectionV5({...input,defeated:false}).amount).toBe(0);expect(planTowerProtectionV5(input).key).toBe(planTowerProtectionV5({...input,roll:0}).key);
 });
});
