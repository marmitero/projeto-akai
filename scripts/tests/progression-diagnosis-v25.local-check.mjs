// Requires all private V24 arms plus inherited evidence; missing data must fail.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,copyFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {diagnosePanelV25} from '../economy-v2/progression-diagnosis-v25.mjs';
import {NEW_CASES_V24,caseKeyV24} from '../economy-v2/progression-panel-v24.mjs';
const rootSource='docs/plans/hunts-builds/progression-panel-v24/local',sha=x=>createHash('sha256').update(x).digest('hex');
test('full diagnosis reproduces all seven pairs and rejects forged complete evidence',async()=>{
 const root=await mkdtemp(join(tmpdir(),'akai-v25-'));try{
  for(const c of NEW_CASES_V24)for(const mode of ['zero','calendar'])for(const ext of ['.json.gz','.results.json']){const name=caseKeyV24(c)+'-'+mode+ext;await copyFile(join(rootSource,name),join(root,name));}
  const expected=await diagnosePanelV25();assert.deepEqual(await diagnosePanelV25(root),expected);assert.deepEqual(JSON.parse(JSON.stringify(expected)),expected);assert.equal(expected.pairs,7);assert.equal(expected.negativePairs,6);
  for(const row of expected.rows){assert.equal(row.full.wallDifferenceMs,0);assert.equal(row.full.netDifferenceMs,row.full.creditDifferenceMs===0?0:-row.full.creditDifferenceMs);if(row.preMax)assert.equal(row.preMax.creditDifferenceMs,0);}
  const key='casual-swift-4213-h20-calendar',cp=join(root,key+'.json.gz'),rp=join(root,key+'.results.json'),archive=await readFile(cp),report=await readFile(rp);
  for(const mutate of [p=>{p.trace.returnJumpMs=0;},p=>{p.provenance.sources.observerHash='0'.repeat(64);},p=>{p.campaign.run.economy.balances.coin=String(BigInt(p.campaign.run.economy.balances.coin)+1n);}]){
   const p=JSON.parse(gunzipSync(archive)),r=JSON.parse(report);mutate(p);r.provenance=p.provenance;const bytes=Buffer.from(JSON.stringify(p)+'\n');r.snapshotHash=sha(bytes);r.traceHash=sha(JSON.stringify(p.trace));await writeFile(cp,gzipSync(bytes));await writeFile(rp,JSON.stringify(r));await assert.rejects(()=>diagnosePanelV25(root));await writeFile(cp,archive);await writeFile(rp,report);
  }
  const r=JSON.parse(report);r.days=1;r.complete=false;await writeFile(rp,JSON.stringify(r));await assert.rejects(()=>diagnosePanelV25(root));await writeFile(rp,report);
  await rm(cp);await assert.rejects(()=>diagnosePanelV25(root));
 }finally{await rm(root,{recursive:true,force:true});}
});
