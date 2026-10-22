import {creditArenaGuildV16} from './guilds-v16.js';
import {ArenaV15CommandSchema,ARENA_V15_RULES,duelV15,type ArenaV15View} from '@akai/shared/arena-v15';
import {createHash,createHmac,randomInt,randomUUID} from 'node:crypto';
import type {PoolClient} from 'pg';
import {heroStatsV3,CombatStatsV3Schema,EconomyRunV6Schema,settleElapsedV7,type EconomyRunV6} from '@akai/shared';
import {OnlineError} from './online.js';
import type {Database} from './database.js';
import {canonicalJson} from './economy-migration.js';
import {calendar} from './community-domain.js';
class ArenaRule extends Error {}
const rule=(ok:unknown,code:string)=>{if(!ok)throw new ArenaRule(code);};
type Row={id:string;account_id:string;state:unknown;revision:string;closed:boolean;secret:string;enabled:boolean;suspended:boolean;name:string;registered_at:string};
type Receipt={status:'applied'|'rejected'|'settling';code:string;revision:number;arenaRevision:number;matchId?:string};
export class ArenaV15Service {
 constructor(readonly db:Database,readonly clock=()=>Date.now(),readonly authorize?:(c:PoolClient,accountId:string)=>Promise<void>){}
 private async roster(c:PoolClient,lock=false){
  return (await c.query<Row>(`SELECT r.*,m.enabled,COALESCE(p.suspended,false) suspended,COALESCE(p.name,'Viajante') name,COALESCE(p.joined_at,EXTRACT(EPOCH FROM a.created_at)*1000)::text registered_at FROM akai_v13_members m JOIN akai_economy_rehearsals r ON r.id=m.run_id AND r.account_id=m.account_id JOIN akai_accounts a ON a.id=r.account_id JOIN akai_boss_v8_members b ON b.run_id=r.id AND b.account_id=r.account_id CROSS JOIN akai_v13_world w LEFT JOIN akai_profiles p ON p.account_id=r.account_id WHERE b.realm_id=w.realm_id ORDER BY r.id ${lock?'FOR UPDATE OF r':''}`)).rows;
 }
 private eligible(row:Row){return row.enabled&&!row.suspended&&!row.closed&&EconomyRunV6Schema.parse(row.state).economy.highest.main>=ARENA_V15_RULES.minimumFloor;}
 private async entries(c:PoolClient,season:string,rows:Row[]){
  const allowed=new Map(rows.filter(r=>this.eligible(r)).map(r=>[r.account_id,r]));
  return (await c.query('SELECT account_id,position,trophies FROM akai_arena_v15_entries WHERE season_id=$1 ORDER BY position',[season])).rows.filter(r=>allowed.has(r.account_id)).map(r=>({accountId:r.account_id as string,name:allowed.get(r.account_id)!.name,position:Number(r.position),trophies:Number(r.trophies)}));
 }
 async read(c:PoolClient,account:string):Promise<ArenaV15View>{
  const world=(await c.query('SELECT revision,clock_ms FROM akai_arena_v15_world')).rows[0],now=Math.max(this.clock(),Number(world.clock_ms)),season=calendar(now).season,rows=await this.roster(c),actor=rows.find(r=>r.account_id===account);rule(actor,'V13_NOT_ENROLLED');
  const board=await this.entries(c,season.id,rows),own=board.find(e=>e.accountId===account),opponents=own?board.filter(e=>e.position<own.position).reverse().slice(0,5):[];
  const used=Number((await c.query('SELECT count(*) FROM akai_arena_v15_matches WHERE attacker=$1 AND at>=$2',[account,now-ARENA_V15_RULES.windowMs])).rows[0].count),next=Number((await c.query('SELECT next_at FROM akai_arena_v15_players WHERE account_id=$1',[account])).rows[0]?.next_at??0);
  const history=(await c.query('SELECT id,season_id,attacker,defender,at,won,audit FROM akai_arena_v15_matches WHERE attacker=$1 OR defender=$1 ORDER BY at DESC,id DESC LIMIT 50',[account])).rows.map(r=>({id:r.id as string,seasonId:r.season_id as string,attacker:r.attacker as string,defender:r.defender as string,at:Number(r.at),won:r.won as boolean,result:{version:r.audit.result.version,won:r.audit.result.won,hpA:r.audit.result.hpA,hpB:r.audit.result.hpB,elapsedMs:r.audit.result.elapsedMs,attacks:r.audit.result.attacks,reason:r.audit.result.reason} as ReturnType<typeof duelV15>}));
  return {version:ARENA_V15_RULES.version,revision:Number(world.revision),season,serverNow:now,eligible:this.eligible(actor!),enrolled:!!own,own:own??null,board,opponents,nextAt:next,challengesUsed:used,challengesRemaining:Math.max(0,20-used),history,rehearsalOnly:true};
 }
 async command(actorRun:string,input:unknown){
  const cmd=ArenaV15CommandSchema.parse(input),hash=createHash('sha256').update(canonicalJson(cmd)).digest('hex');
  return this.db.transaction(async c=>{
   await c.query('SELECT pg_advisory_xact_lock(41652016)');
   await c.query('SELECT pg_advisory_xact_lock(41652015)');
   const world=(await c.query('SELECT revision,clock_ms FROM akai_arena_v15_world FOR UPDATE')).rows[0],rows=await this.roster(c,true),actor=rows.find(r=>r.id===actorRun);rule(actor,'V13_NOT_ENROLLED');
   if(this.authorize)await this.authorize(c,actor!.account_id);
   await c.query('SELECT account_id FROM akai_v13_members WHERE run_id=ANY($1::uuid[]) ORDER BY account_id FOR SHARE',[rows.map(r=>r.id)]);
   // Refresh admission/suspension after waiting for locks, including idempotent receipt replay.
   const current=await this.roster(c);for(const r of rows){const fresh=current.find(x=>x.id===r.id)!;r.enabled=fresh.enabled;r.suspended=fresh.suspended;}
   if(!actor!.enabled||actor!.suspended||actor!.closed)throw new OnlineError('ARENA_UNAVAILABLE',403);
   const prior=(await c.query('SELECT payload_hash,result FROM akai_arena_v15_commands WHERE account_id=$1 AND command_id=$2',[actor!.account_id,cmd.commandId])).rows[0];
   if(prior){rule(prior.payload_hash===hash,'COMMAND_ID_REUSED');return prior.result as Receipt;}
   const now=Math.max(this.clock(),Number(world.clock_ms)),season=calendar(now).season,before=new Map(rows.map(r=>[r.id,EconomyRunV6Schema.parse(r.state)])),runs=new Map<string,EconomyRunV6>([...before].map(([id,r])=>[id,structuredClone(r)]));
   const changed=new Set<string>([actorRun]);let arenaRevision=Number(world.revision),result:Receipt;
   await c.query('SAVEPOINT arena_action');
   try{
    rule(cmd.expectedRevision===Number(actor!.revision),'STALE_REVISION');rule(cmd.arenaRevision===arenaRevision,'STALE_ARENA_REVISION');rule(cmd.seasonId===season.id,'ARENA_SEASON_CHANGED');rule(this.eligible(actor!),'COMPLETE_FLOOR_FIVE');
    const eventRows=(await c.query('SELECT state FROM akai_boss_v8_realms WHERE id IN (SELECT realm_id FROM akai_boss_v8_members WHERE run_id=ANY($1::uuid[]))',[rows.map(r=>r.id)])).rows;
    const active=new Set<string>(eventRows.flatMap(e=>Object.entries(e.state.sessions).filter(([,s]:[string,any])=>s.active).map(([id])=>id)));
    rule(!active.has(actor!.account_id),'EVENT_ACTIVITY_ACTIVE');
    let defender:Row|undefined;
    if(cmd.action.type==='challenge'){
     const board=await this.entries(c,season.id,rows),own=board.find(e=>e.accountId===actor!.account_id);rule(own,'ARENA_ENROLL_REQUIRED');
     const targets=board.filter(e=>e.position<own!.position).reverse().slice(0,5);rule(targets.some(e=>cmd.action.type==='challenge'&&e.accountId===cmd.action.opponentId),'OPPONENT_NOT_ELIGIBLE');
     defender=rows.find(r=>cmd.action.type==='challenge'&&r.account_id===cmd.action.opponentId);rule(defender&&this.eligible(defender),'OPPONENT_NOT_ELIGIBLE');rule(!active.has(defender!.account_id),'EVENT_ACTIVITY_ACTIVE');
     const next=Number((await c.query('SELECT next_at FROM akai_arena_v15_players WHERE account_id=$1',[actor!.account_id])).rows[0]?.next_at??0);rule(now>=next,'ARENA_COOLDOWN');
     const count=Number((await c.query('SELECT count(*) FROM akai_arena_v15_matches WHERE attacker=$1 AND at>=$2',[actor!.account_id,now-86400000])).rows[0].count);rule(count<20,'DAILY_CHALLENGE_LIMIT');
    }
    let backlog=false;
    for(const row of [actor!,...(defender?[defender]:[])]){
     const entropy=(key:string,bound:number)=>{const limit=Math.floor(4294967296/bound)*bound;for(let i=0;;i++){const n=createHmac('sha256',Buffer.from(row.secret,'hex')).update(key+'/'+i).digest().readUInt32BE(0);if(n<limit)return n%bound;}};
     const settled=settleElapsedV7(runs.get(row.id)!,now,1000,entropy);runs.set(row.id,settled.state);backlog||=settled.backlog;if(canonicalJson(settled.state)!==canonicalJson(before.get(row.id)))changed.add(row.id);
    }
    if(backlog)result={status:'settling',code:'SETTLEMENT_BACKLOG',revision:Number(actor!.revision)+1,arenaRevision};
    else if(cmd.action.type==='enroll'){
     const entries=(await c.query('SELECT account_id,position FROM akai_arena_v15_entries WHERE season_id=$1',[season.id])).rows;let position=Math.max(0,...entries.map(e=>Number(e.position)));
     const eligible=rows.filter(r=>this.eligible({...r,state:runs.get(r.id)})&&!entries.some(e=>e.account_id===r.account_id)).sort((a,b)=>Number(a.registered_at)-Number(b.registered_at)||a.account_id.localeCompare(b.account_id));
     for(const row of eligible)await c.query('INSERT INTO akai_arena_v15_entries(season_id,account_id,position) VALUES($1,$2,$3)',[season.id,row.account_id,++position]);
     if(eligible.length)arenaRevision++;result={status:'applied',code:'OK',revision:Number(actor!.revision)+1,arenaRevision};
    }else{
     const a=runs.get(actorRun)!,b=runs.get(defender!.id)!,statsA=CombatStatsV3Schema.strip().parse(heroStatsV3(a.economy)),statsB=CombatStatsV3Schema.strip().parse(heroStatsV3(b.economy)),seed=randomInt(1,4294967296),floor=Math.max(1,a.economy.highest.main,b.economy.highest.main),outcome=duelV15(statsA,statsB,seed,floor),id=randomUUID();
     const positions=(await c.query('SELECT account_id,position FROM akai_arena_v15_entries WHERE season_id=$1 AND account_id=ANY($2::uuid[])',[season.id,[actor!.account_id,defender!.account_id]])).rows;
     const own=Number(positions.find(p=>p.account_id===actor!.account_id).position),other=Number(positions.find(p=>p.account_id===defender!.account_id).position);
     if(outcome.won)await c.query('UPDATE akai_arena_v15_entries SET position=CASE WHEN account_id=$2 THEN $4::integer ELSE $5::integer END,trophies=trophies+CASE WHEN account_id=$2 THEN 20 ELSE 0 END WHERE season_id=$1 AND account_id IN ($2,$3)',[season.id,actor!.account_id,defender!.account_id,other,own]);
     else await c.query('UPDATE akai_arena_v15_entries SET trophies=GREATEST(0,trophies-10) WHERE season_id=$1 AND account_id=$2',[season.id,actor!.account_id]);
     await c.query('INSERT INTO akai_arena_v15_players VALUES($1,$2) ON CONFLICT(account_id) DO UPDATE SET next_at=$2',[actor!.account_id,now+60000]);
     await c.query('INSERT INTO akai_arena_v15_matches VALUES($1,$2,$3,$4,$5,$6,$7)',[id,season.id,actor!.account_id,defender!.account_id,now,outcome.won,{config:ARENA_V15_RULES.version,seed,floor,attackerStats:statsA,defenderStats:statsB,attackerRevision:Number(actor!.revision),defenderRevision:Number(defender!.revision),attackerPosition:own,defenderPosition:other,result:outcome}]);
     if(outcome.won)await creditArenaGuildV16(c,actor!.account_id,id,now);
     changed.add(defender!.id);arenaRevision++;result={status:'applied',code:'OK',revision:Number(actor!.revision)+1,arenaRevision,matchId:id};
    }
   }catch(e){
    if(!(e instanceof ArenaRule))throw e;await c.query('ROLLBACK TO SAVEPOINT arena_action');for(const [id,state]of before)runs.set(id,structuredClone(state));changed.clear();changed.add(actorRun);arenaRevision=Number(world.revision);result={status:'rejected',code:e.message,revision:Number(actor!.revision)+1,arenaRevision};
   }
   await c.query('RELEASE SAVEPOINT arena_action');
   for(const row of rows){if(!changed.has(row.id))continue;const run=runs.get(row.id)!,old=before.get(row.id)!,revision=Number(row.revision)+1;
    for(const k of ['coin','coal','iron','gold','jade','protection','masteryMs'] as const){const value=(s:EconomyRunV6)=>BigInt(k==='masteryMs'?s.economy.masteryMs:k==='protection'?s.economy.protection:s.economy.balances[k]),balance=value(run),delta=balance-value(old);if(delta)await c.query('INSERT INTO akai_economy_rehearsal_ledger VALUES($1,$2,$3,$4,$5)',[row.id,revision,k,String(delta),String(balance)]);}
    await c.query('UPDATE akai_economy_rehearsals SET state=$2,revision=$3 WHERE id=$1',[row.id,run,revision]);await c.query('INSERT INTO akai_economy_rehearsal_events VALUES($1,$2,$3,$4)',[row.id,revision,randomUUID(),{kind:'arena-v15',commandId:cmd.commandId,status:result.status}]);
   }
   await c.query('UPDATE akai_arena_v15_world SET revision=$1,clock_ms=$2',[arenaRevision,now]);await c.query('INSERT INTO akai_arena_v15_commands VALUES($1,$2,$3,$4)',[actor!.account_id,cmd.commandId,hash,result]);await c.query('INSERT INTO akai_arena_v15_events VALUES($1,$2,$3,$4)',[randomUUID(),actor!.account_id,cmd.commandId,result]);return result;
  });
 }
}
