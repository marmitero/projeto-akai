// Private population experiments, using stats actually recorded by acquired V10 campaigns.
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {initialBossEventsV8,joinBossEventV8,advanceBossEventsV8,heartbeatBossEventV8,leaveBossEventV8,BossEventsV8Schema,DAILY_HP_V8,ECONOMY_V2_ACTIVE,planDailyBossJade,refinementQuoteV5} from '../../packages/shared/dist/index.js';
export const ROOT='docs/plans/hunts-builds/population-v12',START=Date.parse('2026-10-21T18:00:00-03:00');
const sha=b=>createHash('sha256').update(b).digest('hex');
export const uid=n=>`40000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
export async function profiles(){
 const root='docs/plans/hunts-builds/campaign-v10',cert=JSON.parse(await readFile(root+'/results.json','utf8')),result=[];
 for(const file of (await readdir(root+'/samples')).filter(f=>f.endsWith('.json.gz')).sort()){
  const bytes=await readFile(root+'/samples/'+file);assert.equal(cert.rows.find(r=>r.file===file)?.archiveSha256,sha(bytes));
  const c=JSON.parse(gunzipSync(bytes));
  for(const day of [c.rows.find(r=>r.highest.main>=100)?.day,10,30,120]){
   assert.ok(day);const row=c.rows[day-1];assert.ok(row.highest.main>=100);
   result.push({file,archiveSha256:sha(bytes),day,level:row.level,highestFloor:row.highest.main,stats:row.stats});
  }
 }
 return result;
}
export function advance(state,to,budget=30){let r;do{r=advanceBossEventsV8(state,to,budget);state=r.state;}while(r.backlog);return state;}
export function member(profile,index,options={}){return {id:uid(index+1),owner:'owner-'+index,profile,joinMs:0,leaveMs:null,rejoinMs:null,heartbeatUntilMs:Infinity,...options};}
export function population(members,{durationMs=900000,seed=4213,budget=30,initial=null}={}){
 let state=initial??initialBossEventsV8(START);const origin=state.clockMs,joined=new Set(),left=new Set(),rejoined=new Set();
 // Changes of roster occur on exact boundaries. 10s heartbeats never backfill a missed lease.
 const boundaries=new Set([0,durationMs]);for(let t=10000;t<durationMs;t+=10000)boundaries.add(t);
 for(const m of members)for(const t of [m.joinMs,m.leaveMs,m.rejoinMs])if(t!==null&&t>=0&&t<=durationMs)boundaries.add(t);
 const join=m=>{state=joinBossEventV8(state,{accountId:m.id,name:'Jogador '+m.id.slice(-3),highestFloor:m.profile.highestFloor,suspended:false},'boss',m.profile.stats,1+((seed+Number(m.id.slice(-12)))%4294967294));};
 for(const elapsed of [...boundaries].sort((a,b)=>a-b)){
  state=advance(state,origin+elapsed,budget);
  for(const m of members){
   if(!joined.has(m.id)&&elapsed===m.joinMs){join(m);joined.add(m.id);}
   if(m.leaveMs!==null&&!left.has(m.id)&&elapsed===m.leaveMs){state=leaveBossEventV8(state,m.id);left.add(m.id);}
   if(m.rejoinMs!==null&&!rejoined.has(m.id)&&elapsed===m.rejoinMs){join(m);rejoined.add(m.id);}
   const session=state.sessions[m.id];if(elapsed%10000===0&&session?.active&&session.until>state.clockMs&&elapsed<=m.heartbeatUntilMs)state=heartbeatBossEventV8(state,m.id);
  }
 }
 BossEventsV8Schema.parse(state);return state;
}
export function summarize(name,members,state,durationMs){
 const grants=state.grants.filter(g=>g.kind!=='weekly'),jade=grants.reduce((n,g)=>n+g.amount,0),byKind=Object.fromEntries(['participation','ranking','last-hit'].map(k=>[k,grants.filter(g=>g.kind===k).reduce((n,g)=>n+g.amount,0)]));
 const rows=members.map(m=>{const c=state.daily.members[m.id];return {id:m.id,owner:m.owner,profile:{file:m.profile.file,day:m.profile.day,level:m.profile.level},joinMs:m.joinMs,qualifiedMs:c?.qualifiedMs??0,collectiveDamage:c?.damage??'0',privateContribution:c?.contributionDamage??'0',jade:grants.filter(g=>g.accountId===m.id).reduce((n,g)=>n+g.amount,0),kinds:grants.filter(g=>g.accountId===m.id).map(g=>g.kind)};});
 const owners=Object.fromEntries([...new Set(members.map(m=>m.owner))].sort().map(owner=>[owner,rows.filter(m=>m.owner===owner).reduce((n,m)=>n+m.jade,0)]));
 const totalDamage=Object.values(state.daily.members).reduce((n,m)=>n+BigInt(m.damage),0n);
 assert.equal(totalDamage+BigInt(state.daily.hp),BigInt(state.daily.maxHp));
 assert.equal(new Set(grants.map(g=>g.accountId+'/'+g.key)).size,grants.length);
 assert.ok(grants.filter(g=>g.kind==='last-hit').length<=1);assert.ok(state.broadcasts.length<=1);
 assert.equal(byKind['last-hit'],state.daily.hp===0?250:0);assert.ok(byKind.ranking<=1100);assert.ok(byKind.participation<=members.length*3);
 for(const g of grants)if(g.kind==='participation'){assert.equal(g.amount,3);assert.ok(state.daily.members[g.accountId].qualifiedMs>=600000);}else if(g.kind==='last-hit')assert.equal(g.accountId,state.daily.lastHit);
 assert.ok(jade<=members.length*3+1350);
 return {name,members:members.length,durationMs,maxHp:state.daily.maxHp,hp:state.daily.hp,defeatedAtMs:state.daily.defeatedAt===null?null:state.daily.defeatedAt-START,lastHit:state.daily.lastHit,jade,byKind,qualified:rows.filter(m=>m.kinds.includes('participation')).length,competitiveBefore600PresencePossible:grants.filter(g=>g.kind!=='participation'&&g.at<START+(members.find(m=>m.id===g.accountId)?.joinMs??0)+600000).map(g=>({id:g.accountId,kind:g.kind,atMs:g.at-START,amount:g.amount})),competitiveWithoutParticipation:rows.filter(m=>m.kinds.some(k=>k!=='participation')&&!m.kinds.includes('participation')).map(m=>m.id),largestAccountShare:jade?Math.max(...rows.map(m=>m.jade))/jade:0,ownerJade:owners,largestOwnerShare:jade?Math.max(...Object.values(owners))/jade:0,broadcasts:state.broadcasts,conservationPassed:true,stateSha256:sha(JSON.stringify(state)),rows};
}
export function supplyProjection(populationSize,shards=1){
 assert.ok(Number.isSafeInteger(populationSize)&&populationSize>=0&&Number.isSafeInteger(shards)&&shards>=1);
 // Upper-bound accounting, not combat: every account qualified, each nonempty shard killed with a full top10 if possible.
 let competitive=0;for(let n=0;n<shards;n++){const size=Math.floor(populationSize/shards)+(n<populationSize%shards?1:0);if(size)competitive+=250+Array.from({length:Math.min(10,size)},(_,i)=>200-i*20).reduce((a,b)=>a+b,0);}
 return {populationSize,shards,participation:3*populationSize,competitive,totalDailyJade:3*populationSize+competitive,thirtyDaysJade:30*(3*populationSize+competitive),basis:'Accounting ceiling only: all qualified and every nonempty boss defeated; no combat, turnout, retention or throughput inference'};
}
export async function experiment(){
 assert.equal(ECONOMY_V2_ACTIVE,false);const sourceProfiles=await profiles(),late=sourceProfiles.filter(p=>p.day===120),early=sourceProfiles.filter(p=>p.day<10),middle=sourceProfiles.filter(p=>p.day===30);
 const scenarios=[];const run=(name,members,options={})=>{const state=population(members,options);const result=summarize(name,members,state,options.durationMs??900000);scenarios.push(result);return state;};
 for(const seed of [1,4213,3735928559]){
  run('solo-entry-'+seed,[member(early[4],0)],{seed});
  run('solo-earned-late-'+seed,[member(late[4],0)],{seed});
  run('20-entry-'+seed,Array.from({length:20},(_,i)=>member(early[i%early.length],i)),{seed});
  run('20-earned-late-'+seed,Array.from({length:20},(_,i)=>member(late[i%7],i)),{seed});
 }
 const mixed=Array.from({length:20},(_,i)=>member((i<5?early:i<15?middle:late)[i%7],i,{joinMs:i<5?0:i<15?60000:300000}));
 run('staggered-entry-middle-late',mixed,{durationMs:1300000});
 run('lease-expired',Array.from({length:20},(_,i)=>member(late[i%7],i,{heartbeatUntilMs:0}))); 
 run('leave-and-rejoin',Array.from({length:7},(_,i)=>member(late[i],i,{leaveMs:100000,rejoinMs:500000})),{durationMs:1300000});
 run('10-account-coalition',Array.from({length:20},(_,i)=>member(late[i%7],i,{owner:i<10?'coalition':`independent-${i}`})));
 const hpSensitivity=[];
 for(const maxHp of [1000000000,3500000000,5000000000]){
  const initial=initialBossEventsV8(START);initial.daily.hp=initial.daily.maxHp=maxHp;
  const members=Array.from({length:20},(_,i)=>member(late[i%7],i));
  const state=population(members,{durationMs:1200000,initial});
  hpSensitivity.push(summarize('hypothetical-hp-'+maxHp,members,state,1200000));
 }
 const veterans=Array.from({length:7},(_,i)=>member(late[i],i));
 const reference=run('sniper-reference',veterans,{durationMs:120000});
 assert.notEqual(reference.daily.defeatedAt,null);
 const killAt=reference.daily.defeatedAt-START,sniperTrials=[];
 for(const leadMs of [3500,4500,5500,6500,8500,10500]){
  const joinMs=Math.max(0,Math.floor((killAt-leadMs)/1000)*1000),attacker=member(late[4],19,{joinMs,owner:'timed-late-entry'});
  const group=[...veterans,attacker],state=population(group,{durationMs:120000});
  const trial=summarize('timed-entry-'+leadMs,group,state,120000);sniperTrials.push(trial);
 }
 // Same played event, different polling budget, including a serialized resume.
 const small=veterans.slice(0,2),a=population(small,{durationMs:12000,budget:1}),b=population(small,{durationMs:12000,budget:30});assert.deepEqual(a,b);
 assert.deepEqual(advance(JSON.parse(JSON.stringify(a)),a.clockMs+1000,1),advance(b,b.clockMs+1000,30));
 const projections=[20,100,1000,5000].map(n=>({singleGlobal:supplyProjection(n),independentTwentyMemberCohorts:supplyProjection(n,Math.ceil(n/20))}));
 const accountCap=planDailyBossJade({edition:'boss:2026-10-21',defeated:true,lastHit:uid(1),members:[{accountId:uid(1),name:'Cap',damage:'1',qualifiedSeconds:600,highestFloor:100,suspended:false}]}).grants.reduce((n,g)=>n+g.jade,0);assert.equal(accountCap,453);
 const highRange=await highRangeSensitivity();
 const sourceFiles=['scripts/economy-v2/population.mjs',...(await readdir('packages/shared/src')).filter(f=>f.endsWith('.ts')&&!f.endsWith('.test.ts')).sort().map(f=>'packages/shared/src/'+f)],h=createHash('sha256');for(const file of sourceFiles)h.update(file).update(await readFile(file));
 return {version:'boss-population-v12-1',sourceHash:h.digest('hex'),sourceProfiles,rules:{hp:DAILY_HP_V8,participation:3,qualifiedMs:600000,top10:[200,180,160,140,120,100,80,60,40,20],lastHit:250,maxOneAccountPerEdition:accountCap},scenarios,hpSensitivity,sniperTrials,projections,highRange,integrityPassed:true,populationApproved:false,activationReady:false,
 limits:['Native combat cohorts of1–20; SQL adapter remains limited to20 and is not global sharding','Stats/highest floors are observed daily snapshots from seven acquired V10 simulations, reused as population archetypes; not newly acquired independent accounts or extra wallet grants','Event-only simulation freezes stats and uses exclusive event time; no XP, Coin, offline farming or trade income for the interval, no integrated120day campaign claim','Synthetic owner annotations describe coalition assumptions, not verified identities or an anti-Sybil detector; acquiring and operating multiple developed accounts has a real cost','Timed late-entry trials use hindsight of a deterministic reference death; an adversarial sensitivity test, not a practical success-rate claim','Large-population and30day values are arithmetic ceilings under full qualification and repeated defeat, not measured combat, attendance, server capacity or an inflation forecast','No +16–20 unlock, Ruby, live Jade grant, public account cutover, identity enforcement or boss HP change']};
}

export async function highRangeSensitivity(){
 const file='best-brute-4213.json.gz',raw=await readFile('docs/plans/hunts-builds/campaign-v10/samples/'+file),campaign=JSON.parse(gunzipSync(raw));
 const item=campaign.run.economy.inventory.find(i=>i.rarity==='legendary'&&i.enhancement===15);assert.ok(item);
 const quotes=Array.from({length:20},(_,enhancement)=>refinementQuoteV5({...item,enhancement},enhancement>=7));
 function expectation(cost){let previous=0,total=0,at15=0;for(let i=0;i<20;i++){const p=quotes[i].successPpm/1e6,delta=(cost(i)+(i>=3?(1-p)*previous:0))/p;previous=delta;total+=delta;if(i===14)at15=total;}return total-at15;}
 const jade=expectation(i=>Number(BigInt(quotes[i].cost.jade))/1000),scrolls=expectation(i=>i>=7?1:0);
 return {scope:'Mathematical protected15-to20 hitting-cost expectation using an actually acquired legendary+15 item; unlimited Coin/materials and no income/time/acquisition simulation. Does not unlock the executor or certify rarity/percentiles/completion dates.',sourceFile:file,sourceArchiveSha256:sha(raw),item,available:quotes.slice(15).map(q=>q.available),perfectStreakJade:quotes.slice(15).reduce((n,q)=>n+Number(BigInt(q.cost.jade))/1000,0),expectedJade:jade,expectedScrolls:scrolls,expectedAttempts:expectation(()=>1),jadeCostToIncomeRatios:[3,453].map(perDay=>({perDay,expectedJadeCostDividedByDailyIncome:jade/perDay})),scrollCostDividedByThirtyPerWeek:scrolls/(30/7),interpretation:'Cost-to-income ratios are resource-budget scales, not expected calendar completion times; Jade winnings453/day are not sustainable for every member or guaranteed for one player'};
}
