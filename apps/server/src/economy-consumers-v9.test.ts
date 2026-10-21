import {beforeAll,afterAll,describe,it,expect} from 'vitest';
import {randomUUID} from 'node:crypto';
import {Database} from './database.js';
import {OnlineService} from './online.js';
import {EconomyRehearsalService} from './economy-rehearsal.js';
import {MarketV2Service} from './market-v2.js';
import {BossEventsV8Service} from './boss-events-v8.js';
import {readEconomyConsumersV9} from './economy-consumers-v9.js';
import {presetBuildV3} from '@akai/shared';
const url=process.env.TEST_DATABASE_URL;
describe.skipIf(!url)('integrated SQL consumers v9',()=>{
 const base=new Database(url!),schema='consumers_v9_'+randomUUID().replaceAll('-','');let db:Database,economy:EconomyRehearsalService,market:MarketV2Service,boss:BossEventsV8Service;let now=Date.parse('2026-10-21T15:00:00Z');
 beforeAll(async()=>{await base.pool.query('CREATE SCHEMA '+schema);const u=new URL(url!);u.searchParams.set('options','-csearch_path='+schema);db=new Database(u.toString());await db.migrate();economy=new EconomyRehearsalService(db,()=>now);market=new MarketV2Service(db,()=>now);boss=new BossEventsV8Service(db,()=>now);});
 afterAll(async()=>{await db?.close();await base.pool.query('DROP SCHEMA '+schema+' CASCADE');await base.close();});
 async function fixture(){const online=new OnlineService(db,()=>now),members=[];for(let i=0;i<3;i++){const user=await online.guest(),staged=await economy.stage(user.accountId,randomUUID()),row=await economy.inspect(staged.id);const e=presetBuildV3(1000,'swift','legendary20');e.accountId=user.accountId;e.economicThroughMs=now;e.highest.main=1000;for(const item of e.inventory){item.id=user.accountId+'/'+item.id;item.enhancement=15;}for(const k of Object.keys(e.equipped) as (keyof typeof e.equipped)[])e.equipped[k]=user.accountId+'/'+e.equipped[k];e.balances.coin='2000000000';row.state.economy=e;row.state.paused=true;await db.pool.query('UPDATE akai_economy_rehearsals SET state=$2 WHERE id=$1',[staged.id,row.state]);for(const [k,v] of [['coin',e.balances.coin],['masteryMs',String(e.masteryMs)]] as const)await db.pool.query('INSERT INTO akai_economy_rehearsal_ledger VALUES($1,0,$2,$3,$3)',[staged.id,k,v]);await db.pool.query('INSERT INTO akai_profiles(account_id,name,joined_at) VALUES($1,$2,$3) ON CONFLICT(account_id) DO UPDATE SET name=EXCLUDED.name',[user.accountId,'Teste'+randomUUID().slice(0,8),now]);members.push({id:staged.id,account:user.accountId,source:(await db.pool.query('SELECT snapshot FROM akai_accounts WHERE id=$1',[user.accountId])).rows[0].snapshot});}const ids=members.map(m=>m.id);return {members,market:(await market.stage(ids,randomUUID())).id,boss:(await boss.stage(ids,randomUUID())).id};}
 async function command(service:EconomyRehearsalService|MarketV2Service|BossEventsV8Service,run:string,action:Record<string,unknown>,realm?:string){const revision=Number((await economy.inspect(run)).revision),input={commandId:randomUUID(),expectedRevision:revision,action};return realm?await (service as MarketV2Service|BossEventsV8Service).command(realm,run,input):await (service as EconomyRehearsalService).command(run,input);}
 it('consumes the same market instance and wallet, shows authoritative stats and no private RNG',async()=>{const f=await fixture(),seller=f.members[0]!,buyer=f.members[1]!,item=(await economy.inspect(seller.id)).state.economy.inventory[0]!;
  expect((await command(economy,seller.id,{type:'unequip',slot:'weapon'})).status).toBe('applied');
  expect((await command(market,seller.id,{type:'list.item',itemId:item.id,price:'200000000',currency:'coin'},f.market)).status).toBe('applied');const listing=(await market.inspect(f.market)).book.listings[0]!;
  expect((await command(market,buyer.id,{type:'buy',listingId:listing.id},f.market)).status).toBe('applied');expect((await command(economy,buyer.id,{type:'equip',itemId:item.id})).status).toBe('applied');
  const projection=await readEconomyConsumersV9(db,buyer.id);expect(projection.consumer.equipped.weapon).toBe(item.id);expect(projection.consumer.balances.coin).toBe('1800000000');expect(projection.consumer.market!.trades).toHaveLength(1);expect(projection.marketRealm).toBe(f.market);expect(projection.eventRealm).toBe(f.boss);expect(JSON.stringify(projection)).not.toMatch(/"(seed|secret|runs|sessions|offlineJob)":/);expect(projection.consumer.accountId).toBe(buyer.account);for(const m of f.members)expect(await economy.reconcile(m.id)).toEqual([]);
 });
 it('keeps a single revision stream across events/economy/market and projects weekly grants without touching live accounts',async()=>{const f=await fixture(),actor=f.members[0]!,other=f.members[1]!;expect((await command(boss,actor.id,{type:'join',mode:'protection'},f.boss)).status).toBe('applied');
  const blocked=await command(economy,actor.id,{type:'pause',paused:false});expect(blocked.code).toBe('EVENT_ACTIVITY_ACTIVE');expect((await command(market,other.id,{type:'sync'},f.market)).status).toBe('applied');
  for(let i=0;i<32;i++){now+=10000;expect((await command(boss,actor.id,{type:'heartbeat'},f.boss)).status).toBe('applied');}
  const view=await readEconomyConsumersV9(db,actor.id);expect(view.consumer.protection).toBe(5);expect(view.consumer.event!.active).toBe(true);expect(view.consumer.event!.weeklyMs).toBeGreaterThanOrEqual(300000);
  const stored=await economy.inspect(actor.id);expect(view.revision).toBe(Number(stored.revision));const replayView=await readEconomyConsumersV9(db,actor.id);expect(replayView).toEqual(view);
  expect((await command(boss,actor.id,{type:'leave'},f.boss)).status).toBe('applied');expect((await command(economy,actor.id,{type:'pause',paused:true})).status).toBe('applied');
  for(const m of f.members)expect(await economy.reconcile(m.id)).toEqual([]);for(const m of f.members)expect((await db.pool.query('SELECT snapshot FROM akai_accounts WHERE id=$1',[m.account])).rows[0].snapshot).toEqual(m.source);
 });
 it('rejects absent runs and never changes state, receipts or ledgers while reading',async()=>{await expect(readEconomyConsumersV9(db,randomUUID())).rejects.toThrow('REHEARSAL_NOT_FOUND');const f=await fixture(),id=f.members[0]!.id,before=await economy.inspect(id);await Promise.all(Array.from({length:4},()=>readEconomyConsumersV9(db,id)));expect(await economy.inspect(id)).toEqual(before);});
});
