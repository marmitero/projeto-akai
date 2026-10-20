import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {REFINEMENT_SUCCESS_PPM_V5 as P,REFINEMENT_BREAK_PPM_V5 as B,refinementQuoteV5,refinementOutcomeV5,initialEconomyV2} from '../../packages/shared/dist/index.js';
const contract=JSON.parse(await readFile('docs/plans/hunts-builds/contracts/economy-v2.json','utf8'));
const historical=JSON.parse(await readFile('docs/plans/hunts-builds/curve-analysis.json','utf8'));
assert.deepEqual(P.slice(0,15),historical.probabilities.slice(0,15).map(x=>Math.round(x*1e6)));
assert.deepEqual(P.slice(15),contract.refinement.highSuccessPpm);assert.deepEqual(B,historical.conditionalBreak.map(x=>Math.round(x*1e6)));
assert.equal(contract.protection.consumedOnSuccess,true);assert.equal(contract.protection.minimumTarget,8);assert.equal(contract.refinement.highRangeEnabled,false);
const template={...initialEconomyV2('00000000-0000-4000-8000-000000000001',0).inventory[0],level:100,rarity:'legendary'};
const quotes=Array.from({length:20},(_,n)=>refinementQuoteV5({...template,enhancement:n},n>=7));
// Birth/death chain for ALWAYS protected targets8+, unlimited supply. Safe failures1..3 stay.
let previous=0,cumulative=0;const expectation=P.map((ppm,i)=>{const p=ppm/1e6,q=1-p;const toNext=i<3?1/p:(1+q*previous)/p;previous=toNext;cumulative+=toNext;return {target:i+1,expectedAdditionalAttempts:toNext,expectedAttemptsFromZero:cumulative};});
const scenarios=[];
for(const jadePerDay of [3,453])for(const weeklyScrolls of [30,40]){
 const population=512,results=[];
 for(let account=0;account<population;account++){
  let seed=(0x6a09e667^(account+1)*2654435761)>>>0;if(!seed)seed=1;
  const roll=()=>{let x;do{x=seed;x^=x<<13;x^=x>>>17;x^=x<<5;seed=x>>>0;}while(seed>=4294000000);return seed%1000000;};
  let enhancement=0,jade=0,scrolls=0,attempts=0,highest=0,first20Day=null;
  for(let day=1;day<=120;day++){
   jade+=jadePerDay;if((day-1)%7===0)scrolls+=weeklyScrolls;
   while(enhancement<20){
    const q=quotes[enhancement],jadeCost=Number(BigInt(q.cost.jade)/1000n),protect=enhancement>=7;
    if(jade<jadeCost||(protect&&scrolls<1))break;
    jade-=jadeCost;if(protect)scrolls--;attempts++;
    const r=refinementOutcomeV5({...template,enhancement},protect,roll(),0);assert.notEqual(r.outcome,'destroyed');enhancement=r.enhancement;highest=Math.max(highest,enhancement);
    if(enhancement===20){first20Day=day;break;}
   }
   if(first20Day!==null)break;
  }
  results.push({highest,attempts,first20Day});
 }
 const reached20=results.filter(r=>r.first20Day!==null).length;
 scenarios.push({jadePerDay,weeklyScrolls,population,reached20,reached20Pct:100*reached20/population,averageAttempts:results.reduce((a,r)=>a+r.attempts,0)/population,highestDistribution:Object.fromEntries([...new Set(results.map(r=>r.highest))].sort((a,b)=>a-b).map(h=>[h,results.filter(r=>r.highest===h).length]))});
}
const report={fixture:'Mathematical high-range sensitivity ONLY; executor still blocks16+. One legendary100 item owned atday1, unlimited Coin/materials/low-range attempts; full weekly scroll budget upfront each Monday, no tower scrolls, always protected8+. Not whole-game cohorts or production approval.',days:120,expectationUnlimitedSupply:expectation,scenarios};
await writeFile('docs/plans/hunts-builds/r5/audit-results.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({scenarios,expectedAttempts20:expectation[19].expectedAttemptsFromZero}));
