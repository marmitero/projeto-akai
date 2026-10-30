import {readFile,readdir} from 'node:fs/promises';
import {join,relative} from 'node:path';
import {shaV29} from './progression-cadence-v29.mjs';
import {replaceOnceV29} from './progression-adapter-v29.mjs';
export const SOURCE_PATHS_V29=Object.freeze({"nativeHash":"packages/shared/dist/economy-run-v6.js","offlineHash":"packages/shared/dist/offline-v7.js","controllerHash":"scripts/economy-v2/campaign-policy.mjs","modelHash":"scripts/economy-v2/progression-cadence-v29.mjs","compiledBaseModelHash":"packages/shared/dist/progression-bonus-v22/index.js","factoryHash":"scripts/economy-v2/progression-adapter-v29.mjs","baseObserverHash":"scripts/economy-v2/progression-trace-v24.mjs","runnerHash":"scripts/economy-v2/run-progression-cadence-v29.mjs","validatorHash":"scripts/economy-v2/progression-evidence-v24.mjs","referenceSourceHash":"scripts/economy-v2/progression-reference-v26.mjs","panelSourceHash":"scripts/economy-v2/progression-panel-v29.mjs","sourcesModuleHash":"scripts/economy-v2/progression-sources-v29.mjs","hypothesisHash":"docs/plans/hunts-builds/progression-shadow-v28/H29.md","protocolSourceHash":"docs/plans/hunts-builds/progression-cadence-v29/PROTOCOL.md"});
export async function sourcesV29(startHour){
 const root='packages/shared/dist',paths=[];
 async function visit(dir){for(const e of await readdir(dir,{withFileTypes:true})){if(e.name.startsWith('.'))continue;const p=join(dir,e.name);if(e.isDirectory())await visit(p);else if(e.name.endsWith('.js')&&!e.name.endsWith('.test.js'))paths.push(p);}}
 await visit(root);paths.sort();const manifest=await Promise.all(paths.map(async p=>[relative(root,p),shaV29(await readFile(p))]));
 const sources=Object.fromEntries(await Promise.all(Object.entries(SOURCE_PATHS_V29).map(async([k,p])=>[k,shaV29(await readFile(p))]))),controller=await readFile(SOURCE_PATHS_V29.controllerHash,'utf8');
 return {...sources,compiledRuntimeHash:shaV29(JSON.stringify(manifest)),windowPolicyHash:shaV29(replaceOnceV29(controller,"START=Date.parse('2026-10-19T03:00:00Z')","START=Date.parse('2026-10-19T03:00:00Z')+"+(startHour*3600000)))};
}
