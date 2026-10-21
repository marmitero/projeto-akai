import {z} from 'zod';
import {MarketV2WorldSchema,initialMarketV2,applyMarketV2,type MarketV2Action} from './market-v2.js';
import {BossEventsV8Schema,initialBossEventsV8,advanceBossEventsV8,joinBossEventV8,heartbeatBossEventV8,leaveBossEventV8} from './boss-events-v8.js';
import {applyEconomyActionV6,advanceRunV6,type EconomyActionV6,type EconomyRunV6} from './economy-run-v6.js';
import {settleElapsedV7} from './offline-v7.js';
import {heroStatsV3} from './builds-v3.js';
import {ConsumerIdentityV9Schema} from './consumers-v9.js';
const time=z.number().int().nonnegative().safe();
export const IntegratedV9Schema=z.object({version:z.literal('integrated-v9-1'),market:MarketV2WorldSchema,events:BossEventsV8Schema,profiles:z.record(z.uuid(),ConsumerIdentityV9Schema),delivered:z.array(z.string()).max(10000),pending:z.object({to:time,mode:z.enum(['online','offline'])}).strict().nullable()}).strict().superRefine((w,c)=>{
 for(const [id,r] of Object.entries(w.market.runs))if(w.profiles[id]?.accountId!==r.economy.accountId)c.addIssue({code:'custom',message:'Consumer identity mismatch'});
 if(new Set(w.delivered).size!==w.delivered.length)c.addIssue({code:'custom',message:'Duplicate grant receipt'});
});
export type IntegratedV9=z.infer<typeof IntegratedV9Schema>;
/** Private deterministic rehearsal only. Server adapters retain SQL locks, HMAC entropy and receipts. */
export function initialIntegratedV9(runs:Record<string,EconomyRunV6>,profiles:IntegratedV9['profiles'],at:number):IntegratedV9{
 for(const r of Object.values(runs))if(r.economy.economicThroughMs!==at||r.offlineJob)throw Error('COHORT_CLOCK_MISMATCH');
 return IntegratedV9Schema.parse({version:'integrated-v9-1',market:initialMarketV2(runs,at),events:initialBossEventsV8(at),profiles,delivered:[],pending:null});
}
function ready(w:IntegratedV9){if(w.pending||Object.values(w.market.runs).some(r=>r.offlineJob))throw Error('SETTLEMENT_BACKLOG');}
function member(w:IntegratedV9,id:string){const r=w.market.runs[id];if(!r)throw Error('MEMBER_NOT_FOUND');if(w.profiles[id]!.suspended)throw Error('ACCOUNT_SUSPENDED');return r;}
function free(w:IntegratedV9,id:string){const r=member(w,id);if(w.events.sessions[r.economy.accountId]?.active)throw Error('EVENT_ACTIVITY_ACTIVE');return r;}
export function integratedEconomyV9(input:IntegratedV9,id:string,action:EconomyActionV6){const w=IntegratedV9Schema.parse(input);ready(w);w.market.runs[id]=applyEconomyActionV6(free(w,id),action);return IntegratedV9Schema.parse(w);}
export function integratedMarketV9(input:IntegratedV9,id:string,action:MarketV2Action,newId:()=>string){
 const w=IntegratedV9Schema.parse(input);ready(w);free(w,id);
 const offer='offerId' in action?w.market.book.offers.find(o=>o.id===action.offerId):undefined;
 const listing=w.market.book.listings.find(l=>l.id===('listingId' in action?action.listingId:offer?.listingId));
 if(listing)free(w,listing.seller);if(action.type==='offer.accept'&&offer)free(w,offer.buyer);
 w.market=applyMarketV2(w.market,id,action,w.events.clockMs,newId).world;return IntegratedV9Schema.parse(w);
}
export function integratedEventV9(input:IntegratedV9,id:string,action:'boss'|'protection'|'heartbeat'|'leave',seed:number){
 const w=IntegratedV9Schema.parse(input);ready(w);const r=member(w,id),account=r.economy.accountId;
 if(action==='heartbeat')w.events=heartbeatBossEventV8(w.events,account);
 else if(action==='leave')w.events=leaveBossEventV8(w.events,account);
 else {free(w,id);w.events=joinBossEventV8(w.events,{...w.profiles[id]!,highestFloor:r.economy.highest.main},action,heroStatsV3(r.economy),seed);}
 r.encounter=null;r.nextAt=w.events.clockMs+3000;return IntegratedV9Schema.parse(w);
}
/** One bounded slice, JSON-resumable. Event presence reserves time even after lease expiry. */
export function advanceIntegratedV9(input:IntegratedV9,to:number,mode:'online'|'offline'='online',budget=1000){
 const w=IntegratedV9Schema.parse(input);time.parse(to);z.enum(['online','offline']).parse(mode);z.number().int().min(1).max(100000).parse(budget);
 if(w.pending&&(w.pending.to!==to||w.pending.mode!==mode))throw Error('SETTLEMENT_TARGET_CHANGED');
 if(to<w.events.clockMs)throw Error('COHORT_CLOCK_REWIND');
 const reserved=new Set(Object.entries(w.events.sessions).filter(([,s])=>s.active).map(([id])=>id));
 const advanced=advanceBossEventsV8(w.events,to,30);w.events=advanced.state;const through=w.events.clockMs;let backlog=advanced.backlog;
 for(const [id,run] of Object.entries(w.market.runs)){
  if(reserved.has(run.economy.accountId)||w.events.sessions[run.economy.accountId]?.active){
   if(run.offlineJob)throw Error('EVENT_OFFLINE_CONFLICT');run.economy.economicThroughMs=Math.max(run.economy.economicThroughMs,through);run.encounter=null;run.nextAt=through+3000;
  }else{
   if(run.economy.economicThroughMs===through&&!run.offlineJob)continue;
   const r=mode==='offline'?settleElapsedV7(run,through,budget):advanceRunV6(run,through,budget);w.market.runs[id]=r.state;backlog ||= r.backlog;
  }
 }
 for(const g of w.events.grants){const key=g.accountId+'/'+g.key;if(w.delivered.includes(key))continue;const run=Object.values(w.market.runs).find(r=>r.economy.accountId===g.accountId);if(!run)throw Error('REWARD_MEMBER_MISSING');if(g.kind==='weekly')run.economy.protection+=g.amount;else run.economy.balances.jade=String(BigInt(run.economy.balances.jade)+BigInt(g.amount)*1000n);w.delivered.push(key);}
 w.pending=backlog?{to,mode}:null;return {state:IntegratedV9Schema.parse(w),backlog};
}
