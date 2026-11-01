// Full28arms are required; short smokes must never substitute for longitudinal evidence.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,copyFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {CASES_V26,caseKeyV26} from '../economy-v2/progression-panel-v26.mjs';
import {auditPanelV26} from '../economy-v2/audit-progression-panel-v26.mjs';
const source='docs/plans/hunts-builds/progression-bonus-v26/local',sha=x=>createHash('sha256').update(x).digest('hex');
test('complete H26 panel reproduces native references and rejects forged or incomplete evidence',async()=>{
 const root=await mkdtemp(join(tmpdir(),'akai-v26-'));try{
  for(const c of CASES_V26)for(const mode of ['zero','calendar'])for(const ext of ['.json.gz','.results.json']){const name=caseKeyV26(c)+'-'+mode+ext;await copyFile(join(source,name),join(root,name));}
  const expected=await auditPanelV26();assert.deepEqual(await auditPanelV26(root),expected);assert.deepEqual(JSON.parse(JSON.stringify(expected)),expected);assert.equal(expected.completeArms,28);assert.equal(expected.exactNativeReplays,14);
  const cp=join(root,'casual-swift-17-h20-zero.json.gz'),rp=join(root,'casual-swift-17-h20-zero.results.json'),archive=await readFile(cp),report=await readFile(rp);
  for(const mutate of [
   (p,r)=>{p.provenance.sources.modelHash='0'.repeat(64);},
   (p,r)=>{p.provenance.config.startHour=12;},
   (p,r)=>{p.campaign.run.economy.economicThroughMs++;},
   (p,r)=>{p.campaign.run.economy.balances.coin=String(BigInt(p.campaign.run.economy.balances.coin)+1n);},
   (p,r)=>{p.campaign.run.economy.offline.usedMs=28800001;},
   (p,r)=>{r.endpoint.level++;},
   (p,r)=>{r.days=1;r.complete=false;},
   (p,r)=>{p.trace.nativeWallMs++;},
   (p,r)=>{r.nativeReplay.exactFinalState=false;},
   (p,r)=>{p.campaign.failed.unused=1;}
  ]){
   const p=JSON.parse(gunzipSync(archive)),r=JSON.parse(report);mutate(p,r);r.provenance=p.provenance;const raw=Buffer.from(JSON.stringify(p)+'\n');r.snapshotHash=sha(raw);r.traceHash=sha(JSON.stringify(p.trace));await writeFile(cp,gzipSync(raw));await writeFile(rp,JSON.stringify(r));await assert.rejects(()=>auditPanelV26(root));await writeFile(cp,archive);await writeFile(rp,report);
  }
  await rm(cp);await assert.rejects(()=>auditPanelV26(root));
 }finally{await rm(root,{recursive:true,force:true});}
});
