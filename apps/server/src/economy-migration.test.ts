import {it,expect,describe,beforeAll,afterAll} from 'vitest';
import {randomUUID} from 'node:crypto';
import {createLocalSnapshot} from '../../client/src/local/session.js';
import {createEquipment,ECONOMY_V2_ACTIVE,LocalSnapshotSchema} from '@akai/shared';
import {prepareEconomyMigration,verifyEconomyMigration,rehearseEconomyRollback,canonicalJson,dryRunEconomyDatabase,type MigrationContext} from './economy-migration.js';
import {Database} from './database.js';
import {OnlineService} from './online.js';
function source():MigrationContext {
  const s=createLocalSnapshot(1000);s.rpg.heroXp=123456;s.balances.iron='99999999999999999999999';s.balances.jade='100000';s.balances.ruby='9000';
  const i=createEquipment(s,'sword',100,'rare',()=>.5);i.enhancement=20;s.rpg.inventory.push(i);
  return {accountId:'00000000-0000-4000-8000-000000000001',cutoverMs:5000,snapshot:s,escrow:[],pendingOffers:[],rubyDebt:'2000',spending:[{resource:'coin',reason:'test-investment',amount:'123000'}]};
}
describe('economy migration rehearsal',()=>{
  it('is deterministic, preserves complete legacy archive and does not copy wealth or XP',()=>{
    const input=source(),original=structuredClone(input),p=prepareEconomyMigration(input);
    expect(input).toEqual(original);expect(p).toEqual(prepareEconomyMigration(input));
    expect(p.projected.masteryMs).toBe(0);expect(Object.values(p.projected.balances).every(x=>x==='0')).toBe(true);
    expect(p.projected.vault[0]!.enhancement).toBe(7);expect(p.archive.snapshot.rpg.inventory.at(-1)!.enhancement).toBe(20);
    expect(p.projected.vault[0]!.level).toBe(100);expect(p.premium).toEqual({ruby:'9000',debt:'2000',policy:'existing-ledger-no-copy'});
    expect(rehearseEconomyRollback(p)).toEqual(original);expect(ECONOMY_V2_ACTIVE).toBe(false);
    expect(verifyEconomyMigration(p)).toEqual(p.projected);
  });
  it('blocks unresolved market states and verifies backup plus projection, not just a checksum',()=>{
    const input=source();input.escrow=[{id:randomUUID(),asset:{kind:'resource',resource:'iron',amount:'1000'}}];input.pendingOffers=[{id:randomUUID()}];
    const p=prepareEconomyMigration(input);expect(p.blockers).toEqual(['UNRESOLVED_MARKET_ASSETS','PENDING_MARKET_OFFERS']);
    const bad=structuredClone(p);bad.archive.snapshot.balances.coin='1';expect(()=>verifyEconomyMigration(bad)).toThrow('BACKUP_MISMATCH');
    const forged=structuredClone(p);forged.projected.balances.coin='999';expect(()=>verifyEconomyMigration(forged)).toThrow('PLAN_MISMATCH');
    expect(p.activationAllowed).toBe(false);
  });
  it('canonicalizes object order without converting large amounts through Number',()=>{
    expect(canonicalJson({b:'1000000000000000000000',a:1})).toBe(canonicalJson({a:1,b:'1000000000000000000000'}));
    expect(()=>canonicalJson({bad:undefined})).toThrow();expect(()=>canonicalJson(NaN)).toThrow();
  });
});
const url=process.env.TEST_DATABASE_URL;
describe.skipIf(!url)('economy dry-run real PostgreSQL',()=>{
  const base=new Database(url!),schema='r2_'+randomUUID().replaceAll('-','');let db:Database;
  beforeAll(async()=>{await base.pool.query('CREATE SCHEMA '+schema);const u=new URL(url!);u.searchParams.set('options','-csearch_path='+schema);db=new Database(u.toString());await db.migrate();});
  afterAll(async()=>{await db?.close();await base.pool.query('DROP SCHEMA '+schema+' CASCADE');await base.close();});
  it('reads coherent snapshots and escrow/debt without settling or writing any account/ledger',async()=>{
    const online=new OnlineService(db),a=await online.guest(),b=await online.guest();
    await db.pool.query('INSERT INTO akai_premium_debts(account_id,ruby) VALUES($1,2000)',[a.accountId]);
    await db.pool.query(`INSERT INTO akai_market_listings(id,seller,asset,price,currency,created_at,expires_at) VALUES($1,$2,$3,1000,'coin',1,9999999999999)`,[randomUUID(),a.accountId,{kind:'resource',resource:'iron',amount:'1000'}]);
    const before=(await db.pool.query('SELECT * FROM akai_accounts ORDER BY id')).rows;
    const ledger=(await db.pool.query('SELECT * FROM akai_ledger ORDER BY account_id,sequence')).rows;
    const report=await dryRunEconomyDatabase(db,10000);
    expect(report.readOnly).toBe(true);expect(report.accountCount).toBe(2);expect(report.blockedAccounts).toBe(1);
    expect(report.plans.find(p=>p.accountId===a.accountId)!.premium.debt).toBe('2000');
    expect(report.plans.find(p=>p.accountId===b.accountId)!.blockers).toEqual([]);
    expect((await db.pool.query('SELECT * FROM akai_accounts ORDER BY id')).rows).toEqual(before);
    expect((await db.pool.query('SELECT * FROM akai_ledger ORDER BY account_id,sequence')).rows).toEqual(ledger);
    await expect(dryRunEconomyDatabase(db,10000,1)).rejects.toThrow('ACCOUNT_LIMIT_EXCEEDED');
  });
});

