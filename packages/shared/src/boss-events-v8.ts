import {z} from 'zod';
import {CombatV3Schema,CombatStatsV3Schema,startCombatV3,advanceCombatV3,type CombatStatsV3} from './combat-v3.js';
import {planDailyBossJade} from './daily-boss-jade.js';
import {planWeeklyProtectionV5} from './protection-v5.js';
const time=z.number().int().nonnegative().safe(),amount=z.string().regex(/^(0|[1-9]\d{0,37})$/),uuid=z.uuid();
const formatter=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'});
export function bossDateV8(at:number){time.parse(at);const p=formatter.formatToParts(at),v=(t:string)=>p.find(x=>x.type===t)!.value;return `${v('year')}-${v('month')}-${v('day')}`;}
export function bossWeekV8(at:number){const d=new Date(bossDateV8(at)+'T12:00:00Z');d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);return d.toISOString().slice(0,10);}
function nextDay(at:number){const date=bossDateV8(at);let lo=at,hi=at+27*3600000;while(lo+1<hi){const m=Math.floor((lo+hi)/2);if(bossDateV8(m)===date)lo=m;else hi=m;}return hi;}
export const DAILY_HP_V8=100000000;
const Grant=z.object({key:z.string(),accountId:uuid,kind:z.enum(['participation','ranking','last-hit','weekly']),amount:z.number().int().positive(),at:time}).strict();
const Contribution=z.object({accountId:uuid,name:z.string().min(1).max(24),highestFloor:time.max(1000),suspended:z.boolean(),damage:amount,contributionDamage:amount,qualifiedMs:time}).strict();
const Session=z.object({mode:z.enum(['boss','protection']),active:z.boolean(),until:time,nextAt:time,stats:CombatStatsV3Schema,combat:CombatV3Schema.nullable(),seed:z.number().int().min(1).max(4294967295),attempt:time,positiveHit:z.boolean(),floor:time.min(1).max(1000)}).strict();
export const BossEventsV8Schema=z.object({version:z.literal('boss-events-v8-1'),clockMs:time,
 daily:z.object({date:z.string(),endMs:time,maxHp:time.min(1),hp:time,lastHit:uuid.nullable(),defeatedAt:time.nullable(),members:z.record(uuid,Contribution)}).strict(),
 sessions:z.record(uuid,Session),weekly:z.record(uuid,z.object({week:z.string(),qualifiedMs:time,delivered:z.number().int().min(0).max(6)}).strict()),
 grants:z.array(Grant).max(10000),broadcasts:z.array(z.object({id:z.string(),accountId:uuid,name:z.string(),jade:z.literal(250),text:z.string(),at:time}).strict()).max(30),
}).strict();
export type BossEventsV8=z.infer<typeof BossEventsV8Schema>;
export function initialBossEventsV8(at:number){return BossEventsV8Schema.parse({version:'boss-events-v8-1',clockMs:at,daily:{date:bossDateV8(at),endMs:nextDay(at),maxHp:DAILY_HP_V8,hp:DAILY_HP_V8,lastHit:null,defeatedAt:null,members:{}},sessions:{},weekly:{},grants:[],broadcasts:[]});}
function emit(s:BossEventsV8,g:z.infer<typeof Grant>){if(!s.grants.some(x=>x.key===g.key&&x.accountId===g.accountId)){s.grants.push(g);return true;}return false;}
function participation(s:BossEventsV8,at:number){for(const m of Object.values(s.daily.members))if(!m.suspended&&m.highestFloor>=100&&m.qualifiedMs>=600000&&BigInt(m.contributionDamage)>0n)emit(s,{key:`boss:${s.daily.date}:v2:participation`,accountId:m.accountId,kind:'participation',amount:3,at});}
function defeated(s:BossEventsV8,at:number){
 const p=planDailyBossJade({edition:`boss:${s.daily.date}`,defeated:true,lastHit:s.daily.lastHit,members:Object.values(s.daily.members).map(m=>({accountId:m.accountId,name:m.name,damage:m.damage,qualifiedSeconds:Math.floor(m.qualifiedMs/1000),highestFloor:m.highestFloor,suspended:m.suspended}))});
 for(const g of p.grants)if(g.kind!=='participation')emit(s,{key:g.source,accountId:g.accountId,kind:g.kind,amount:g.jade,at});
 if(p.broadcast){s.broadcasts.push({...p.broadcast,at});if(s.broadcasts.length>30)s.broadcasts.shift();}
}
function combat(s:BossEventsV8,account:string,at:number){const p=s.sessions[account]!;p.positiveHit=false;p.attempt++;let x=(p.seed^p.attempt)>>>0;if(!x)x=1;
 p.combat=startCombatV3(p.stats,[{id:'event-target',stats:{attack:p.mode==='boss'?500:1,maxHp:1000000000000,physicalDefense:p.mode==='boss'?1000:0,magicDefense:p.mode==='boss'?1000:0,intervalMs:p.mode==='boss'?2500:5000,dexterity:500,evasion:100,criticalPpm:0,physicalShareBp:p.mode==='boss'?5000:10000}}],{seed:x,floor:p.floor,at});
}
/** Server-owned joins only; seed and stats must never come from public command fields. */
export function joinBossEventV8(input:BossEventsV8,member:{accountId:string;name:string;highestFloor:number;suspended:boolean},mode:'boss'|'protection',stats:CombatStatsV3,privateSeed:number){
 const s=BossEventsV8Schema.parse(input),m=Contribution.pick({accountId:true,name:true,highestFloor:true,suspended:true}).parse(member);z.enum(['boss','protection']).parse(mode);
 if(m.suspended)throw Error('ACCOUNT_SUSPENDED');if(m.highestFloor<(mode==='boss'?100:1))throw Error('EVENT_LOCKED');
 const old=s.sessions[m.accountId];if(old?.active)throw Error('EVENT_ALREADY_ACTIVE');
 s.daily.members[m.accountId]={...m,damage:s.daily.members[m.accountId]?.damage??'0',contributionDamage:s.daily.members[m.accountId]?.contributionDamage??'0',qualifiedMs:s.daily.members[m.accountId]?.qualifiedMs??0};
 s.sessions[m.accountId]={mode,active:true,until:s.clockMs+15000,nextAt:Math.max(s.clockMs+3000,old?.nextAt??0),stats:CombatStatsV3Schema.strip().parse(stats),combat:null,seed:z.number().int().min(1).max(4294967295).parse(privateSeed),attempt:0,positiveHit:false,floor:Math.max(1,Math.min(1000,m.highestFloor))};return s;
}
export function heartbeatBossEventV8(input:BossEventsV8,account:string){const s=BossEventsV8Schema.parse(input),p=s.sessions[account];if(!p?.active||p.until<=s.clockMs)throw Error('EVENT_PRESENCE_EXPIRED');p.until=s.clockMs+15000;return s;}
export function leaveBossEventV8(input:BossEventsV8,account:string){const s=BossEventsV8Schema.parse(input),p=s.sessions[account];if(p){p.active=false;p.combat=null;p.nextAt=s.clockMs+3000;}return s;}
/** Fixed absolute-second windows, ordered actual hit timestamps then UUID; bounded per read.
 * No grants/HP from the client. Lease expiry never backfills absence or a missed heartbeat. */
