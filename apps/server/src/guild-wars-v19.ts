import {createHash,randomInt,randomUUID} from 'node:crypto';
import type {PoolClient} from 'pg';
import {EconomyRunV6Schema,CombatStatsV3Schema,heroStatsV3} from '@akai/shared';
import {duelV15} from '@akai/shared/arena-v15';
import {WAR_V19_RULES,WarV19CommandSchema,pairWarV19,scoreWarV19,type WarPeriodV19,type WarMatchV19,type WarPublicMatchV19,type WarV19View,type WarFighterV19} from '@akai/shared/guild-wars-v19';
import type {Database} from './database.js';
import {OnlineError} from './online.js';
import {canonicalJson} from './economy-migration.js';
import {calendar} from './community-domain.js';
import {bossCloseRequiredV18} from './boss-archive-v18.js';
import {seasonOpenV17} from './seasons-v17.js';
class WarRule extends Error{}
const rule=(ok:unknown,code:string)=>{if(!ok)throw new WarRule(code);};
/** All writers hold the guild advisory first. Read-only guards never acquire another writer lock. */
export async function warCloseRequiredV19(c:PoolClient,now:number,through=Number.MAX_SAFE_INTEGER){const w=(await c.query('SELECT period,clock_ms FROM akai_war_v19_world')).rows[0];return !!w.period&&Math.max(now,Number(w.clock_ms))>=w.period.close&&w.period.close<=through;}
export async function warGuildOpenV19(c:PoolClient,now:number){const w=(await c.query('SELECT period,clock_ms FROM akai_war_v19_world')).rows[0];return !w.period||Math.max(now,Number(w.clock_ms))<w.period.open;}
function publicMatch(m:WarMatchV19):WarPublicMatchV19{return {id:m.id,teams:m.teams.map(t=>({id:t.id,name:t.name,members:t.roster.map(r=>({accountId:r.accountId,name:r.name}))})),...scoreWarV19(m),attacks:m.attacks.map(a=>({accountId:a.accountId,targetId:a.targetId,won:a.result.won,hpA:a.result.hpA,hpB:a.result.hpB,maxHp:a.maxHp}))};}
export class GuildWarsV19Service{
 constructor(readonly db:Database,readonly clock=()=>Date.now(),readonly authorize?:(c:PoolClient,account:string)=>Promise<void>){}
 private async roster(c:PoolClient,lock=false){return(await c.query(`SELECT r.*,v.enabled,COALESCE(p.suspended,false) suspended,COALESCE(p.name,'Viajante') name,m.guild_id,m.joined_at,m.role,g.active guild_active,g.level guild_level,g.name guild_name FROM akai_v13_members v JOIN akai_economy_rehearsals r ON r.id=v.run_id AND r.account_id=v.account_id JOIN akai_boss_v8_members b ON b.run_id=r.id AND b.account_id=r.account_id CROSS JOIN akai_v13_world w LEFT JOIN akai_profiles p ON p.account_id=r.account_id LEFT JOIN akai_guild_v16_members m ON m.account_id=r.account_id LEFT JOIN akai_guild_v16_guilds g ON g.id=m.guild_id WHERE b.realm_id=w.realm_id ORDER BY r.id ${lock?'FOR UPDATE OF r':''}`)).rows;}
 private available(r:any){return !!r&&r.enabled&&!r.closed&&!r.suspended;}
 private same(r:any,t:{id:string},f:WarFighterV19){return this.available(r)&&r.guild_active&&r.guild_id===t.id&&Number(r.joined_at)===f.joinedAt;}
 private async now(c:PoolClient,w:any){const clocks=(await c.query('SELECT clock_ms FROM akai_guild_v16_world UNION ALL SELECT clock_ms FROM akai_arena_v15_world UNION ALL SELECT clock_ms FROM akai_season_v17_world')).rows;return Math.max(this.clock(),Number(w.clock_ms),...clocks.map(r=>Number(r.clock_ms)));}
 async read(c:PoolClient,account:string):Promise<WarV19View>{
  const w=(await c.query('SELECT * FROM akai_war_v19_world')).rows[0],now=await this.now(c,w),cal=calendar(now),p=w.period as WarPeriodV19|null,rows=await this.roster(c),actor=rows.find(r=>r.account_id===account);rule(actor,'V13_NOT_ENROLLED');const archived=!!(await c.query('SELECT 1 FROM akai_war_v19_archives WHERE season_id=$1',[cal.season.id])).rowCount;
  const phase=p?(now>=p.close?'close_required':now>=p.open?(p.opened?'active':'opening_required'):'registration'):archived?'finished':now>=cal.warEnd?'finished':now>=cal.warStart?'active':'registration';
  const match=p?.matches.find(m=>m.teams.some(t=>t.roster.some(f=>f.accountId===account))),side=match?.teams.findIndex(t=>t.roster.some(f=>f.accountId===account));let target:WarFighterV19|undefined,canAttack=false;
  if(match&&side!==undefined&&side>=0){const team=match.teams[side]!,idx=team.roster.findIndex(f=>f.accountId===account),other=match.teams[1-side]!;target=other.roster[idx%other.roster.length];canAttack=phase==='active'&&!match.attacks.some(a=>a.accountId===account)&&this.same(actor,team,team.roster[idx]!)&&this.same(rows.find(r=>r.account_id===target!.accountId),other,target!);}
  return{version:WAR_V19_RULES.version,revision:Number(w.revision),serverNow:now,seasonId:p?.id??cal.season.id,open:p?.open??cal.warStart,close:p?.close??cal.warEnd,phase,canEnroll:phase==='registration'&&this.available(actor)&&actor!.guild_active&&actor!.role==='leader',enrolled:!!p?.enrollments.some(t=>t.id===actor!.guild_id),canAttack,target:target?{accountId:target.accountId,name:target.name}:null,matches:p?.matches.map(publicMatch)??[],archives:(await c.query('SELECT payload FROM akai_war_v19_archives ORDER BY season_id DESC LIMIT 8')).rows.map(r=>r.payload),rewards:(await c.query('SELECT season_id,coin::text FROM akai_war_v19_rewards WHERE account_id=$1 ORDER BY season_id DESC LIMIT 8',[account])).rows.map(r=>({seasonId:r.season_id,coin:r.coin})),rehearsalOnly:true};
 }
 async command(actorRun:string,input:unknown){const cmd=WarV19CommandSchema.parse(input),hash=createHash('sha256').update(canonicalJson(cmd)).digest('hex');return this.db.transaction(async c=>{
  await c.query('SELECT pg_advisory_xact_lock(41652016)');const w=(await c.query('SELECT * FROM akai_war_v19_world FOR UPDATE')).rows[0];let rows=await this.roster(c,true),actor=rows.find(r=>r.id===actorRun);if(!actor)throw new OnlineError('V13_NOT_ENROLLED',403);if(this.authorize)await this.authorize(c,actor.account_id);
  await c.query('SELECT account_id FROM akai_v13_members WHERE run_id=ANY($1::uuid[]) ORDER BY account_id FOR SHARE',[rows.map(r=>r.id)]);rows=await this.roster(c);actor=rows.find(r=>r.id===actorRun)!;if(!this.available(actor))throw new OnlineError('WAR_UNAVAILABLE',403);
  const prior=(await c.query('SELECT payload_hash,result FROM akai_war_v19_commands WHERE account_id=$1 AND command_id=$2',[actor.account_id,cmd.commandId])).rows[0];if(prior){if(prior.payload_hash!==hash)throw new OnlineError('COMMAND_ID_REUSED',409);return prior.result;}
  const now=await this.now(c,w),cal=calendar(now),revision=Number(actor.revision)+1;let p=structuredClone(w.period) as WarPeriodV19|null,warRevision=Number(w.revision),code='OK',status='applied',closed:string|null=null;const grants=new Map<string,bigint>();
  await c.query('SAVEPOINT war_action');try{
   rule(cmd.expectedRevision===Number(actor.revision),'STALE_REVISION');rule(cmd.warRevision===warRevision,'STALE_WAR_REVISION');rule(cmd.seasonId===(p?.id??cal.season.id),'WAR_SEASON_CHANGED');
   if(cmd.action.type==='enroll'){
    rule(await seasonOpenV17(c,now),'SEASON_CLOSE_REQUIRED');rule(!await bossCloseRequiredV18(c,now),'BOSS_CLOSE_REQUIRED');rule(!p||p.id===cal.season.id,'WAR_CLOSE_REQUIRED');rule(now<cal.warStart,'WAR_REGISTRATION_CLOSED');rule(!(await c.query('SELECT 1 FROM akai_war_v19_archives WHERE season_id=$1',[cal.season.id])).rowCount,'WAR_ALREADY_CLOSED');rule(actor.guild_active&&actor.role==='leader','WAR_LEADER_REQUIRED');
    const members=rows.filter(r=>this.available(r)&&r.guild_id===actor.guild_id&&Number(r.joined_at)<=now-WAR_V19_RULES.membershipMs).sort((a,b)=>a.account_id.localeCompare(b.account_id));rule(members.length>=2,'WAR_MINIMUM_MEMBERS');
    // Snapshot authoritative v2 stats already acquired; no settlement/farm time is manufactured by a war action.
    const roster=members.map(r=>{const s=EconomyRunV6Schema.parse(r.state);return{accountId:r.account_id as string,name:r.name as string,joinedAt:Number(r.joined_at),floor:Math.max(1,s.economy.highest.main),stats:CombatStatsV3Schema.strip().parse(heroStatsV3(s.economy))};});
    if(!p)p={id:cal.season.id,start:cal.season.start,end:cal.season.end,open:cal.warStart,close:cal.warEnd,opened:false,enrollments:[],matches:[]};p.enrollments=p.enrollments.filter(t=>t.id!==actor.guild_id);p.enrollments.push({id:actor.guild_id,name:actor.guild_name,level:Number(actor.guild_level),roster});
   }else{
    if(p&&now>=p.open&&!p.opened){
     p.enrollments=p.enrollments.map(t=>({...t,roster:t.roster.filter(f=>this.same(rows.find(r=>r.account_id===f.accountId),t,f))})).filter(t=>t.roster.length>=2);
     p.matches=pairWarV19(p.enrollments).map(teams=>({id:randomUUID(),teams,attacks:[]}));p.opened=true;
    }
    if(cmd.action.type==='attack'){
     rule(p?.opened&&now>=p.open&&now<p.close,'WAR_NOT_ACTIVE');const m=p!.matches.find(m=>m.teams.some(t=>t.roster.some(f=>f.accountId===actor.account_id)));rule(m,'WAR_NO_MATCH');const side=m!.teams.findIndex(t=>t.roster.some(f=>f.accountId===actor.account_id)) as 0|1,team=m!.teams[side],i=team.roster.findIndex(f=>f.accountId===actor.account_id),a=team.roster[i]!,other=m!.teams[1-side]!,b=other.roster[i%other.roster.length]!;
     rule(this.same(actor,team,a)&&this.same(rows.find(r=>r.account_id===b.accountId),other,b),'WAR_FIGHTER_UNAVAILABLE');rule(!m!.attacks.some(x=>x.accountId===actor.account_id),'WAR_ATTACK_USED');
     const events=(await c.query('SELECT state FROM akai_boss_v8_realms WHERE id=(SELECT realm_id FROM akai_v13_world)')).rows[0];rule(!events?.state.sessions[actor.account_id]?.active&&!events?.state.sessions[b.accountId]?.active,'EVENT_ACTIVITY_ACTIVE');
     const seed=randomInt(1,4294967296),floor=Math.max(a.floor,b.floor),result=duelV15(a.stats,b.stats,seed,floor),attack={accountId:a.accountId,targetId:b.accountId,side,result,maxHp:b.stats.maxHp};m!.attacks.push(attack);await c.query('INSERT INTO akai_war_v19_attacks VALUES($1,$2,$3)',[p!.id,a.accountId,{...attack,seed,floor,attackerStats:a.stats,defenderStats:b.stats}]);
    }
    if(p&&now>=p.close){
     await c.query('INSERT INTO akai_war_v19_archives VALUES($1,$2)',[p.id,{id:p.id,closedAt:now,matches:p.matches.map(publicMatch)}]);closed=p.id;
     for(const m of p.matches){const {winner}=scoreWarV19(m);for(const attack of m.attacks){const t=m.teams[attack.side],f=t.roster.find(f=>f.accountId===attack.accountId)!;if(!this.same(rows.find(r=>r.account_id===f.accountId),t,f))continue;const coin=BigInt(winner===null?WAR_V19_RULES.drawCoin:winner===attack.side?WAR_V19_RULES.winCoin:WAR_V19_RULES.loseCoin);await c.query('INSERT INTO akai_war_v19_rewards VALUES($1,$2,$3)',[p.id,f.accountId,String(coin)]);grants.set(f.accountId,coin);}
      if(winner!==null){const t=m.teams[winner],eligible=t.roster.filter(f=>this.same(rows.find(r=>r.account_id===f.accountId),t,f));if(eligible.length>=2){const added=await c.query('INSERT INTO akai_guild_v16_credits VALUES($1,$2,$3,100,$4) ON CONFLICT DO NOTHING RETURNING source',['war:'+p.id+':'+m.id,eligible[0]!.accountId,t.id,p.close-1]);if(added.rowCount){await c.query('UPDATE akai_guild_v16_guilds SET xp=xp+100 WHERE id=$1',[t.id]);await c.query('UPDATE akai_guild_v16_world SET revision=revision+1');}}}
     }
     p=null;
    }
   }
   warRevision++;await c.query('UPDATE akai_war_v19_world SET revision=$1,clock_ms=$2,period=$3',[warRevision,now,p]);await c.query('UPDATE akai_guild_v16_world SET clock_ms=GREATEST(clock_ms,$1)',[now]);
  }catch(e){if(!(e instanceof WarRule))throw e;await c.query('ROLLBACK TO SAVEPOINT war_action');status='rejected';code=e.message;grants.clear();closed=null;warRevision=Number(w.revision);}
  await c.query('RELEASE SAVEPOINT war_action');
  for(const r of rows){const coin=grants.get(r.account_id)??0n;if(r.id!==actorRun&&!coin)continue;const run=EconomyRunV6Schema.parse(r.state),rev=Number(r.revision)+1;if(coin){run.economy.balances.coin=String(BigInt(run.economy.balances.coin)+coin);run.economy.revision++;await c.query("INSERT INTO akai_economy_rehearsal_ledger VALUES($1,$2,'coin',$3,$4)",[r.id,rev,String(coin),run.economy.balances.coin]);}await c.query('UPDATE akai_economy_rehearsals SET state=$2,revision=$3 WHERE id=$1',[r.id,run,rev]);await c.query('INSERT INTO akai_economy_rehearsal_events VALUES($1,$2,$3,$4)',[r.id,rev,randomUUID(),{kind:'guild-wars-v19',commandId:cmd.commandId,coin:String(coin),closed}]);}
  const result={status,code,revision,warRevision,closed};await c.query('INSERT INTO akai_war_v19_commands VALUES($1,$2,$3,$4)',[actor.account_id,cmd.commandId,hash,result]);await c.query('INSERT INTO akai_war_v19_events VALUES($1,$2,$3,$4)',[randomUUID(),actor.account_id,cmd.commandId,{...result,action:cmd.action,at:now}]);return result;
 });}
}
