// Full private synthetic arms required. Do not run this in CI using fabricated substitutes.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,copyFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {auditPanelV24} from '../economy-v2/audit-progression-panel-v24.mjs';
import {NEW_CASES_V24,caseKeyV24} from '../economy-v2/progression-panel-v24.mjs';
const source='docs/plans/hunts-builds/progression-panel-v24/local',sha=x=>createHash('sha256').update(x).digest('hex');
test('complete panel rejects source, window, clock, wallet, quota, endpoint and incomplete/missing arm corruption',async()=>{
 const root=await mkdtemp(join(tmpdir(),'akai-v24-'));try{
  for(const c of NEW_CASES_V24)for(const mode of ['zero','calendar'])for(const suffix of ['.json.gz','.results.json']){const name=caseKeyV24(c)+'-'+mode+suffix;await copyFile(join(source,name),join(root,name));}
  const expected=await auditPanelV24();assert.deepEqual(JSON.parse(JSON.stringify(expected)),expected);assert.deepEqual(await auditPanelV24(root),expected);
  const name='casual-swift-17-h20-calendar',cp=join(root,name+'.json.gz'),rp=join(root,name+'.results.json'),rawOriginal=await readFile(cp),reportOriginal=await readFile(rp);
  for(const mutate of [
   (p,r)=>{p.provenance.sources.observerHash='0'.repeat(64);},
   (p,r)=>{p.provenance.config.startHour=12;},
   (p,r)=>{p.campaign.run.economy.economicThroughMs++;},
   (p,r)=>{p.campaign.run.economy.balances.coin=String(BigInt(p.campaign.run.economy.balances.coin)+1n);},
   (p,r)=>{p.campaign.run.economy.offline.usedMs=8*3600000+1;},
   (p,r)=>{r.endpoint.level++;},
   (p,r)=>{r.days=1;r.complete=false;},
   (p,r)=>{p.trace.nativeWallMs++;}
  ]){const p=JSON.parse(gunzipSync(rawOriginal)),r=JSON.parse(reportOriginal);mutate(p,r);r.provenance=p.provenance;const raw=Buffer.from(JSON.stringify(p)+'\n');r.snapshotHash=sha(raw);r.traceHash=sha(JSON.stringify(p.trace));await writeFile(cp,gzipSync(raw));await writeFile(rp,JSON.stringify(r));await assert.rejects(()=>auditPanelV24(root));await writeFile(cp,rawOriginal);await writeFile(rp,reportOriginal);}
  await rm(cp);await assert.rejects(()=>auditPanelV24(root));
 }finally{await rm(root,{recursive:true,force:true});}
});
