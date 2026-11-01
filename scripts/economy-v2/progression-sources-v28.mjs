import {readFile,readdir} from 'node:fs/promises';
import {join,relative} from 'node:path';
import {shaV28} from './progression-shadow-v28.mjs';
import {replaceOnceV28} from './progression-adapter-v28.mjs';
export const SOURCE_PATHS_V28=Object.freeze({nativeHash:'packages/shared/dist/economy-run-v6.js',offlineHash:'packages/shared/dist/offline-v7.js',controllerHash:'scripts/economy-v2/campaign-policy.mjs',modelHash:'packages/shared/src/progression-bonus-v26/index.ts',compiledModelHash:'packages/shared/dist/progression-bonus-v26/index.js',compiledBaseModelHash:'packages/shared/dist/progression-bonus-v22/index.js',factoryHash:'scripts/economy-v2/progression-adapter-v28.mjs',observerHash:'scripts/economy-v2/progression-observer-v28.mjs',baseObserverHash:'scripts/economy-v2/progression-trace-v24.mjs',bankSourceHash:'scripts/economy-v2/progression-shadow-v28.mjs',runnerHash:'scripts/economy-v2/run-progression-shadow-v28.mjs',validatorHash:'scripts/economy-v2/progression-evidence-v24.mjs',referenceSourceHash:'scripts/economy-v2/progression-reference-v26.mjs',panelSourceHash:'scripts/economy-v2/progression-panel-v28.mjs',sourcesModuleHash:'scripts/economy-v2/progression-sources-v28.mjs',hypothesisHash:'docs/plans/hunts-builds/progression-envelope-v27/H28.md'});
export async function sourcesV28(startHour){
 const root='packages/shared/dist',paths=[];
 async function visit(dir){for(const e of await readdir(dir,{withFileTypes:true})){if(e.name.startsWith('.'))continue;const p=join(dir,e.name);if(e.isDirectory())await visit(p);else if(e.name.endsWith('.js')&&!e.name.endsWith('.test.js'))paths.push(p);}}
 await visit(root);paths.sort();const manifest=await Promise.all(paths.map(async p=>[relative(root,p),shaV28(await readFile(p))]));
 const sources=Object.fromEntries(await Promise.all(Object.entries(SOURCE_PATHS_V28).map(async([k,p])=>[k,shaV28(await readFile(p))]))),controller=await readFile(SOURCE_PATHS_V28.controllerHash,'utf8');
 return {...sources,compiledRuntimeHash:shaV28(JSON.stringify(manifest)),windowPolicyHash:shaV28(replaceOnceV28(controller,"START=Date.parse('2026-10-19T03:00:00Z')","START=Date.parse('2026-10-19T03:00:00Z')+"+(startHour*3600000)))};
}
