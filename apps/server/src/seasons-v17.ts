import {bossCloseRequiredV18,seasonBossRankingV18} from './boss-archive-v18.js';
import {createHash,randomUUID} from 'node:crypto';
import type {PoolClient} from 'pg';
import {EconomyRunV6Schema} from '@akai/shared';
import {SeasonV17CommandSchema,type SeasonV17View,type SeasonV17Archive} from '@akai/shared/seasons-v17';
import type {Database} from './database.js';
import {OnlineError} from './online.js';
import {calendar} from './community-domain.js';
import {canonicalJson} from './economy-migration.js';
/** Caller holds guild lock 41652016. Freeze competitive membership/results until close. */
export async function seasonOpenV17(c:PoolClient,now:number){const w=(await c.query('SELECT period,clock_ms FROM akai_season_v17_world')).rows[0],clocks=(await c.query('SELECT clock_ms FROM akai_guild_v16_world UNION ALL SELECT clock_ms FROM akai_arena_v15_world')).rows;return !w.period||Math.max(now,Number(w.clock_ms),...clocks.map(r=>Number(r.clock_ms)))<w.period.end;}
export class SeasonsV17Service {
 constructor(readonly db:Database,readonly clock=()=>Date.now(),readonly authorize?:(c:PoolClient,account:string)=>Promise<void>){}
 async read(c:PoolClient,account:string):Promise<SeasonV17View>{
  const w=(await c.query('SELECT * FROM akai_season_v17_world')).rows[0],clocks=(await c.query('SELECT clock_ms FROM akai_guild_v16_world UNION ALL SELECT clock_ms FROM akai_arena_v15_world')).rows,now=Math.max(this.clock(),Number(w.clock_ms),...clocks.map(r=>Number(r.clock_ms)));
  return {version:'seasons-v17-1',revision:Number(w.revision),current:calendar(now).season,tracked:w.period,closeRequired:!!w.period&&now>=w.period.end,archives:(await c.query('SELECT payload FROM akai_season_v17_archives ORDER BY season_id DESC LIMIT 8')).rows.map(r=>r.payload),rewards:(await c.query('SELECT season_id,source,coin::text FROM akai_season_v17_rewards WHERE account_id=$1 ORDER BY season_id DESC,source LIMIT 16',[account])).rows.map(r=>({seasonId:r.season_id,source:r.source,coin:r.coin})),rehearsalOnly:true};
 }
 async command(actorRun:string,input:unknown){const cmd=SeasonV17CommandSchema.parse(input),hash=createHash('sha256').update(canonicalJson(cmd)).digest('hex');return this.db.transaction(async c=>{
  await c.query('SELECT pg_advisory_xact_lock(41652016)');await c.query('SELECT pg_advisory_xact_lock(41652015)');
  const w=(await c.query('SELECT * FROM akai_season_v17_world FOR UPDATE')).rows[0];
  const roster=async(lock=false)=>(await c.query(`SELECT r.*,m.enabled,COALESCE(p.suspended,false) suspended,COALESCE(p.name,'Viajante') name FROM akai_v13_members m JOIN akai_economy_rehearsals r ON r.id=m.run_id AND r.account_id=m.account_id JOIN akai_boss_v8_members b ON b.run_id=r.id AND b.account_id=r.account_id CROSS JOIN akai_v13_world w LEFT JOIN akai_profiles p ON p.account_id=r.account_id WHERE b.realm_id=w.realm_id ORDER BY r.id ${lock?'FOR UPDATE OF r':''}`)).rows;
  let rows=await roster(true);let actor=rows.find(r=>r.id===actorRun);if(!actor)throw new OnlineError('V13_NOT_ENROLLED',403);if(this.authorize)await this.authorize(c,actor.account_id);
  await c.query('SELECT account_id FROM akai_v13_members WHERE run_id=ANY($1::uuid[]) ORDER BY account_id FOR SHARE',[rows.map(r=>r.id)]);rows=await roster();actor=rows.find(r=>r.id===actorRun)!;
  if(!actor.enabled||actor.suspended||actor.closed)throw new OnlineError('SEASON_UNAVAILABLE',403);
  const prior=(await c.query('SELECT * FROM akai_season_v17_commands WHERE account_id=$1 AND command_id=$2',[actor.account_id,cmd.commandId])).rows[0];if(prior){if(prior.payload_hash!==hash)throw new OnlineError('COMMAND_ID_REUSED',409);return prior.result;}
  // Sample only after all writer locks; guild/arena clocks participate in the common watermark.
  const clocks=(await c.query('SELECT clock_ms FROM akai_guild_v16_world UNION ALL SELECT clock_ms FROM akai_arena_v15_world')).rows;
  const now=Math.max(this.clock(),Number(w.clock_ms),...clocks.map(r=>Number(r.clock_ms))),revision=Number(actor.revision)+1;
  let stale=cmd.expectedRevision!==Number(actor.revision)?'STALE_REVISION':cmd.seasonRevision!==Number(w.revision)?'STALE_SEASON_REVISION':null;
  if(!stale&&w.period&&now>=w.period.end&&await bossCloseRequiredV18(c,now,w.period.end))stale='BOSS_CLOSE_REQUIRED';
  const grants=new Map<string,bigint>();let period=w.period,seasonRevision=Number(w.revision),closed:string|null=null;
  if(!stale){
   if(period&&now>=period.end){
    const eligible=rows.filter(r=>r.enabled&&!r.suspended&&!r.closed),ids=eligible.map(r=>r.account_id),names=new Map(eligible.map(r=>[r.account_id,r.name]));
    const participants=new Set((await c.query('SELECT attacker,defender FROM akai_arena_v15_matches WHERE season_id=$1 AND at>=$2 AND at<$3',[period.id,period.trackedFrom,period.end])).rows.flatMap(r=>[r.attacker,r.defender]));
    const arena=(await c.query('SELECT account_id,position,trophies FROM akai_arena_v15_entries WHERE season_id=$1 ORDER BY trophies DESC,account_id',[period.id])).rows.filter(r=>ids.includes(r.account_id)).map(r=>({accountId:r.account_id as string,name:names.get(r.account_id) as string,position:Number(r.position),trophies:Number(r.trophies),participated:participants.has(r.account_id)}));
    const guilds=(await c.query(`SELECT g.id,g.name,SUM(p.amount)::text points FROM akai_guild_v16_credits p JOIN akai_guild_v16_guilds g ON g.id=p.guild_id WHERE g.active AND p.at>=$1 AND p.at<$2 AND EXISTS(SELECT 1 FROM akai_guild_v16_members m WHERE m.guild_id=g.id AND m.account_id=ANY($3::uuid[])) GROUP BY g.id,g.name ORDER BY SUM(p.amount) DESC,g.id`,[period.trackedFrom,period.end,ids])).rows as SeasonV17Archive['guilds'];
    const archive:SeasonV17Archive={...period,closedAt:now,arena,guilds,boss:await seasonBossRankingV18(c,period.trackedFrom,period.end,ids)};await c.query('INSERT INTO akai_season_v17_archives VALUES($1,$2)',[period.id,archive]);closed=period.id;
    const reward=async(account:string,source:'arena'|'guild',coin:bigint)=>{await c.query('INSERT INTO akai_season_v17_rewards VALUES($1,$2,$3,$4)',[period.id,source,account,String(coin)]);grants.set(account,(grants.get(account)??0n)+coin);};
    for(const [i,r]of arena.filter(r=>r.participated).slice(0,3).entries())await reward(r.accountId,'arena',[500000n,300000n,100000n][i]!);
    for(const [i,g]of guilds.slice(0,3).entries())for(const m of (await c.query('SELECT account_id FROM akai_guild_v16_members WHERE guild_id=$1 AND joined_at<=$2 AND account_id=ANY($3::uuid[]) ORDER BY account_id',[g.id,period.end-86400000,ids])).rows)await reward(m.account_id,'guild',[300000n,200000n,100000n][i]!);
    period=null;
   }
   // Jump over dormant weeks; never manufacture entries, scores, rewards or stale bonuses.
   if(!period)period={...calendar(now).season,trackedFrom:now};seasonRevision++;
   await c.query('UPDATE akai_season_v17_world SET revision=$1,clock_ms=$2,period=$3',[seasonRevision,now,period]);
   await c.query('UPDATE akai_guild_v16_world SET clock_ms=GREATEST(clock_ms,$1)',[now]);await c.query('UPDATE akai_arena_v15_world SET clock_ms=GREATEST(clock_ms,$1)',[now]);
  }
  for(const row of rows){const amount=grants.get(row.account_id)??0n;if(row.id!==actorRun&&!amount)continue;const run=EconomyRunV6Schema.parse(row.state),rev=Number(row.revision)+1;if(amount){run.economy.balances.coin=String(BigInt(run.economy.balances.coin)+amount);run.economy.revision++;await c.query("INSERT INTO akai_economy_rehearsal_ledger VALUES($1,$2,'coin',$3,$4)",[row.id,rev,String(amount),run.economy.balances.coin]);}await c.query('UPDATE akai_economy_rehearsals SET state=$2,revision=$3 WHERE id=$1',[row.id,EconomyRunV6Schema.parse(run),rev]);await c.query('INSERT INTO akai_economy_rehearsal_events VALUES($1,$2,$3,$4)',[row.id,rev,randomUUID(),{kind:'seasons-v17',commandId:cmd.commandId,coin:String(amount),closed}]);}
  const result={status:stale?'rejected':'applied',code:stale??'OK',revision,seasonRevision,closed};await c.query('INSERT INTO akai_season_v17_commands VALUES($1,$2,$3,$4)',[actor.account_id,cmd.commandId,hash,result]);await c.query('INSERT INTO akai_season_v17_events VALUES($1,$2,$3,$4)',[randomUUID(),actor.account_id,cmd.commandId,result]);return result;
 });}
}