export function advanceBossEventsV8(input:BossEventsV8,to:number,maxWindows=30){
 const s=BossEventsV8Schema.parse(input);time.parse(to);z.number().int().min(1).max(1000).parse(maxWindows);if(to<s.clockMs)throw Error('EVENT_CLOCK_REWIND');let windows=0;
 while(s.clockMs<to){
  if(s.clockMs>=s.daily.endMs){const d=initialBossEventsV8(s.clockMs).daily;s.daily=d;for(const p of Object.values(s.sessions)){p.active=false;p.combat=null;}}
  for(const [id,p] of Object.entries(s.sessions))if(p.until<=s.clockMs||s.daily.members[id]?.suspended){p.active=false;p.combat=null;}
  if(!Object.values(s.sessions).some(p=>p.active)){
   if(to>=s.daily.endMs){s.daily=initialBossEventsV8(to).daily;}s.clockMs=to;break;
  }
  if(windows>=maxWindows)return {state:s,backlog:true,windows};
  const start=s.clockMs,end=Math.min(to,s.daily.endMs,(Math.floor(start/1000)+1)*1000,...Object.values(s.sessions).filter(p=>p.active).map(p=>p.until));
  const hits:{at:number;account:string;damage:number;sequence:number}[]=[];
  for(const account of Object.keys(s.sessions).sort()){
   const p=s.sessions[account]!,member=s.daily.members[account];if(!p.active||!member)continue;
   if(!p.combat&&p.nextAt<end)combat(s,account,Math.max(start,p.nextAt));
   if(!p.combat)continue;
   const before=p.combat.clockMs,hadPositive=p.positiveHit,sequence=p.combat.sequence,r=advanceCombatV3(p.combat,end,32);if(r.backlog)throw Error('EVENT_WINDOW_EVENT_LIMIT');p.combat=r.state;
   const heroHits=r.state.hits.filter(h=>h.sequence>sequence&&h.attacker==='hero'&&h.damage>0);if(heroHits.length)p.positiveHit=true;
   const qualified=p.positiveHit?Math.max(0,r.state.clockMs-(hadPositive?before:Math.max(before,heroHits[0]?.at??r.state.clockMs))):0;
   if(p.mode==='boss'){
    member.qualifiedMs+=qualified;for(const h of heroHits){member.contributionDamage=String(BigInt(member.contributionDamage)+BigInt(h.damage));hits.push({at:h.at,account,damage:h.damage,sequence:h.sequence});}
   }else{
    const week=bossWeekV8(start);if(s.weekly[account]?.week!==week)s.weekly[account]={week,qualifiedMs:0,delivered:0};const w=s.weekly[account]!;w.qualifiedMs+=qualified;
    const plans=planWeeklyProtectionV5({accountId:account,week,qualifiedMs:w.qualifiedMs,deliveredMilestones:w.delivered});for(const g of plans)if(emit(s,{key:g.key,accountId:account,kind:'weekly',amount:g.amount,at:r.state.clockMs}))w.delivered=g.milestone;
   }
   if(r.state.status==='defeat'){p.combat=null;p.nextAt=r.state.clockMs+3000;}
  }
  for(const h of hits.sort((a,b)=>a.at-b.at||(a.account<b.account?-1:a.account>b.account?1:0)||a.sequence-b.sequence))if(s.daily.hp>0){const damage=Math.min(h.damage,s.daily.hp);s.daily.hp-=damage;const m=s.daily.members[h.account]!;m.damage=String(BigInt(m.damage)+BigInt(damage));if(s.daily.hp===0){s.daily.lastHit=h.account;s.daily.defeatedAt=h.at;defeated(s,h.at);}}
  participation(s,end);s.clockMs=end;windows++;
 }
 return {state:BossEventsV8Schema.parse(s),backlog:false,windows};
}
