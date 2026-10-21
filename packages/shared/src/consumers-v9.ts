import {z} from 'zod';
import {masteryLevel} from './economy-v2.js';
import {heroStatsV3} from './builds-v3.js';
import {CombatStatsV3Schema} from './combat-v3.js';
import {type EconomyRunV6} from './economy-run-v6.js';
import {bossWeekV8,type BossEventsV8} from './boss-events-v8.js';
import {type MarketV2Book} from './market-v2.js';
/** Allow-list projection shared by UI and operator reports. No RNG, secrets or other wallets. */
export function economyConsumersV9(run:EconomyRunV6,events?:BossEventsV8,book?:MarketV2Book,runId=run.economy.accountId){
 const e=run.economy,stats=CombatStatsV3Schema.strip().parse(heroStatsV3(e)),session=events?.sessions[e.accountId];
 const combat=session?.active?session.combat:run.encounter?.combat;
 return {
  version:'consumers-v9-1' as const,accountId:e.accountId,level:masteryLevel(e.masteryMs),
  balances:{...e.balances},protection:e.protection,attributes:{...e.attributes},stats,
  activity:session?.active?session.mode:e.activity,floor:e.floor,highest:{...e.highest},
  inventory:structuredClone(e.inventory),vault:structuredClone(e.vault),equipped:{...e.equipped},
  offline:{...e.offline,pending:!!run.offlineJob},paused:run.paused,
  combat:combat?{status:combat.status,sequence:combat.sequence,clockMs:combat.clockMs,actors:combat.actors.map(a=>({id:a.id,hp:a.hp,maxHp:a.stats.maxHp})),hits:combat.hits.map(h=>({...h}))}:null,
  log:run.log.map(l=>({...l})),
  event:events?{date:events.daily.date,hp:events.daily.hp,maxHp:events.daily.maxHp,active:!!session?.active,mode:session?.mode??null,qualifiedMs:events.daily.members[e.accountId]?.qualifiedMs??0,weeklyMs:events.weekly[e.accountId]?.week===bossWeekV8(events.clockMs)?events.weekly[e.accountId]!.qualifiedMs:0,
   ranking:Object.values(events.daily.members).filter(m=>!m.suspended&&BigInt(m.damage)>0n).sort((a,b)=>BigInt(a.damage)===BigInt(b.damage)?a.accountId.localeCompare(b.accountId):BigInt(a.damage)>BigInt(b.damage)?-1:1).slice(0,10).map((m,i)=>({rank:i+1,accountId:m.accountId,name:m.name,damage:m.damage})),broadcasts:events.broadcasts.map(b=>({...b}))}:null,
  market:book?{revision:book.revision,listings:book.listings.filter(l=>l.status==='active'||l.seller===runId&&!l.claimed).map(l=>structuredClone(l)),offers:book.offers.filter(o=>o.buyer===runId||book.listings.find(l=>l.id===o.listingId)?.seller===runId).map(o=>({...o})),trades:book.trades.filter(t=>t.buyer===runId||t.seller===runId).map(t=>structuredClone(t))}:null,
 };
}
export const ConsumerIdentityV9Schema=z.object({accountId:z.uuid(),name:z.string().min(1).max(24),suspended:z.boolean()}).strict();
