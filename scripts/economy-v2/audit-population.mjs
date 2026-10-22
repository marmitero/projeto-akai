import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {experiment,ROOT} from './population.mjs';
const report=await experiment(),path=ROOT+'/results.json';
if(process.argv.includes('--verify'))assert.deepEqual(JSON.parse(await readFile(path,'utf8')),report);
else await writeFile(path,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({integrityPassed:true,populationApproved:false,activationReady:false,scenarios:report.scenarios.map(s=>({name:s.name,killedMs:s.defeatedAtMs,jade:s.jade,qualified:s.qualified,ownerShare:s.largestOwnerShare})),sniperLastHits:report.sniperTrials.filter(s=>s.lastHit===s.rows.at(-1).id).length}));
