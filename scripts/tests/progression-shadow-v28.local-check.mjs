// Run only after complete generation/--verify; mutation failures must have all other evidence present.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,cp,symlink,rm} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {tmpdir} from 'node:os';
import {gzipSync,gunzipSync} from 'node:zlib';
import {CASES_V28,caseKeyV28} from '../economy-v2/progression-panel-v28.mjs';
import {auditShadowV28} from '../economy-v2/audit-progression-shadow-v28.mjs';
import {shaV28} from '../economy-v2/progression-shadow-v28.mjs';
const source=resolve('docs/plans/hunts-builds/progression-shadow-v28/local');
test('complete H28 ledger audit rejects compiled sources, bank/carry/witness/time/Q, native state and missing evidence',async()=>{
 const expected=JSON.parse(await readFile(source+'/summary.json','utf8'));assert.equal(expected.totalCases,14);assert.equal(expected.exactNativeReplays,14);assert.equal(expected.exactLedgerReplays,14);assert.deepEqual(JSON.parse(JSON.stringify(expected)),expected);
 const root=await mkdtemp(join(tmpdir(),'akai-v28-')),first=caseKeyV28(CASES_V28[0]);try{
  for(const config of CASES_V28){const key=caseKeyV28(config);if(key===first)await cp(source+'/'+key,root+'/'+key,{recursive:true});else await symlink(source+'/'+key,root+'/'+key,'dir');}
  const dir=join(root,first),sp=dir+'/snapshot.json.gz',rp=dir+'/results.json',lp=dir+'/day-001.json.gz',original=await readFile(sp),report=await readFile(rp),ledger=await readFile(lp);
  async function save(p,r){const raw=Buffer.from(JSON.stringify(p)+'\n');r.provenance=p.provenance;r.snapshotHash=shaV28(raw);r.shadowHash=shaV28(JSON.stringify(p.shadow));r.traceHash=shaV28(JSON.stringify(p.trace));await writeFile(sp,gzipSync(raw));await writeFile(rp,JSON.stringify(r));}
  for(const mutate of [
   (p,r)=>{p.provenance.sources.compiledModelHash='0'.repeat(64);},
   (p,r)=>{p.provenance.sources.compiledRuntimeHash='0'.repeat(64);},
   (p,r)=>{p.shadow.days[0].banks.h26.masteryMs++;},
   (p,r)=>{p.shadow.banks.zero.carry=(p.shadow.banks.zero.carry+1)%1000000;},
   (p,r)=>{p.shadow.banks.zero.witness.at--;},
   (p,r)=>{p.shadow.banks.h26.witness.at=p.shadow.start+1;},
   (p,r)=>{p.campaign.failed.unused=1;},
   (p,r)=>{r.complete=false;r.days=1;}
  ]){const p=JSON.parse(gunzipSync(original)),r=JSON.parse(report);mutate(p,r);await save(p,r);await assert.rejects(()=>auditShadowV28(root));await writeFile(sp,original);await writeFile(rp,report);}
  for(const mutate of [
   (rows,p)=>{rows[0].at=p.shadow.start+86400001;},
   rows=>{rows[0].Q++;},
   rows=>{rows[0].after.carry=(rows[0].after.carry+1)%1000000;}
  ]){
   const p=JSON.parse(gunzipSync(original)),r=JSON.parse(report),events=JSON.parse(gunzipSync(ledger));mutate(events,p);const raw=Buffer.from(JSON.stringify(events)+'\n'),archive=gzipSync(raw);p.shadow.days[0].rawHash=shaV28(raw);p.shadow.days[0].archiveHash=shaV28(archive);await writeFile(lp,archive);await save(p,r);
   // Semantic checks execute before the day-chain comparison; recalculated hashes alone are insufficient.
   await assert.rejects(()=>auditShadowV28(root),/LEDGER_TIME_OUTSIDE_DAY|LEDGER_TIME_ORDER|ZERO_VICTORY|SHADOW_DAILY_PREFIX_REPLAY/);
   await writeFile(sp,original);await writeFile(rp,report);await writeFile(lp,ledger);
  }
  await rm(lp);await assert.rejects(()=>auditShadowV28(root));
 }finally{await rm(root,{recursive:true,force:true});}
});

test('audit worker pool rejects invalid limits and missing evidence without a partial success',async()=>{
 for(const limit of [0,5,1.5])await assert.rejects(()=>auditShadowV28(source,limit),/INVALID_AUDIT_CONCURRENCY/);
 const root=await mkdtemp(join(tmpdir(),'akai-v28-missing-'));
 try{await assert.rejects(()=>auditShadowV28(root,4),/ENOENT/);}finally{await rm(root,{recursive:true,force:true});}
});
