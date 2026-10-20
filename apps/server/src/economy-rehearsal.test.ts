import {beforeAll,afterAll,describe,it,expect} from 'vitest';
import {randomUUID} from 'node:crypto';
import {Database} from './database.js';
import {OnlineService} from './online.js';
import {EconomyRehearsalService} from './economy-rehearsal.js';
import {ECONOMY_XP_V2} from '@akai/shared';
const url=process.env.TEST_DATABASE_URL;
describe.skipIf(!url)('R6 PostgreSQL rehearsal transactions',()=>{
 const db=new Database(url!);let now=1000000;const legacy=new OnlineService(db,()=>now),service=new EconomyRehearsalService(db,()=>now);
 beforeAll(async()=>{await db.migrate();});afterAll(async()=>{await db.close();});
 const command=(expectedRevision=0,action:Record<string,unknown>={type:'settle'})=>({commandId:randomUUID(),expectedRevision,action});
 async function stage(){const u=await legacy.guest();const source=(await db.pool.query('SELECT snapshot FROM akai_accounts WHERE id=$1',[u.accountId])).rows[0].snapshot;const requestId=randomUUID();const r=await service.stage(u.accountId,requestId);return {...r,u,source,requestId};}
 it('stages exactly once from authoritative source without changing old accounts, premium or balances',async()=>{
  const s=await stage();expect(await service.stage(s.u.accountId,s.requestId)).toEqual({id:s.id,created:false});
  const r=await service.inspect(s.id);expect(r.state.economy.masteryMs).toBe(0);expect(Object.values(r.state.economy.balances)).toEqual(['0','0','0','0','0']);
  expect((await service.rollbackArchive(s.id)).snapshot).toEqual(s.source);expect((await db.pool.query('SELECT snapshot FROM akai_accounts WHERE id=$1',[s.u.accountId])).rows[0].snapshot).toEqual(s.source);
  expect(await service.reconcile(s.id)).toEqual([]);
 });
 it('refuses escrow/pending market state rather than performing an implicit real refund',async()=>{
  const u=await legacy.guest();await db.pool.query("INSERT INTO akai_market_listings(id,seller,asset,price,currency,created_at,expires_at) VALUES($1,$2,$3,10000,'coin',$4,$5)",[randomUUID(),u.accountId,{type:'resource',resource:'iron',amount:'1000'},now,now+60000]);
  await expect(service.stage(u.accountId,randomUUID())).rejects.toThrow('UNRESOLVED_MARKET');expect((await db.pool.query('SELECT COUNT(*)::int n FROM akai_economy_rehearsals WHERE account_id=$1',[u.accountId])).rows[0].n).toBe(0);
 });
 it('serializes simultaneous commands, returns saved receipts and rejects key reuse',async()=>{
  const s=await stage(),a=command(),b=command();const results=await Promise.all([service.command(s.id,a),service.command(s.id,b)]);
  expect(results.filter(r=>r.status==='applied')).toHaveLength(1);expect(results.filter(r=>r.code==='STALE_REVISION')).toHaveLength(1);
  expect(await service.command(s.id,a)).toEqual(results[0]);expect(await service.command(s.id,b)).toEqual(results[1]);
  await expect(service.command(s.id,{...a,action:{type:'pause',paused:true}})).rejects.toThrow('COMMAND_ID_REUSED');
  expect(Number((await service.inspect(s.id)).revision)).toBe(2);expect((await db.pool.query('SELECT COUNT(*)::int n FROM akai_economy_rehearsal_events WHERE run_id=$1',[s.id])).rows[0].n).toBe(2);
 });
 it('settles confirmed kills once, keeps the live wallet unchanged and reconciles ledger',async()=>{
  const s=await stage();now+=30000;const c=command(),r=await service.command(s.id,c),after=await service.inspect(s.id);expect(r.status).toBe('applied');expect(after.state.killSequence).toBeGreaterThan(0);
  expect(await service.command(s.id,c)).toEqual(r);expect((await service.inspect(s.id)).state).toEqual(after.state);expect(await service.reconcile(s.id)).toEqual([]);
  expect((await db.pool.query('SELECT snapshot FROM akai_accounts WHERE id=$1',[s.u.accountId])).rows[0].snapshot).toEqual(s.source);
 });
 it('skips inactive gaps instead of silently minting an unvalidated offline budget',async()=>{
  const s=await stage();now+=86400000;await service.command(s.id,command());const r=await service.inspect(s.id);expect(r.state.killSequence).toBe(0);expect(r.state.economy.masteryMs).toBe(0);expect(r.state.economy.economicThroughMs).toBe(now);
 });
 it('atomically refines a synthetic funded fixture and never rerolls a replay',async()=>{
  const s=await stage(),row=await service.inspect(s.id),run=row.state;
  // Synthetic test fixture only; matching baseline ledger entries are recorded explicitly.
  run.economy.masteryMs=ECONOMY_XP_V2[99]!;run.economy.inventory[0]!.rarity='legendary';run.economy.inventory[0]!.enhancement=7;run.economy.protection=5;
  for(const k of ['coin','coal','iron'] as const)run.economy.balances[k]='100000000000';
  await db.transaction(async c=>{await c.query('UPDATE akai_economy_rehearsals SET state=$2 WHERE id=$1',[s.id,run]);for(const [resource,amount] of Object.entries({...run.economy.balances,masteryMs:run.economy.masteryMs,protection:5}))if(BigInt(String(amount))!==0n)await c.query('INSERT INTO akai_economy_rehearsal_ledger(run_id,sequence,resource,delta,balance) VALUES($1,0,$2,$3,$3)',[s.id,resource,String(amount)]);});
  const cmd=command(0,{type:'refine',itemId:run.economy.inventory[0]!.id,protect:true}),receipt=await service.command(s.id,cmd),after=await service.inspect(s.id);
  expect(receipt.status).toBe('applied');expect(after.state.economy.protection).toBe(4);expect(after.state.economy.inventory[0]!.enhancement).not.toBe(7);expect(after.state.economy.inventory).toHaveLength(run.economy.inventory.length);
  expect(await service.command(s.id,cmd)).toEqual(receipt);expect((await service.inspect(s.id)).state).toEqual(after.state);expect(await service.reconcile(s.id)).toEqual([]);
 });
 it('rolls back state/ledger/receipt when an outbox insert fails, and keeps archives immutable',async()=>{
  const s=await stage(),before=await service.inspect(s.id);now+=10000;
  await db.pool.query(`CREATE OR REPLACE FUNCTION akai_r6_test_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.run_id='${s.id}'::uuid THEN RAISE EXCEPTION 'R6_TEST_OUTBOX_FAILURE'; END IF; RETURN NEW; END $$`);
  await db.pool.query('CREATE TRIGGER akai_r6_test_fail BEFORE INSERT ON akai_economy_rehearsal_events FOR EACH ROW EXECUTE FUNCTION akai_r6_test_fail()');
  const cmd=command();try{await expect(service.command(s.id,cmd)).rejects.toThrow('R6_TEST_OUTBOX');}finally{await db.pool.query('DROP TRIGGER akai_r6_test_fail ON akai_economy_rehearsal_events');await db.pool.query('DROP FUNCTION akai_r6_test_fail()');}
  expect(await service.inspect(s.id)).toEqual(before);expect((await db.pool.query('SELECT COUNT(*)::int n FROM akai_economy_rehearsal_commands WHERE run_id=$1',[s.id])).rows[0].n).toBe(0);expect(await service.reconcile(s.id)).toEqual([]);
  await expect(db.pool.query("UPDATE akai_economy_rehearsals SET archive='{}'::jsonb WHERE id=$1",[s.id])).rejects.toThrow('immutable');expect((await service.command(s.id,cmd)).status).toBe('applied');
 });
 it('closes without erasing history; rollback export cannot overwrite later live progress',async()=>{
  const s=await stage(),cmd=command(0,{type:'close'});expect((await service.command(s.id,cmd)).status).toBe('applied');expect((await service.inspect(s.id)).closed).toBe(true);
  expect(await service.command(s.id,cmd)).toEqual({status:'applied',revision:1,backlog:false});await expect(service.command(s.id,command(1))).rejects.toThrow('CLOSED');
  await db.pool.query("UPDATE akai_accounts SET snapshot=jsonb_set(snapshot,'{profile,name}','\"Depois do ensaio\"') WHERE id=$1",[s.u.accountId]);
  expect((await service.rollbackArchive(s.id)).snapshot).toEqual(s.source);expect((await db.pool.query('SELECT snapshot FROM akai_accounts WHERE id=$1',[s.u.accountId])).rows[0].snapshot.profile.name).toBe('Depois do ensaio');
 });
});
