// Private archived native controls. Never serialize full references into a public report.
import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {INHERITED_CASES_V24,caseKeyV24} from './progression-panel-v24.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
export const semanticV26=x=>Object.fromEntries(Object.entries(x).filter(([k])=>k!=='provenance'));
export async function nativeReferenceV26(config){
 const key=caseKeyV24(config),panel=JSON.parse(await readFile('docs/plans/hunts-builds/progression-panel-v24/local/summary.json','utf8')),entry=panel.rows.find(r=>r.key===key);assert.ok(entry,'REFERENCE_NOT_IN_V24');assert.deepEqual(entry.config,config);
 let campaign,raw;
 if(INHERITED_CASES_V24.some(c=>caseKeyV24(c)===key)){
  const index=JSON.parse(await readFile('docs/plans/hunts-builds/campaign-v10/results.json','utf8')),row=index.rows.find(r=>r.seed===config.seed&&r.schedule===config.schedule&&r.build===config.build);assert.ok(row);
  const archive=await readFile('docs/plans/hunts-builds/campaign-v10/samples/'+row.file);assert.equal(sha(archive),row.archiveSha256);raw=gunzipSync(archive);assert.equal(sha(raw),row.sha256);assert.equal(sha(raw),entry.baselineHash);campaign=JSON.parse(raw);assert.equal(campaign.provenance.sourceHash,index.sourceHash);
 }else{
  raw=gunzipSync(await readFile('docs/plans/hunts-builds/progression-panel-v24/local/'+key+'-zero.json.gz'));assert.equal(sha(raw),entry.baselineHash);const p=JSON.parse(raw);campaign=p.campaign;assert.deepEqual(p.provenance.config,config);assert.equal(p.provenance.mode,'zero');
 }
 assert.equal(campaign.day,120);assert.equal(campaign.rows.length,120);for(const k of ['seed','schedule','build'])assert.equal(campaign[k],config[k]);
 return {campaign:semanticV26(campaign),hash:sha(raw),nativeHash:panel.sources.nativeHash,offlineHash:panel.sources.offlineHash,controllerHash:panel.sources.controllerHash};
}
