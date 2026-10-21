// Acquired campaigns: all state mutations go through the same public pure transitions as the game.
import assert from 'node:assert/strict';
import {initialRunV6,advanceRunV6,applyEconomyActionV6,beginOfflineV7,drainOfflineV7,masteryLevel,heroStatsV3,equipmentStats,attributeBudget,attributeCap,attributeCost,usedAttributePoints,ATTRIBUTE_WEIGHT,refinementQuoteV5,ITEMS,initialBossEventsV8,advanceBossEventsV8,joinBossEventV8,heartbeatBossEventV8,leaveBossEventV8,bossWeekV8,ECONOMY_V2_ACTIVE} from '../../packages/shared/dist/index.js';
export const DAY=86400000,START=Date.parse('2026-10-19T03:00:00Z');
const currencies=['coin','coal','iron','gold','jade'];
const account='00000000-0000-4000-8000-000000000001';
export function initialCampaign({seed=4213,schedule='best',build='swift'}={}){
 assert.ok(['best','regular','casual'].includes(schedule));assert.ok(['swift','balanced','brute'].includes(build));assert.equal(ECONOMY_V2_ACTIVE,false);
 return {version:'acquired-campaign-v10-1',seed,schedule,build,run:initialRunV6(account,START,seed),events:null,delivered:[],day:0,
  gross:Object.fromEntries(currencies.map(k=>[k,'0'])),spent:Object.fromEntries(currencies.map(k=>[k,'0'])),actions:{train:0,equip:0,salvage:0,refine:0},refinements:{success:0,maintained:0,regressed:0,destroyed:0},
  drops:{common:0,uncommon:0,rare:0,epic:0,legendary:0},earnedScrolls:0,spentScrolls:0,activeFarmMs:0,offlineMs:0,eventMs:0,idleMs:0,attackEvents:0,defeats:0,timeouts:0,firstMaxDay:null,firstTower1000Day:null,milestones:{},rows:[],
  failed:{},lastExplore:{main:0,coal:0,iron:0,gold:0},safe:{main:1,coal:1,iron:1,gold:1},proof:{},need:null};
}
const now=c=>c.run.economy.economicThroughMs;
function reconcile(c,before,kind){
 for(const k of currencies){const d=BigInt(c.run.economy.balances[k])-BigInt(before.balances[k]);if(d>=0n)c.gross[k]=String(BigInt(c.gross[k])+d);else{assert.notEqual(kind,'farm');c.spent[k]=String(BigInt(c.spent[k])-d);}}
 const d=c.run.economy.protection-before.protection;if(d>=0)c.earnedScrolls+=d;else c.spentScrolls-=d;
}
function act(c,action){const before=c.run.economy;c.run=applyEconomyActionV6(c.run,action);reconcile(c,before,'action');if(action.type in c.actions)c.actions[action.type]++;
 if(action.type==='refine'){const outcome=c.run.log.at(-1).text.split(': ')[1];assert.ok(outcome in c.refinements);c.refinements[outcome]++;}}
function logs(c,after){for(const l of after.log.filter(l=>l.id>c.run.logSequence)){
 const win=/^Vitória (main|coal|iron|gold) (\d+)/.exec(l.text);if(win){const key=win[1]+'/'+win[2];c.proof[key]=(c.proof[key]??0)+1;if(c.proof[key]>=3)c.safe[win[1]]=Math.max(c.safe[win[1]],+win[2]);}
 if(l.text.startsWith('Derrota'))c.defeats++;if(l.text.startsWith('Tempo esgotado'))c.timeouts++;
 }}
