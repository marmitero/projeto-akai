import { describe,it,expect } from 'vitest';
import { initialEconomyV2,EconomyV2Schema,masteryLevel,ECONOMY_XP_V2,canEquipV2 } from './economy-v2.js';
import { planDailyBossJade,type DailyBossJadeInput } from './daily-boss-jade.js';
const id=(n:number)=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const member=(n:number,damage=1000-n)=>({accountId:id(n),name:`Jogador ${n}`,damage:String(damage),qualifiedSeconds:600,highestFloor:100,suspended:false});
const edition=(members=Array.from({length:12},(_,i)=>member(i+1))):DailyBossJadeInput=>({edition:'boss:2026-10-20',defeated:true,lastHit:id(1),members});
describe('economy v2 inactive contracts',()=>{
  it('freezes 1000 strictly increasing integer XP thresholds with exact 96-day floor',()=>{
    expect(ECONOMY_XP_V2).toHaveLength(1000);expect(ECONOMY_XP_V2[0]).toBe(0);
    expect(ECONOMY_XP_V2[999]).toBe(96*86400000);
    for(let i=1;i<1000;i++){expect(Number.isSafeInteger(ECONOMY_XP_V2[i])).toBe(true);expect(ECONOMY_XP_V2[i]!).toBeGreaterThan(ECONOMY_XP_V2[i-1]!);expect(masteryLevel(ECONOMY_XP_V2[i]!)).toBe(i+1);expect(masteryLevel(ECONOMY_XP_V2[i]!-1)).toBe(i);}
    expect(masteryLevel(Number.MAX_SAFE_INTEGER)).toBe(1000);expect(()=>masteryLevel(-1)).toThrow();
  });
  it('has one starter instance, zero inherited resources and gates gear by mastery',()=>{
    const s=initialEconomyV2(id(1),1234);
    expect(Object.values(s.balances)).toEqual(['0','0','0','0','0']);
    expect(canEquipV2(s,s.inventory[0]!.id)).toBe(true);
    s.inventory[0]!.level=100;expect(canEquipV2(s,s.inventory[0]!.id)).toBe(false);
    s.masteryMs=ECONOMY_XP_V2[990]!;expect(canEquipV2(s,s.inventory[0]!.id)).toBe(true);
    s.vault.push({...s.inventory[0]!});expect(()=>EconomyV2Schema.parse(s)).toThrow();
  });
});
describe('daily jade award plans',()=>{
  it('awards exact top10 linear bonuses, participation and last hit cumulatively',()=>{
    const result=planDailyBossJade(edition());
    expect(result.ranking.map(x=>x.jade)).toEqual([200,180,160,140,120,100,80,60,40,20]);
    expect(result.grants.filter(x=>x.accountId===id(1)).reduce((a,x)=>a+x.jade,0)).toBe(453);
    expect(result.grants.filter(x=>x.kind==='ranking').reduce((a,x)=>a+x.jade,0)).toBe(1100);
    expect(result.grants.reduce((a,x)=>a+x.jade,0)).toBe(3*12+1100+250);
    expect(result.broadcast?.text).toBe('Jogador 1 deu o último golpe no boss diário e ganhou 250 jade!');
    expect(planDailyBossJade(edition())).toEqual(result);
    expect(new Set(result.grants.map(x=>x.source+'/'+x.accountId)).size).toBe(result.grants.length);
  });
  it('keeps participation on timeout without awarding ranking/last-hit or broadcasting',()=>{
    const e=edition();e.defeated=false;e.lastHit=null;
    const r=planDailyBossJade(e);expect(r.ranking).toEqual([]);expect(r.broadcast).toBeNull();expect(r.grants.every(x=>x.kind==='participation')).toBe(true);
  });
  it('uses stable exact bigint ranking, filters noneligible and gives no invented empty places',()=>{
    const e=edition([member(2),member(1)]);e.members[0]!.damage=e.members[1]!.damage='90071992547409930000';
    expect(planDailyBossJade(e).ranking.map(x=>x.accountId)).toEqual([id(1),id(2)]);
    e.members.push({...member(3),suspended:true},{...member(4),highestFloor:99},member(5,0));
    expect(planDailyBossJade(e).ranking).toHaveLength(2);
  });
  it('requires ten minutes for base participation but not ranking or legitimate last hit',()=>{
    const e=edition([member(1)]);e.members[0]!.qualifiedSeconds=599;
    const r=planDailyBossJade(e);expect(r.grants.reduce((a,x)=>a+x.jade,0)).toBe(450);
    e.members[0]!.qualifiedSeconds=600;expect(planDailyBossJade(e).grants.reduce((a,x)=>a+x.jade,0)).toBe(453);
  });
  it('rejects duplicate members, fabricated killers and inconsistent kill snapshots',()=>{
    const e=edition();e.members.push(e.members[0]!);expect(()=>planDailyBossJade(e)).toThrow('DUPLICATE');
    const bad=edition();bad.lastHit=id(99);expect(()=>planDailyBossJade(bad)).toThrow('INELIGIBLE');
    bad.defeated=false;expect(()=>planDailyBossJade(bad)).toThrow('WITHOUT_DEFEAT');
  });
});
