import {test}from'node:test';import assert from'node:assert/strict';import{execFileSync,spawnSync}from'node:child_process';import{readFile}from'node:fs/promises';
const script='scripts/economy-v2/recover-h29.py';
test('recovery includes every frozen legacy case and all14 H29 pairs without replacing missing evidence',async()=>{
 const p=JSON.parse(execFileSync('python3',[script,'--plan'],{encoding:'utf8'}));assert.deepEqual(Object.fromEntries(['v22','v24','v26','v29'].map(s=>[s,p.jobs.filter(j=>j.stage===s).length])),{v22:9,v24:14,v26:28,v29:28});const h=p.jobs.filter(j=>j.stage==='v29');assert.equal(new Set(h.map(j=>JSON.stringify(j.config))).size,14);assert.ok(h.some(j=>j.config.seed===3735928559));for(const j of h){assert.equal(j.target,120);assert.equal(j.status,'queued');assert.equal(j.day,0);assert.equal(h.filter(x=>JSON.stringify(x.config)===JSON.stringify(j.config)).length,2);}
 assert.ok((await readFile('docs/plans/hunts-builds/progression-shadow-v28/RESULTS.md','utf8')).includes(p.expectedH26SummaryHash));
});
test('recovery refuses unsafe concurrency and cannot execute without a private backup hook',()=>{
 for(const n of ['0','9'])assert.notEqual(spawnSync('python3',[script,'--plan','--concurrency='+n]).status,0);const r=spawnSync('python3',[script],{encoding:'utf8'});assert.notEqual(r.status,0);assert.match(r.stderr,/backup hook/);
});
test('a different reconstructed H26 summary is rejected before H29 can start',()=>{
 const code="import importlib.util; s=importlib.util.spec_from_file_location('akai_recovery','scripts/economy-v2/recover-h29.py'); m=importlib.util.module_from_spec(s); s.loader.exec_module(m); m.assert_original_summary({})";const r=spawnSync('python3',['-c',code],{encoding:'utf8'});assert.notEqual(r.status,0);assert.match(r.stderr,/ORIGINAL_H26_SUMMARY_HASH_MISMATCH/);
});
