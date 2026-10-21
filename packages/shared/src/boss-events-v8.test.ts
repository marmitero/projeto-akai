import {describe,it,expect} from 'vitest';
import {initialBossEventsV8,advanceBossEventsV8,joinBossEventV8,heartbeatBossEventV8,leaveBossEventV8,bossWeekV8,bossDateV8,type BossEventsV8} from './boss-events-v8.js';
const at=Date.parse('2026-10-21T12:00:00-03:00'),id=(n:number)=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const stats={attack:100,maxHp:1000000000,physicalDefense:100,magicDefense:100,intervalMs:1000,dexterity:1000,evasion:0,criticalPpm:0,physicalShareBp:10000};
const join=(s:BossEventsV8,n=1,mode:'boss'|'protection'='boss')=>joinBossEventV8(s,{accountId:id(n),name:'Teste '+n,highestFloor:100,suspended:false},mode,stats,4213+n);
function step(s:BossEventsV8,to:number,budget=30){for(let i=0;i<10000;i++){const r=advanceBossEventsV8(JSON.parse(JSON.stringify(s)),to,budget);s=r.state;if(!r.backlog)return s;}throw Error('stalled');}
function play(s:BossEventsV8,seconds:number,partition=1000){const end=s.clockMs+seconds*1000;for(let t=s.clockMs+partition;t<=end;t+=partition){s=step(s,t);for(const [account,p] of Object.entries(s.sessions))if(p.active)s=heartbeatBossEventV8(s,account);}return s;}
describe('R8 authoritative event clock',()=>{
 it('does not mint presence for long absence or retroactive heartbeat',()=>{
  const s=join(initialBossEventsV8(at)),late=step(s,at+86400000);expect(late.grants).toEqual([]);expect(late.sessions[id(1)]!.active).toBe(false);expect(()=>heartbeatBossEventV8(late,id(1))).toThrow('PRESENCE_EXPIRED');expect(late.clockMs).toBe(at+86400000);
 });
 it('awards3 for qualified actual combat without requiring a collective kill',()=>{
  const s=play(join(initialBossEventsV8(at)),610);expect(s.daily.hp).toBeGreaterThan(0);expect(s.grants).toHaveLength(1);expect(s.grants[0]).toMatchObject({kind:'participation',amount:3});expect(s.daily.members[id(1)]!.qualifiedMs).toBeGreaterThanOrEqual(600000);expect(step(s,s.clockMs).grants).toEqual(s.grants);
 });
 it('caps overkill and freezes bonus grants once, including250 broadcast and postkill base only',()=>{
  let s=initialBossEventsV8(at);s.daily.hp=1;s=join(s);s=play(s,610);expect(s.daily.hp).toBe(0);expect(s.daily.members[id(1)]!.damage).toBe('1');expect(s.grants.reduce((n,g)=>n+g.amount,0)).toBe(453);expect(s.broadcasts).toHaveLength(1);expect(s.broadcasts[0]).toMatchObject({accountId:id(1),jade:250});const damage=s.daily.members[id(1)]!.damage;
  s=join(s,2);s=play(s,610);expect(s.grants.filter(g=>g.accountId===id(2))).toMatchObject([{kind:'participation',amount:3}]);expect(s.daily.members[id(1)]!.damage).toBe(damage);expect(s.broadcasts).toHaveLength(1);expect(s.grants.filter(g=>g.kind==='ranking')).toHaveLength(1);
 });
 it('pays the full top10 ladder and only one last hit across twelve actual contributors',()=>{
  let s=initialBossEventsV8(at);s.daily.hp=100000;for(let n=1;n<=12;n++)s=join(s,n);s=play(s,610);
  expect(s.daily.hp).toBe(0);expect(s.grants.filter(g=>g.kind==='ranking').map(g=>g.amount)).toEqual([200,180,160,140,120,100,80,60,40,20]);expect(s.grants.filter(g=>g.kind==='last-hit')).toHaveLength(1);expect(s.grants.filter(g=>g.kind==='participation')).toHaveLength(12);expect(s.grants.reduce((n,g)=>n+g.amount,0)).toBe(1386);expect(Object.values(s.daily.members).reduce((n,m)=>n+BigInt(m.damage),0n)).toBe(100000n);
 },30000);
 it('uses the exact active schedule through bounded JSON resumes and polling partitions',()=>{
  const initial=join(join(initialBossEventsV8(at),1),2),a=step(initial,at+12000,1),b=step(initial,at+12000,30);expect(a).toEqual(b);
  let frames=initial;for(let t=at+100;t<=at+12000;t+=100)frames=step(frames,t);expect(frames).toEqual(b);expect(initial.clockMs).toBe(at);
 });
 it('awards six unique5scroll milestones, stops on leave and rejects locked or simultaneous joins',()=>{
  let s=play(join(initialBossEventsV8(at),1,'protection'),1810);expect(s.grants.filter(g=>g.kind==='weekly')).toHaveLength(6);expect(s.grants.reduce((n,g)=>n+g.amount,0)).toBe(30);s=play(s,60);expect(s.grants).toHaveLength(6);s=leaveBossEventV8(s,id(1));const used=s.weekly[id(1)]!.qualifiedMs;s=step(s,s.clockMs+60000);expect(s.weekly[id(1)]!.qualifiedMs).toBe(used);
  expect(()=>joinBossEventV8(s,{accountId:id(2),name:'No',highestFloor:99,suspended:false},'boss',stats,1)).toThrow('EVENT_LOCKED');const active=join(s);expect(()=>join(active,1,'protection')).toThrow('ALREADY_ACTIVE');
 });
 it('handles day/week boundaries without carrying presence or taking earned grants back',()=>{
  const monday=Date.parse('2026-10-26T00:00:00-03:00');expect(bossDateV8(monday-1)).toBe('2026-10-25');expect(bossWeekV8(monday-1)).toBe('2026-10-19');expect(bossWeekV8(monday)).toBe('2026-10-26');
  let s=join(initialBossEventsV8(monday-10000),1,'protection');s=step(s,monday+10000);expect(s.sessions[id(1)]!.active).toBe(false);expect(s.daily.date).toBe('2026-10-26');expect(s.grants).toEqual([]);
 });
});
