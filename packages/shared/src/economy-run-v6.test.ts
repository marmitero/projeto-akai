import {describe,it,expect} from 'vitest';
import {initialRunV6,advanceRunV6,applyEconomyActionV6,type EconomyRunV6} from './economy-run-v6.js';
import {advanceCombatV3} from './combat-v3.js';
import {ECONOMY_XP_V2,masteryLevel} from './economy-v2.js';
import {presetBuildV3} from './build-presets-v3.js';
const id='00000000-0000-4000-8000-000000000001';
const strong=(floor=1,activity:'main'|'coal'|'iron'|'gold'='main')=>{const s=initialRunV6(id);s.economy=presetBuildV3(1000,'swift','epic9');s.economy.accountId=id;s.economy.activity=activity;s.economy.floor=floor;s.economy.highest.main=1000;s.autoAdvance=false;return s;};
const normalize=(s:EconomyRunV6)=>{const c=structuredClone(s);c.economy.revision=0;return c;};
describe('R6 integrated economy',()=>{
 it('is equivalent in batches, JSON resume, short reads and bounded backlog through wave walks',()=>{
  const s=strong(101),batch=advanceRunV6(s,60000,10000).state;let frames=s;
  for(let t=500;t<=60000;t+=500)frames=advanceRunV6(JSON.parse(JSON.stringify(frames)),t,10000).state;
  expect(normalize(frames)).toEqual(normalize(batch));let bounded=s;for(let i=0;i<10000;i++){const r=advanceRunV6(bounded,60000,1);bounded=r.state;if(!r.backlog)break;}
  expect(normalize(bounded)).toEqual(normalize(batch));expect(s.killSequence).toBe(0);
 },15000);
 it('credits hunts only their material and XP, no Coin/equipment/scroll/Jade even on forced loot entropy',()=>{
  for(const k of ['coal','iron','gold'] as const){const s=strong(1,k),r=advanceRunV6(s,30000,10000,()=>0).state;expect(BigInt(r.economy.balances[k])).toBeGreaterThan(0n);expect(r.economy.balances.coin).toBe('0');expect(r.economy.balances.jade).toBe('0');expect(r.economy.inventory).toEqual(s.economy.inventory);expect(r.economy.protection).toBe(0);expect(r.economy.highest[k]).toBe(1);}
 });
 it('never farms cleared bosses via selection or automatic advancement',()=>{
  const s=strong(9);s.autoAdvance=true;const r=advanceRunV6(s,30000,10000).state;expect(r.log.some(l=>l.text.includes('main 10 '))).toBe(false);
  expect(()=>applyEconomyActionV6(s,{type:'select',activity:'main',floor:10})).toThrow('NOT_REPEATABLE');
  const b=strong(10);b.economy.highest.main=9;const won=advanceRunV6(b,10000,10000).state;expect(won.economy.highest.main).toBe(10);expect(won.economy.floor).not.toBe(10);
 });
 it('preserves the legacy exclusive 30s tower boss deadline without granting failed clear loot/XP',()=>{
  const s=initialRunV6(id);s.economy.masteryMs=ECONOMY_XP_V2[99]!;s.economy.attributes.vitality=594;s.economy.floor=100;s.economy.highest.main=99;
  const before=s.economy.masteryMs,atLimit=advanceRunV6(s,30000).state;expect(atLimit.paused).toBe(true);expect(atLimit.economy.highest.main).toBe(99);expect(atLimit.killSequence).toBe(0);expect(atLimit.economy.masteryMs).toBe(before);expect(atLimit.economy.balances.coin).toBe('0');
  expect(atLimit.log.at(-1)).toMatchObject({at:30000,text:'Tempo esgotado main 100'});
  const after=advanceRunV6(atLimit,31000).state;expect(after.economy.masteryMs).toBe(before);expect(after.killSequence).toBe(0);
 });
 it('repairs pre-fix active boss saves without resetting their timeout, rewinding time or minting rewards',()=>{
  const s=initialRunV6(id);s.economy.masteryMs=ECONOMY_XP_V2[99]!;s.economy.attributes.vitality=594;s.economy.floor=100;s.economy.highest.main=99;
  const old=advanceRunV6(s,20000).state;old.encounter!.combat.deadlineMs=null;
  const resumed=advanceRunV6(JSON.parse(JSON.stringify(old)),25000).state;expect(resumed.encounter!.combat.deadlineMs).toBe(30000);
  const due=advanceRunV6(resumed,30000).state;expect(due.paused).toBe(true);expect(due.economy.highest.main).toBe(99);
  const overdue=structuredClone(old);overdue.encounter!.combat=advanceCombatV3(overdue.encounter!.combat,31000).state;overdue.encounter!.combatMs=31000;overdue.economy.economicThroughMs=31000;
  const expired=advanceRunV6(overdue,31000).state;expect(expired.paused).toBe(true);expect(expired.encounter).toBeNull();expect(expired.economy.economicThroughMs).toBe(31000);expect(expired.economy.balances).toEqual(overdue.economy.balances);expect(expired.economy.masteryMs).toBe(overdue.economy.masteryMs);expect(expired.killSequence).toBe(0);expect(old.encounter!.combat.deadlineMs).toBeNull();
 });
 it('sends full-bag loot to the vault with unique identities and no auto salvage',()=>{
  const s=strong(101);while(s.economy.inventory.length<120)s.economy.inventory.push({...s.economy.inventory[0]!,id:`filler-${s.economy.inventory.length}`});
  const r=advanceRunV6(s,15000,10000,()=>0).state;expect(r.economy.vault.length).toBeGreaterThan(0);expect(r.economy.inventory).toHaveLength(120);
  const ids=[...r.economy.inventory,...r.economy.vault].map(i=>i.id);expect(new Set(ids).size).toBe(ids.length);expect(r.economy.protection).toBe(r.killSequence);
  const same=advanceRunV6(r,15000,10000,()=>0).state;expect(same.killSequence).toBe(r.killSequence);expect(same.economy.balances).toEqual(r.economy.balances);
 });
 it('freezes stats through all waves even if training/equipment changes during a cycle',()=>{
  let s=strong(101);s=advanceRunV6(s,100).state;const frozen=s.encounter!.combat.actors[0]!.stats;
  s.economy.attributes.force=0;s.economy.equipped.weapon=null;s=advanceRunV6(s,5500).state;expect(s.encounter!.wave).toBeGreaterThan(1);expect(s.encounter!.combat.actors[0]!.stats).toEqual(frozen);
 });
 it('has no XP from losses, walking or pauses and never credits more mastery than simulated time',()=>{
  let s=initialRunV6(id);s.economy.activity='gold';s.economy.floor=1000;s.economy.highest.main=20;
  const loss=advanceRunV6(s,60000).state;expect(loss.paused).toBe(true);expect(loss.economy.masteryMs).toBe(0);
  s=initialRunV6(id);s=applyEconomyActionV6(s,{type:'pause',paused:true});s=advanceRunV6(s,28800000).state;expect(s.economy.masteryMs).toBe(0);expect(s.killSequence).toBe(0);
  s=applyEconomyActionV6(s,{type:'pause',paused:false});s=advanceRunV6(s,28801000).state;expect(s.killSequence).toBeLessThan(4);
  const fresh=initialRunV6(id);fresh.economy.equipped.weapon=null;fresh.economy.inventory[0]!.level=1;
  const r=advanceRunV6(fresh,120000).state;expect(r.economy.masteryMs).toBeLessThanOrEqual(120000);
 });
 it('integrates crossed mastery levels with carry and bounded time, without rewarding a zero-time reread',()=>{
  const s=initialRunV6(id);s.economy.masteryMs=ECONOMY_XP_V2[1]!-2;s.economy.inventory[0]!.rarity='legendary';s.economy.inventory[0]!.enhancement=15;s.autoAdvance=false;
  const r=advanceRunV6(s,60000).state;expect(masteryLevel(r.economy.masteryMs)).toBeGreaterThanOrEqual(2);expect(r.economy.masteryMs-s.economy.masteryMs).toBeLessThanOrEqual(60000);
  const read=advanceRunV6(r,60000).state;expect(read.economy.masteryMs).toBe(r.economy.masteryMs);expect(read.xpCarry).toBe(r.xpCarry);
 });
 it('blocks retired commands, locked hunts, skipping and high legacy item claims; salvage gives Coin only',()=>{
  const s=initialRunV6(id);expect(()=>applyEconomyActionV6(s,{type:'select',activity:'gold',floor:1})).toThrow('LOCKED');
  expect(()=>applyEconomyActionV6(s,{type:'select',activity:'main',floor:3})).toThrow('NOT_UNLOCKED');
  expect(()=>applyEconomyActionV6(s,{type:'mining.click'} as never)).toThrow();
  s.economy.vault.push({...s.economy.inventory[0]!,id:'legacy',origin:'legacy',level:100});expect(()=>applyEconomyActionV6(s,{type:'claim',itemId:'legacy'})).toThrow('LEVEL');
  const item={...s.economy.inventory[0]!,id:'salvage',rarity:'legendary' as const,enhancement:7};s.economy.inventory.push(item);
  expect(()=>applyEconomyActionV6(s,{type:'salvage',itemId:item.id,confirmed:false})).toThrow('CONFIRM');const r=applyEconomyActionV6(s,{type:'salvage',itemId:item.id,confirmed:true});expect(r.economy.balances).toEqual({coin:'1000',coal:'0',iron:'0',gold:'0',jade:'0'});
 });
});
