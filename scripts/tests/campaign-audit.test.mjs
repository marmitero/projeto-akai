import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,cpSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {gzipSync,gunzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
const root=resolve('docs/plans/hunts-builds/campaign-v10');
const audit=where=>execFileSync(process.execPath,['scripts/economy-v2/audit-campaign.mjs','--verify','--root='+where],{encoding:'utf8',stdio:['ignore','pipe','pipe']});
test('committed acquired campaigns reconcile, and corrupted source, time, wallet or censored status cannot pass',()=>{
 const result=JSON.parse(audit(root));assert.equal(result.reconciliationPassed,true);assert.equal(result.activationReady,false);assert.equal(result.accounts,7);
 const temp=mkdtempSync(join(tmpdir(),'akai-campaign-audit-'));try{
  cpSync(root,temp,{recursive:true});const path=join(temp,'samples','best-swift-4213.json.gz'),original=JSON.parse(gunzipSync(readFileSync(path)));
  for(const corrupt of [c=>{c.provenance.sourceHash='0'.repeat(64);},c=>{c.activeFarmMs++;},c=>{c.run.economy.balances.coin=String(BigInt(c.run.economy.balances.coin)+1n);},c=>{c.firstMaxDay=c.firstMaxDay===null?100:null;},c=>{c.events.grants[0].amount++;}]){
   const c=structuredClone(original);corrupt(c);writeFileSync(path,gzipSync(JSON.stringify(c)));assert.throws(()=>audit(temp));
  }
 }finally{rmSync(temp,{recursive:true,force:true});}
});
