// Requires the two ignored full traces and their original references; no fixtures replace missing evidence.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,copyFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {diagnoseTraceV23} from '../economy-v2/audit-progression-trace-v23.mjs';
const source='docs/plans/hunts-builds/progression-trace-v23/local',sha=x=>createHash('sha256').update(x).digest('hex');
test('full trace audit rejects missing evidence and source, state, time, credit, purchase and RNG corruption',async()=>{
 const root=await mkdtemp(join(tmpdir(),'akai-v23-'));try{
  for(const mode of ['zero','calendar']){const name=`best-swift-3735928559-${mode}.trace.json`;await copyFile(join(source,name),join(root,name));}
  const expected=await diagnoseTraceV23();assert.deepEqual(JSON.parse(JSON.stringify(expected)),expected,'Diagnostic report survives JSON round trip');assert.deepEqual(await diagnoseTraceV23(root),expected);
  const path=join(root,'best-swift-3735928559-calendar.trace.json'),original=JSON.parse(await readFile(path,'utf8'));
  for(const mutate of [
   p=>{p.provenance.observerHash='0'.repeat(64);},
   p=>{p.semanticStateHash='0'.repeat(64);},
   p=>{p.trace.nativeWallMs++;},
   p=>{const g=Object.values(p.trace.groups).find(x=>x.creditMs>0);g.creditMs++;g.directExtraMs++;},
   p=>{p.trace.actionDebits.coin=String(BigInt(p.trace.actionDebits.coin)+1n);},
   p=>{p.trace.drawCount++;},
   p=>{p.exactFinalState=false;},
   p=>{p.days=1;p.complete=false;}
  ]){const p=structuredClone(original);mutate(p);p.traceHash=sha(JSON.stringify(p.trace));await writeFile(path,JSON.stringify(p));await assert.rejects(()=>diagnoseTraceV23(root));}
  await rm(path);await assert.rejects(()=>diagnoseTraceV23(root));
 }finally{await rm(root,{recursive:true,force:true});}
});
