import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {initialRunV6,advanceRunV6,applyEconomyActionV6,masteryLevel} from '../../packages/shared/dist/index.js';
let run=initialRunV6('00000000-0000-4000-8000-000000000006'),ticks=0,attemptedAt=-100;
const moments={};
const act=a=>{try{run=applyEconomyActionV6(run,a);return true;}catch{return false;}};
for(;ticks<720;ticks++){
 const to=run.economy.economicThroughMs+10000;
 for(let i=0;i<100;i++){const r=advanceRunV6(run,to,1000);run=r.state;if(!r.backlog)break;}
 assert.ok(run.economy.masteryMs<=run.economy.economicThroughMs,'Mastery cannot outrun qualified time');
 // Explicit early-game policy: Coin-only levels1..9, starter gear only, no borrowed resources or Ruby.
 for(let j=0;j<10;j++){const k=run.economy.attributes.force<=run.economy.attributes.vitality*2?'force':'vitality';if(run.economy.attributes[k]>=9||!act({type:'train',attribute:k}))break;}
 for(const k of ['main','coal','iron'])if(run.economy.highest[k]>=(k==='main'?5:1))moments[k]??=run.economy.economicThroughMs/1000;
 if(moments.coal&&moments.iron)break;
 if(run.paused){act({type:'auto',enabled:false});const safe=Math.max(1,run.economy.highest.main-(run.economy.highest.main%10===0?1:0));act({type:'select',activity:'main',floor:safe});}
 if(ticks-attemptedAt>=30){attemptedAt=ticks;
  if(run.economy.highest.main>=5&&!moments.coal)act({type:'select',activity:'coal',floor:1});
  else if(run.economy.highest.main>=5&&!moments.iron)act({type:'select',activity:'iron',floor:1});
  else {act({type:'auto',enabled:true});act({type:'select',activity:'main',floor:Math.min(1000,run.economy.highest.main+1)});}
 }
}
assert.ok(moments.main&&moments.coal&&moments.iron,'Starter policy must reach coal and iron without milestone materials');assert.equal(run.economy.balances.jade,'0');
const report={passed:true,fixture:'One deterministic starter policy, seed4213, at most2h simulated. No Ruby, no refino, no equipping loot, only Coin-only force/vitality training levels1..9. Not a campaign cohort or90–120day certification.',momentsSeconds:moments,final:{level:masteryLevel(run.economy.masteryMs),highest:run.economy.highest,attributes:run.economy.attributes,balances:run.economy.balances,masteryMs:run.economy.masteryMs,simulatedMs:run.economy.economicThroughMs}};
await writeFile('docs/plans/hunts-builds/r6/audit-results.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
