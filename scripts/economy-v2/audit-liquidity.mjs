import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {experiment,ROOT} from './liquidity.mjs';
const report=await experiment();
const path=process.argv.find(a=>a.startsWith('--report='))?.slice(9)??ROOT+'/results.json';
if(process.argv.includes('--verify'))assert.deepEqual(JSON.parse(await readFile(path,'utf8')),report);
else await writeFile(path,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({integrityPassed:report.integrityPassed,liquidityApproved:report.liquidityApproved,activationReady:report.activationReady,specialized:report.specialized.scenarios.map(s=>({multiplier:s.multiplier,listed:s.listed,itemTrades:s.itemTrades,resourceTrades:s.resourceTrades,equippedPurchases:s.equippedPurchasedItems,marketBurnShare:s.marketBurnShare})),scenarios:report.scenarios.map(s=>({multiplier:s.multiplier,listed:s.listed,trades:s.itemTrades+s.resourceTrades,sellThrough:s.sellThrough,marketBurnShare:s.marketBurnShare,refinements:s.refinements,equippedPurchases:s.equippedPurchasedItems,bruteWins:s.bruteAfter.filter(r=>r.status==='victory').length}))}));