describe('legacy market reconciliation receipts',()=>{
 it('returns escrow gear to vault, quarantines materials/eligible fees, closes unreserved offers without copying wealth',async()=>{
  const {prepareLegacyMarketReconciliation,verifyLegacyMarketReconciliation}=await import('./economy-migration.js'),s=source(),item=createEquipment(LocalSnapshotSchema.parse(s.snapshot),'sword',100,'legendary',()=>.5);item.enhancement=20;
  const listing=randomUUID(),resource=randomUUID(),offer=randomUUID();s.escrow=[{id:listing,seller:s.accountId,status:'active',claimed:false,expires_at:999999,asset:{kind:'item',item}},{id:resource,seller:s.accountId,status:'expired',claimed:false,expires_at:1,asset:{kind:'resource',resource:'jade',quantity:'1000'}}];s.spending.push({resource:'coin',reason:'market:list:'+listing,amount:'100000000'});s.pendingOffers=[{id:offer,buyer:s.accountId,listing_id:randomUUID(),status:'pending',price:'5000',currency:'jade'}];
  const before=structuredClone(s),plan=prepareLegacyMarketReconciliation(s);expect(plan.blockers).toEqual([]);expect(plan.projected.vault.at(-1)).toMatchObject({id:s.accountId+'/legacy/'+item.id,enhancement:7,level:100});expect(plan.quarantineBalances.jade).toBe('101000');expect(plan.quarantineBalances.coin).toBe(String(BigInt(s.snapshot.balances.coin)+100000000n));expect(Object.values(plan.projected.balances)).toEqual(['0','0','0','0','0']);expect(plan.premium.ruby).toBe('9000');expect(plan.receipts.map(r=>r.key)).toEqual(['return/'+listing,'fee/'+listing,'return/'+resource,'offer/'+offer]);expect(verifyLegacyMarketReconciliation(plan)).toEqual(before);expect(prepareLegacyMarketReconciliation(s)).toEqual(plan);expect(s).toEqual(before);
  const tamper=structuredClone(plan);tamper.quarantineBalances.coin='999';expect(()=>verifyLegacyMarketReconciliation(tamper)).toThrow('PLAN_MISMATCH');
 });
 it('blocks unproved listing fees and rejects duplicate escrow identity',async()=>{
  const {prepareLegacyMarketReconciliation}=await import('./economy-migration.js'),s=source(),lid=randomUUID(),asset={kind:'resource',resource:'iron',quantity:'1000'};
  s.escrow=[{id:lid,seller:s.accountId,status:'active',claimed:false,expires_at:999999,asset}];expect(prepareLegacyMarketReconciliation(s).blockers).toEqual(['UNPROVEN_LISTING_FEE:'+lid]);s.escrow.push(structuredClone(s.escrow[0]!));expect(()=>prepareLegacyMarketReconciliation(s)).toThrow('ESCROW_IDENTITY');
 });
});