export function farm(c,to,offline=false){const before=c.run.economy,startTime=now(c),wasPaused=c.run.paused,known=new Set([...before.inventory,...before.vault].map(i=>i.id));let r,settled=0;
 if(offline){c.run=beginOfflineV7(c.run,to);do{r=drainOfflineV7(c.run,10000);logs(c,r.state);c.run=r.state;c.attackEvents+=r.processed;c.offlineMs+=r.settledMs;settled+=r.settledMs;}while(r.backlog);}
 else{const activity=c.run.economy.activity,start=now(c);do{r=advanceRunV6(c.run,to,10000);logs(c,r.state);c.run=r.state;c.attackEvents+=r.processed;}while(r.backlog);if(activity!=='main')c.materialMsToday=(c.materialMsToday??0)+to-start;}
 reconcile(c,before,'farm');
 for(const item of [...c.run.economy.inventory,...c.run.economy.vault])if(!known.has(item.id))c.drops[item.rarity]++;
 if(offline)c.idleMs+=to-startTime-settled;else{const idle=wasPaused?to-startTime:c.run.paused?to-c.run.log.at(-1).at:0;c.idleMs+=idle;c.activeFarmMs+=to-startTime-idle;}
 recordMilestones(c);
}
const score=i=>{const s=equipmentStats(i);return s.attack+s.hp/10+2*(s.physicalDefense+s.magicDefense);};
export function manage(c){
 let e=c.run.economy,level=masteryLevel(e.masteryMs);
 for(const item of [...e.vault]){if(c.run.economy.inventory.length>=120)break;if(level>=1+(item.level-1)*10)act(c,{type:'claim',itemId:item.id});}
 e=c.run.economy;
 // Keep the strongest available items per slot (rings need two). No imaginary replacements or future drops.
 const candidates=e.inventory.filter(i=>level>=1+(i.level-1)*10).sort((a,b)=>score(b)-score(a)||a.id.localeCompare(b.id));
 for(const i of candidates){e=c.run.economy;let slot=ITEMS[i.definitionId].slot;if(slot==='ring1')slot=score(e.inventory.find(x=>x.id===e.equipped.ring1)??{definitionId:'ring',rarity:'common',level:1,enhancement:0,qualityBp:9000})<=score(e.inventory.find(x=>x.id===e.equipped.ring2)??{definitionId:'ring',rarity:'common',level:1,enhancement:0,qualityBp:9000})?'ring1':'ring2';
  const old=e.inventory.find(x=>x.id===e.equipped[slot]);if(Object.values(e.equipped).includes(i.id)||old&&score(old)>=score(i))continue;
  if(ITEMS[i.definitionId].twoHanded)continue;
  if(slot==='ring1'||slot==='ring2'){if(e.equipped[slot])act(c,{type:'unequip',slot});}
  act(c,{type:'equip',itemId:i.id});
 }
 e=c.run.economy;for(const i of [...e.inventory])if(!Object.values(c.run.economy.equipped).includes(i.id))act(c,{type:'salvage',itemId:i.id,confirmed:true});
 // Weighted allocation uses only the current earned point budget; each point is purchased separately.
 const weights=c.build==='swift'?{force:1,vitality:1,agility:4,physical:.25,magic:.25,luck:.5,dexterity:1}:c.build==='brute'?{force:5,vitality:2,agility:.25,physical:1,magic:.5,luck:1,dexterity:1}:{force:3,vitality:2,agility:1,physical:1,magic:1,luck:.5,dexterity:1};
 c.need=null;
 for(let n=0;n<200;n++){
  e=c.run.economy;const available=attributeBudget(level)-usedAttributePoints(e);
  const eligible=Object.keys(weights).filter(k=>ATTRIBUTE_WEIGHT[k]<=available&&e.attributes[k]<attributeCap(k,level)).sort((a,b)=>e.attributes[a]*ATTRIBUTE_WEIGHT[a]/weights[a]-e.attributes[b]*ATTRIBUTE_WEIGHT[b]/weights[b]||a.localeCompare(b));
  if(!eligible.length)break;const k=eligible[0],cost=attributeCost(k,e.attributes[k]+1),missing=currencies.find(x=>BigInt(cost[x])>BigInt(e.balances[x]));
  if(missing){c.need={resource:missing,amount:cost[missing]};break;}
  act(c,{type:'train',attribute:k});
 }
 // Early gear +3 is safe; later permanent-looking gear can reach +7, and +8–15 only with earned protection.
 e=c.run.economy;
 const items=e.inventory.filter(i=>Object.values(e.equipped).includes(i.id)).sort((a,b)=>a.enhancement-b.enhancement||score(b)-score(a));
 for(const old of items){let i=c.run.economy.inventory.find(x=>x.id===old.id);if(!i)continue;
  const target=i.level<10?3:i.level<50?7:ITEMS[i.definitionId].slot==='weapon'&&level>=800?15:9;
  if(i.enhancement>=target)continue;const protect=i.enhancement>=7;if(protect&&!c.run.economy.protection)continue;
  const q=refinementQuoteV5(i,protect),missing=currencies.find(k=>BigInt(q.cost[k])>BigInt(c.run.economy.balances[k]));
  if(missing){if(!c.need&&missing!=='coin')c.need={resource:missing,amount:q.cost[missing]};continue;}
  act(c,{type:'refine',itemId:i.id,protect});
 }
}
function select(c,activity,floor,auto){if(c.run.autoAdvance!==auto)act(c,{type:'auto',enabled:auto});if(c.run.paused||c.run.economy.activity!==activity||c.run.economy.floor!==floor)act(c,{type:'select',activity,floor});}
export function policy(c){
 const e=c.run.economy,t=now(c),level=masteryLevel(e.masteryMs);
 const last=c.run.log.at(-1);
 if(c.run.paused&&last&&/^(Derrota|Tempo esgotado)/.test(last.text)&&last.id>(c.observedFailureLog??0)){c.observedFailureLog=last.id;c.failed[e.activity]=last.at;c.safe[e.activity]=Math.max(1,Math.min(c.safe[e.activity],e.floor-2));if(e.activity==='main'&&c.safe.main%10===0)c.safe.main--;}
 let activity=c.need&&c.need.resource!=='coin'&&e.highest.main>=(c.need.resource==='gold'?20:5)?c.need.resource:'main';
 const activeHours=c.schedule==='casual'?2:c.schedule==='regular'?16:24;
 if((c.materialMsToday??0)>=activeHours*3600000/4)activity='main';
 if(c.failed[activity]&&t-c.failed[activity]<6*3600000&&e.highest[activity]===0)activity='main';
 const canExplore=!c.failed[activity]||t-c.failed[activity]>=6*3600000;
 const goal=activity==='main'?Math.min(level+8,1000):1000;
 if(canExplore&&e.highest[activity]<goal){c.lastExplore[activity]=t;
  if(e.activity===activity&&c.run.autoAdvance&&!c.run.paused)return;
  select(c,activity,Math.min(1000,e.highest[activity]+1),true);return;
 }
 let floor=Math.max(1,e.highest[activity]-(c.failed[activity]&&t-c.failed[activity]<6*3600000?2:0));
 if(activity==='main'&&floor%10===0)floor--;
 select(c,activity,Math.max(1,floor),false);
}
export function weekly(c){
 if(c.run.economy.highest.main<1)return;
 const week=bossWeekV8(now(c));if(c.milestones['weekly:'+week])return;
 let book=c.events??initialBossEventsV8(now(c)),r;
 do{r=advanceBossEventsV8(book,now(c));book=r.state;}while(r.backlog);
 book=joinBossEventV8(book,{accountId:account,name:'Campanha',highestFloor:c.run.economy.highest.main,suspended:false},'protection',heroStatsV3(c.run.economy),c.run.seed);
 const start=now(c);c.run.encounter=null;
 for(let n=0;n<200&&book.weekly[account]?.delivered!==6;n++){
  r=advanceBossEventsV8(book,book.clockMs+10000);assert.equal(r.backlog,false);book=heartbeatBossEventV8(r.state,account);
 }
 book=leaveBossEventV8(book,account);const before=structuredClone(c.run.economy);
 for(const g of book.grants)if(!c.delivered.includes(g.key)){assert.equal(g.kind,'weekly');c.run.economy.protection+=g.amount;c.delivered.push(g.key);}
 c.run.economy.economicThroughMs=book.clockMs;c.run.nextAt=book.clockMs+3000;reconcile(c,before,'farm');
 c.events=book;c.eventMs+=now(c)-start;c.milestones['weekly:'+week]=(now(c)-START)/DAY;
 assert.equal(book.weekly[account].delivered,6);
}
function recordMilestones(c){const e=c.run.economy,level=masteryLevel(e.masteryMs),day=(now(c)-START)/DAY;
 for(const n of [10,50,100,200,500,800,1000])if(level>=n)c.milestones['level'+n]??=day;
 if(level===1000)c.firstMaxDay??=day;if(e.highest.main===1000)c.firstTower1000Day??=day;
}
export function snapshot(c){recordMilestones(c);const e=c.run.economy,level=masteryLevel(e.masteryMs),day=(now(c)-START)/DAY;
 assert.equal(c.activeFarmMs+c.offlineMs+c.eventMs+c.idleMs,now(c)-START,'exclusive elapsed time');
 for(const k of currencies)assert.equal(BigInt(c.gross[k])-BigInt(c.spent[k]),BigInt(e.balances[k]),k+' reconciliation');assert.equal(c.earnedScrolls-c.spentScrolls,e.protection);
 return {day,level,highest:{...e.highest},masteryMs:e.masteryMs,balances:{...e.balances},attributes:{...e.attributes},stats:heroStatsV3(e),equipment:e.inventory.filter(i=>Object.values(e.equipped).includes(i.id)),protection:e.protection,defeats:c.defeats,timeouts:c.timeouts};
}
export function campaignDay(c){const end=START+(c.day+1)*DAY,activeHours=c.schedule==='casual'?2:c.schedule==='regular'?16:24,activeEnd=START+c.day*DAY+activeHours*3600000;
 c.materialMsToday=0;weekly(c);
 while(now(c)<activeEnd){manage(c);policy(c);farm(c,Math.min(activeEnd,now(c)+300000));}
 manage(c);
 if(c.schedule!=='best'){
  // Offline earns only on a floor demonstrated by at least three wins; no progression while absent.
  let a=c.run.economy.activity,safe=c.safe[a];
  if((c.proof[a+'/'+safe]??0)<3){a='main';safe=c.safe.main;}
  if((c.proof[a+'/'+safe]??0)>=3)select(c,a,safe,false);else act(c,{type:'pause',paused:true});
  farm(c,activeEnd+8*3600000,true);
 }
 if(now(c)<end){act(c,{type:'pause',paused:true});farm(c,end);}
 c.day++;const row=snapshot(c);c.rows.push(row);return row;
}
