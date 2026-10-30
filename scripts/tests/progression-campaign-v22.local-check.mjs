// Explicit local-only check: requires ignored full synthetic campaigns; never substitutes fixtures for missing evidence.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm,readdir,copyFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const source='docs/plans/hunts-builds/progression-bonus-v22/campaigns',sha=x=>createHash('sha256').update(x).digest('hex');
test('full local campaigns reject corrupted source, time, wallet, censoring, stats and missing evidence',async()=>{
 const root=await mkdtemp(join(tmpdir(),'akai-v22-'));try{
  for(const name of await readdir(source))if(name.endsWith('.json.gz')||name.endsWith('.results.json'))await copyFile(join(source,name),join(root,name));
  const run=()=>execFileSync(process.execPath,['scripts/economy-v2/audit-progression-campaign-v22.mjs','--verify','--root='+root],{stdio:'pipe'});assert.doesNotThrow(run);
  const name='casual-swift-4213-calendar',rp=join(root,name+'.results.json'),cp=join(root,name+'.json.gz'),originalP=await readFile(rp),originalC=await readFile(cp);
  for(const mutate of [
   (c,p)=>{p.modelHash=c.v22.modelHash='0'.repeat(64);},
   (c,p)=>{c.activeFarmMs++;p.timeMs.activeFarm++;},
   (c,p)=>{c.run.economy.balances.coin=String(BigInt(c.run.economy.balances.coin)+1n);p.balances.coin=c.run.economy.balances.coin;},
   (c,p)=>{p.censored=!p.censored;},
   c=>{c.rows[0].stats.attack++;},
   (c,p)=>{p.attackEvents++;}
  ]){
   const c=JSON.parse(gunzipSync(originalC)),p=JSON.parse(originalP);mutate(c,p);const raw=Buffer.from(JSON.stringify(c)+'\n');p.checkpointSha256=sha(raw);await writeFile(cp,gzipSync(raw));await writeFile(rp,JSON.stringify(p));assert.throws(run);await writeFile(cp,originalC);await writeFile(rp,originalP);
  }
  await rm(cp);assert.throws(run);
 }finally{await rm(root,{recursive:true,force:true});}
});
