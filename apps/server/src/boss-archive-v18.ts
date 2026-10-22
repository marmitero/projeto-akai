import type {PoolClient} from 'pg';
import {advanceBossEventsV8,initialBossEventsV8,type BossEventsV8} from '@akai/shared';
import {bossGuildXpV18,bossDayStartV18,BOSS_GUILD_V18_RULES,type BossArchiveV18,type BossArchiveV18View} from '@akai/shared/boss-archive-v18';
const contributed=(s:BossEventsV8)=>Object.values(s.daily.members).some(m=>BigInt(m.contributionDamage)>0n||BigInt(m.damage)>0n||m.qualifiedMs>0);
/** Read-only guard under guild advisory lock; a season cannot outrun an unarchived edition. */
export async function bossCloseRequiredV18(c:PoolClient,now:number,through=now){const r=(await c.query('SELECT r.state FROM akai_boss_v8_realms r JOIN akai_v13_world w ON w.realm_id=r.id')).rows[0];if(!r)return false;const s=r.state as BossEventsV8;return Math.max(now,s.clockMs)>=s.daily.endMs&&s.daily.endMs<=through&&contributed(s);}
/** Clock stays bounded to the same native 30 windows; archive before the native day replacement. */
export async function advanceArchivedBossV18(input:BossEventsV8,to:number,close:(s:BossEventsV8)=>Promise<void>,maximum=30){
 let s=structuredClone(input),windows=0;const end=s.daily.endMs;
 if(to<end)return advanceBossEventsV8(s,to,maximum);
 // Advance exactly the native absolute-second/lease windows, without splitting the final ms.
 // Splitting a window could shift the timestamp of a qualification grant by one millisecond.
 while(s.clockMs<end){
  for(const [id,p]of Object.entries(s.sessions))if(p.until<=s.clockMs||s.daily.members[id]?.suspended){p.active=false;p.combat=null;}
  const active=Object.values(s.sessions).filter(p=>p.active);
  if(!active.length){s.clockMs=end;break;}
  if(windows>=maximum)return{state:s,windows,backlog:true};
  const target=Math.min(end,(Math.floor(s.clockMs/1000)+1)*1000,...active.map(p=>p.until)),r=advanceBossEventsV8(s,target,1);s=r.state;windows+=r.windows;
 }
 if(contributed(s))await close(s);
 s.daily=initialBossEventsV8(end).daily;for(const p of Object.values(s.sessions)){p.active=false;p.combat=null;}
 // All leases end with the edition. Dormant days cannot create damage, archives or rewards.
 s.clockMs=to;if(to>=s.daily.endMs)s.daily=initialBossEventsV8(to).daily;
 return{state:s,windows,backlog:false};
}
/** Called after a successful canonical authenticated boss join, while guild/realm/runs are locked. */
export async function bindBossGuildV18(c:PoolClient,realm:string,account:string,state:BossEventsV8){
 const start=bossDayStartV18(state.daily.date,state.daily.endMs),row=(await c.query('SELECT m.guild_id,m.joined_at FROM akai_guild_v16_members m JOIN akai_guild_v16_guilds g ON g.id=m.guild_id WHERE m.account_id=$1 AND g.active',[account])).rows[0];
 await c.query('INSERT INTO akai_boss_v18_bindings VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING',[realm,state.daily.date,account,row?.guild_id??null,row?.joined_at??null,!!row&&Number(row.joined_at)<start,state.daily.members[account]?.damage??'0']);
}
/** All archive/credit/world mutations join the R8 wallet/receipt/outbox transaction. */
export async function closeBossArchiveV18(c:PoolClient,realm:string,s:BossEventsV8,closedAt:number){
 if((await c.query('SELECT 1 FROM akai_boss_v18_archives WHERE realm_id=$1 AND date=$2',[realm,s.daily.date])).rowCount)return;
 const bindings=(await c.query(`SELECT b.*,m.guild_id current_guild,m.joined_at current_joined,g.active,v.enabled,r.closed,COALESCE(p.suspended,false) suspended FROM akai_boss_v18_bindings b LEFT JOIN akai_guild_v16_members m ON m.account_id=b.account_id LEFT JOIN akai_guild_v16_guilds g ON g.id=b.guild_id LEFT JOIN akai_v13_members v ON v.account_id=b.account_id LEFT JOIN akai_economy_rehearsals r ON r.id=v.run_id LEFT JOIN akai_profiles p ON p.account_id=b.account_id WHERE b.realm_id=$1 AND b.date=$2`,[realm,s.daily.date])).rows;
 let changed=false;
 const contributors:BossArchiveV18['contributors']=[];
 for(const m of Object.values(s.daily.members).sort((a,b)=>BigInt(a.damage)>BigInt(b.damage)?-1:BigInt(a.damage)<BigInt(b.damage)?1:a.accountId.localeCompare(b.accountId))){
  if(BigInt(m.contributionDamage)===0n&&m.qualifiedMs===0&&BigInt(m.damage)===0n)continue;
  const b=bindings.find(b=>b.account_id===m.accountId),eligible=b?.eligible&&b.active&&b.enabled&&!b.closed&&!b.suspended&&!m.suspended&&b.guild_id===b.current_guild&&b.joined_at===b.current_joined;
  const fresh=b?BigInt(m.damage)-BigInt(b.baseline_damage):0n,xp=eligible?bossGuildXpV18(String(fresh>0n?fresh:0n),s.daily.maxHp):0;
  if(xp){const inserted=await c.query('INSERT INTO akai_guild_v16_credits VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING RETURNING source',[`boss:${realm}:${s.daily.date}:guild-v18`,m.accountId,b.guild_id,xp,s.daily.endMs-1]);if(inserted.rowCount){await c.query('UPDATE akai_guild_v16_guilds SET xp=xp+$2 WHERE id=$1',[b.guild_id,xp]);changed=true;}}
  contributors.push({accountId:m.accountId,name:m.name,damage:m.damage,contributionDamage:m.contributionDamage,qualifiedMs:m.qualifiedMs,guildId:xp?b.guild_id:null,guildXp:xp});
 }
 const archive:BossArchiveV18={version:BOSS_GUILD_V18_RULES.version,date:s.daily.date,end:s.daily.endMs,closedAt,maxHp:s.daily.maxHp,hp:s.daily.hp,defeatedAt:s.daily.defeatedAt,lastHit:s.daily.lastHit,contributors};
 await c.query('INSERT INTO akai_boss_v18_archives VALUES($1,$2,$3,$4)',[realm,s.daily.date,s.daily.endMs,archive]);await c.query('UPDATE akai_guild_v16_world SET revision=revision+$2,clock_ms=GREATEST(clock_ms,$1)',[closedAt,changed?1:0]);
}
export async function readBossArchiveV18(c:PoolClient,realm:string,account:string,now:number):Promise<BossArchiveV18View>{const state=(await c.query('SELECT state FROM akai_boss_v8_realms WHERE id=$1',[realm])).rows[0].state as BossEventsV8,own=(await c.query('SELECT guild_id,eligible FROM akai_boss_v18_bindings WHERE realm_id=$1 AND date=$2 AND account_id=$3',[realm,state.daily.date,account])).rows[0];return {version:BOSS_GUILD_V18_RULES.version,date:state.daily.date,closeRequired:await bossCloseRequiredV18(c,now),own:own?{guildId:own.guild_id,eligible:own.eligible}:null,archives:(await c.query('SELECT payload FROM akai_boss_v18_archives WHERE realm_id=$1 ORDER BY date DESC LIMIT 7',[realm])).rows.map(r=>r.payload)};}
export async function seasonBossRankingV18(c:PoolClient,start:number,end:number,ids:string[]){const rows=(await c.query('SELECT a.payload FROM akai_boss_v18_archives a JOIN akai_v13_world w ON w.realm_id=a.realm_id WHERE a.end_ms>$1 AND a.end_ms<=$2 ORDER BY a.date',[start,end])).rows,totals=new Map<string,{accountId:string;name:string;damage:bigint}>();for(const a of rows)for(const m of (a.payload as BossArchiveV18).contributors){if(!ids.includes(m.accountId)||BigInt(m.damage)===0n)continue;const old=totals.get(m.accountId);totals.set(m.accountId,{accountId:m.accountId,name:m.name,damage:(old?.damage??0n)+BigInt(m.damage)});}return [...totals.values()].sort((a,b)=>a.damage>b.damage?-1:a.damage<b.damage?1:a.accountId.localeCompare(b.accountId)).map(r=>({...r,damage:String(r.damage)}));}
