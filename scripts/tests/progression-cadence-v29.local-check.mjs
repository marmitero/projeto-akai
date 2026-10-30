// Requires the complete private H29 panel and an already independently verified summary.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,cp,symlink,rm} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {tmpdir} from 'node:os';
import {gunzipSync,gzipSync} from 'node:zlib';
import {auditCadenceV29} from '../economy-v2/audit-progression-cadence-v29.mjs';
import {CASES_V29,caseKeyV29} from '../economy-v2/progression-panel-v29.mjs';
import {shaV29} from '../economy-v2/progression-cadence-v29.mjs';
const source=resolve('docs/plans/hunts-builds/progression-cadence-v29/local');
test('full H29 audit rejects rehashed sources, native state, time, credits, waits, lifecycle and missing evidence',async()=>{
 const summary=JSON.parse(await readFile(source+'/summary.json','utf8'));assert.equal(summary.completeArms,28);assert.equal(summary.exactNativeReplays,14);assert.equal(summary.exactLedgerReplays,28);assert.deepEqual(JSON.parse(JSON.stringify(summary)),summary);
 const root=await mkdtemp(join(tmpdir(),'akai-v29-')),key=caseKeyV29(CASES_V29[0]);try{
  for(const c of CASES_V29)for(const mode of ['zero','calendar']){const name=caseKeyV29(c)+'-'+mode;if(caseKeyV29(c)===key)await cp(source+'/'+name,root+'/'+name,{recursive:true});else await symlink(source+'/'+name,root+'/'+name,'dir');}
  const dir=root+'/'+key+'-zero',sp=dir+'/snapshot.json.gz',rp=dir+'/results.json',lp=dir+'/day-001.json.gz',original=await readFile(sp),report=await readFile(rp),ledger=await readFile(lp);
  async function save(p,r){const raw=Buffer.from(JSON.stringify(p)+'\n');r.provenance=p.provenance;r.snapshotHash=shaV29(raw);r.traceHash=shaV29(JSON.stringify(p.trace));r.cadenceHash=shaV29(JSON.stringify(p.cadence));await writeFile(sp,gzipSync(raw));await writeFile(rp,JSON.stringify(r));}
  for(const mutate of [
   (p,r)=>{p.provenance.sources.compiledRuntimeHash='0'.repeat(64);},
   (p,r)=>{p.provenance.sources.modelHash='0'.repeat(64);},
   (p,r)=>{p.campaign.failed.unused=1;},
   (p,r)=>{p.cadence.potentialSavedMs++;},
   (p,r)=>{p.cadence.carry=(p.cadence.carry+1)%1000000;},
   (p,r)=>{p.trace.nativeWallMs++;},
   (p,r)=>{r.complete=false;},
   (p,r)=>{p.cadence.days[0].scheduledMs++;}
  ]){const p=JSON.parse(gunzipSync(original)),r=JSON.parse(report);mutate(p,r);await save(p,r);await assert.rejects(()=>auditCadenceV29(root));await writeFile(sp,original);await writeFile(rp,report);}
  for(const mutate of [
   events=>{events.find(x=>x.kind==='schedule').until++;},
   events=>{events.find(x=>x.kind==='schedule').Q++;},
   events=>{events.find(x=>x.kind==='schedule').after.carry++;},
   events=>{events.find(x=>x.kind==='start').at--;},
  ]){const p=JSON.parse(gunzipSync(original)),r=JSON.parse(report),events=JSON.parse(gunzipSync(ledger));mutate(events);const raw=Buffer.from(JSON.stringify(events)+'\n'),bytes=gzipSync(raw);p.cadence.days[0].rawHash=shaV29(raw);p.cadence.days[0].archiveHash=shaV29(bytes);await writeFile(lp,bytes);await save(p,r);await assert.rejects(()=>auditCadenceV29(root),/WAIT_QUOTE_MISMATCH|NON_NATIVE_MASTERY|EARLY_OR_LATE_START|CADENCE_TIME_ORDER|QUALIFIED_TIME_ORDER|NATIVE_CREDIT_PREFIX|DAILY_CADENCE_REPLAY/);await writeFile(sp,original);await writeFile(rp,report);await writeFile(lp,ledger);}
  await rm(lp);await assert.rejects(()=>auditCadenceV29(root),/ENOENT/);await writeFile(lp,ledger);
  // Candidate-specific quote: keep the full valid zero arm, then corrupt a discounted wait.
  const cd=root+'/'+key+'-calendar',cs=cd+'/snapshot.json.gz',cr=cd+'/results.json',cl=cd+'/day-001.json.gz',p=JSON.parse(gunzipSync(await readFile(cs))),r=JSON.parse(await readFile(cr)),events=JSON.parse(gunzipSync(await readFile(cl))),event=events.find(x=>x.kind==='schedule'&&x.until-x.at<3000);assert.ok(event,'ELIGIBLE_WAIT_FIXTURE');event.until--;
  const raw=Buffer.from(JSON.stringify(events)+'\n'),bytes=gzipSync(raw);p.cadence.days[0].rawHash=shaV29(raw);p.cadence.days[0].archiveHash=shaV29(bytes);await writeFile(cl,bytes);const body=Buffer.from(JSON.stringify(p)+'\n');r.snapshotHash=shaV29(body);r.cadenceHash=shaV29(JSON.stringify(p.cadence));await writeFile(cs,gzipSync(body));await writeFile(cr,JSON.stringify(r));await assert.rejects(()=>auditCadenceV29(root),/WAIT_QUOTE_MISMATCH/);
 }finally{await rm(root,{recursive:true,force:true});}
});
test('audit rejects invalid pool limits and a failed worker cannot return partial success',async()=>{
 for(const n of [0,5,1.5])await assert.rejects(()=>auditCadenceV29(source,n),/INVALID_AUDIT_CONCURRENCY/);const root=await mkdtemp(join(tmpdir(),'akai-v29-missing-'));try{await assert.rejects(()=>auditCadenceV29(root,4),/ENOENT/);}finally{await rm(root,{recursive:true,force:true});}
});
