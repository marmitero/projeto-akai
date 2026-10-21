import {z} from 'zod';
import {EconomyRunV6Schema,advanceRunV6,type EconomyRunV6,type EconomyEntropyV6} from './economy-run-v6.js';
import {CombatStatsV3Schema} from './combat-v3.js';
import {heroStatsV3} from './builds-v3.js';

export const OFFLINE_LIMIT_V7=8*60*60*1000;
const stamp=z.number().int().nonnegative().safe();
const dayFormatter=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'});
export function offlineDayV7(at:number){stamp.parse(at);return dayFormatter.format(at);}
function nextDay(at:number){
 // Find the next civil midnight using IANA rules, including historical DST changes.
 const day=offlineDayV7(at);let lo=at,hi=at+27*3600000;
 while(lo+1<hi){const mid=Math.floor((lo+hi)/2);if(offlineDayV7(mid)===day)lo=mid;else hi=mid;}return hi;
}
function resetDay(s:EconomyRunV6,at:number){const day=offlineDayV7(at);if(s.economy.offline.day!==day)s.economy.offline={day,usedMs:0};}
function finish(s:EconomyRunV6){
 const job=s.offlineJob!;s.economy.activity=job.activity;s.economy.floor=job.floor;s.autoAdvance=job.autoAdvance;
 s.economy.economicThroughMs=job.returnMs;s.encounter=null;s.nextAt=job.returnMs+3000;s.offlineJob=null;
 resetDay(s,job.returnMs);s.economy.revision++;return s;
}
/** Start one immutable absence. Only the selected activity's cleared non-boss floor can farm.
 * Partial active fights are abandoned, no offline first-clear or social/event participation.
 * Caller must lock authoritative state; this pure function never trusts client elapsed time. */
export function beginOfflineV7(input:EconomyRunV6,returnMs:number){
 const s=EconomyRunV6Schema.parse(input);stamp.parse(returnMs);
 if(returnMs<s.economy.economicThroughMs)throw Error('ECONOMY_CLOCK_REWIND');
 if(s.offlineJob)return s;
 const start=s.economy.economicThroughMs,activity=s.economy.activity;
 let floor=Math.min(s.economy.floor,s.economy.highest[activity]);
 if(activity==='main'&&floor%10===0)floor--;
 s.offlineJob={untilMs:Math.min(returnMs,start+OFFLINE_LIMIT_V7),returnMs,activity,floor:s.economy.floor,autoAdvance:s.autoAdvance,stats:CombatStatsV3Schema.strip().parse(heroStatsV3(s.economy))};
 s.encounter=null;s.nextAt=start+3000;s.autoAdvance=false;
 if(s.paused||floor<1||(activity!=='main'&&s.economy.highest.main<(activity==='gold'?20:5)))return finish(s);
 s.economy.floor=floor;return s;
}
/** At most maxEvents attack events per call. Save state+quota+ledger atomically, resume with
 * the same job after restart. No stochastic cycle multiplication or reroll at collection. */
export function drainOfflineV7(input:EconomyRunV6,maxEvents=1000,entropy?:EconomyEntropyV6){
 let s=EconomyRunV6Schema.parse(input);z.number().int().min(1).max(100000).parse(maxEvents);let processed=0,settledMs=0;
 while(s.offlineJob){
  const job=s.offlineJob,cursor=s.economy.economicThroughMs;
  if(cursor>=job.untilMs||s.paused){s=finish(s);break;}
  resetDay(s,cursor);
  const boundary=Math.min(job.untilMs,nextDay(cursor)),available=OFFLINE_LIMIT_V7-s.economy.offline.usedMs;
  if(available===0){
   // No replay of a partial fight after unqualified time; retain the frozen build.
   s.economy.economicThroughMs=boundary;s.encounter=null;s.nextAt=boundary+3000;continue;
  }
  if(processed>=maxEvents)return {state:s,backlog:true,processed,settledMs};
  const end=Math.min(boundary,cursor+available),r=advanceRunV6(s,end,maxEvents-processed,entropy,job.stats);
  s=r.state;processed+=r.processed;
  const through=s.paused?Math.min(s.economy.economicThroughMs,s.nextAt-3000):s.economy.economicThroughMs;
  s.economy.offline.usedMs+=through-cursor;settledMs+=through-cursor;
  if(s.paused){s=finish(s);break;}
  if(r.backlog)return {state:s,backlog:true,processed,settledMs};
 }
 return {state:EconomyRunV6Schema.parse(s),backlog:false,processed,settledMs};
}
/** Server clock only. Resume pending work before accepting build/activity mutations. */
export function settleElapsedV7(input:EconomyRunV6,now:number,maxEvents=1000,entropy?:EconomyEntropyV6){
 stamp.parse(now);if(now<input.economy.economicThroughMs||input.offlineJob&&now<input.offlineJob.returnMs)throw Error('ECONOMY_CLOCK_REWIND');
 if(input.offlineJob)return drainOfflineV7(input,maxEvents,entropy);
 if(now-input.economy.economicThroughMs>30000)return drainOfflineV7(beginOfflineV7(input,now),maxEvents,entropy);
 return advanceRunV6(input,now,maxEvents,entropy);
}
