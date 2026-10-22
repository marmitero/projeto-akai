// Acquired-state market experiment. No synthetic wallets, drops or free refinement.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {initialMarketV2,applyMarketV2,syncMarketV2,MarketV2WorldSchema,EconomyRunV6Schema,advanceRunV6,applyEconomyActionV6,refinementQuoteV5,equipmentStats,heroStatsV3,masteryLevel,ITEMS,MARKET_V2_RULES,startCombatV3,advanceCombatV3,towerBossV8,ECONOMY_V2_ACTIVE} from '../../packages/shared/dist/index.js';
export const ROOT='docs/plans/hunts-builds/liquidity-v11',HOUR=3600000;
const currencies=['coin','coal','iron','gold','jade'];
const resources=['coal','iron','gold'];
export const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const owned=e=>[...e.inventory,...e.vault];
const sum=(values)=>values.reduce((a,b)=>a+BigInt(b),0n);
const milli=n=>String(BigInt(Math.max(2,Math.ceil(n))));
function recursivelyRekey(value,from,to){
 if(typeof value==='string')return value.replaceAll(from,to);
 if(Array.isArray(value))return value.map(v=>recursivelyRekey(v,from,to));
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k.replaceAll(from,to),recursivelyRekey(v,from,to)]));
 return value;
}
export function rekeyRun(input,id){
 const source=EconomyRunV6Schema.parse(input),from=source.economy.accountId;
 const run=EconomyRunV6Schema.parse(recursivelyRekey(source,from,id));
 assert.deepEqual(recursivelyRekey(run,id,from),source,'Identity remapping must be exactly reversible');return run;
}
export function totals(world){
 const balances=Object.fromEntries(currencies.map(k=>[k,sum(Object.values(world.runs).map(r=>r.economy.balances[k]))]));
 const items=Object.values(world.runs).flatMap(r=>owned(r.economy));
 for(const l of world.book.listings)if(l.status!=='sold'&&!l.claimed){if(l.asset.kind==='resource')balances[l.asset.resource]+=BigInt(l.asset.quantity);else items.push(l.asset.item);}
 assert.equal(new Set(items.map(i=>i.id)).size,items.length,'One owner or escrow per item');
 return {balances,items:items.map(i=>JSON.stringify(i)).sort(),protection:Object.values(world.runs).reduce((n,r)=>n+r.economy.protection,0)};
}
export function assertConservation(before,after,burn){
 for(const k of currencies)assert.equal(after.balances[k]+(burn[k]??0n),before.balances[k],`${k} conservation including escrow and sinks`);
 assert.deepEqual(after.items,before.items,'Trade preserves complete item identity, quality and refinement');
 assert.equal(after.protection,before.protection,'Bound protection cannot be traded');
}
export function farmOwned(input,activity,floor,duration){
 let run=applyEconomyActionV6(input,{type:'select',activity,floor});run=applyEconomyActionV6(run,{type:'auto',enabled:false});
 const target=run.economy.economicThroughMs+duration;let result,events=0;
 do{result=advanceRunV6(run,target,10000);run=result.state;events+=result.processed;}while(result.backlog);
 return {run:applyEconomyActionV6(run,{type:'pause',paused:true}),events,kills:run.killSequence-input.killSequence,pausedByCombat:run.paused};
}
const itemScore=item=>{const s=equipmentStats(item);return s.attack+s.hp/10+2*(s.physicalDefense+s.magicDefense);};
export function utility(e,item){
 if(masteryLevel(e.masteryMs)<1+(item.level-1)*10)return null;
 const slot=ITEMS[item.definitionId].slot;
 const slots=slot==='ring1'?['ring1','ring2']:[slot];
 let best=null;
 for(const destination of slots){
  const old=e.inventory.find(i=>i.id===e.equipped[destination]);
  const target=Math.min(15,old?.enhancement??9);
  const candidate={...item,enhancement:Math.max(item.enhancement,target)};
  // Two-handed weapon must compensate the actual shield it displaces.
  const shield=ITEMS[item.definitionId].twoHanded?e.inventory.find(i=>i.id===e.equipped.shield):null;
  const baseline=(old?itemScore(old):0)+(shield?itemScore(shield):0);
  const gain=itemScore(candidate)-baseline;
  if(gain>0&&(!best||gain>best.gain))best={slot:destination,target:candidate.enhancement,gain,relativeGain:gain/Math.max(1,baseline)};
 }
 return best;
}
function nextQuote(e){
 const items=e.inventory.filter(i=>Object.values(e.equipped).includes(i.id)&&i.enhancement<15);
 const item=items.sort((a,b)=>a.enhancement-b.enhancement||a.id.localeCompare(b.id))[0];
 return item?{item,quote:refinementQuoteV5(item,item.enhancement>=7&&e.protection>0)}:null;
}
export function reserve(e,purchases=[]){
 const next=nextQuote(e),budget=Object.fromEntries(resources.map(k=>[k,0n]));
 const targets=purchases.length?purchases.map(p=>({item:e.inventory.find(i=>i.id===p.itemId),target:p.target})):next?[{item:next.item,target:Math.min(15,next.item.enhancement+3)}]:[];
 for(const {item,target} of targets)if(item)for(let enhancement=item.enhancement;enhancement<target;enhancement++){
  const q=refinementQuoteV5({...item,enhancement},enhancement>=7);
  for(const k of resources)budget[k]+=BigInt(q.cost[k])*8n;
 }
 return budget;
}
function replayBoss(run){return [1,4213,3735928559].map(seed=>{
 const result=advanceCombatV3(startCombatV3(heroStatsV3(run.economy),[{id:'tower-guardian',stats:towerBossV8(1000).stats}],{seed,floor:1000,deadlineMs:30000}),30000,10000);
 assert.equal(result.backlog,false);return {seed,status:result.state.status,ms:result.state.clockMs};
});}
export async function acquiredInputs(supplyMode='tower'){
 const base='docs/plans/hunts-builds/campaign-v10',files=(await readdir(base+'/samples')).filter(f=>f.endsWith('.json.gz')).sort();
 const report=JSON.parse(await readFile(base+'/results.json','utf8')),inputs=[];
 for(const [index,file] of files.entries()){
  const bytes=await readFile(base+'/samples/'+file),c=JSON.parse(gunzipSync(bytes));
  assert.equal(report.rows.find(r=>r.file===file)?.archiveSha256,sha(bytes));
  const id=`10000000-0000-4000-8000-${String(index+1).padStart(12,'0')}`;
  const run=rekeyRun(c.run,id),initial=structuredClone(run.economy);
  const activity=supplyMode==='specialized'&&index<3?resources[index]:'main';
  const floor=activity==='main'?c.safe.main:Math.max(1,Math.floor(run.economy.highest[activity]*0.7));
  const farm=farmOwned(run,activity,floor,6*HOUR);
  const rates={};
  // Counterfactual one-hour measurements are price references, never credited to the market wallets.
  for(const activity of ['main',...resources]){
   let floor=activity==='main'?c.safe.main:Math.max(c.safe[activity],farm.run.economy.highest[activity]),measured;
   const probes=[];
   do{
    measured=farmOwned(farm.run,activity,floor,HOUR);
    probes.push({floor,kills:measured.kills,pausedByCombat:measured.pausedByCombat});
    if(!measured.pausedByCombat||floor===1)break;
    floor=Math.max(1,Math.floor(floor*0.9));
   }while(true);
   const k=activity==='main'?'coin':activity;
   rates[k]={milli:measured.pausedByCombat?0:Number(BigInt(measured.run.economy.balances[k])-BigInt(farm.run.economy.balances[k])),kills:measured.kills,pausedByCombat:measured.pausedByCombat,floor,probes};
  }
  // Claim only real eligible loot; full backpacks retain the rest in the vault.
  let prepared=farm.run;
  for(const item of [...prepared.economy.vault])if(prepared.economy.inventory.length<120&&masteryLevel(prepared.economy.masteryMs)>=1+(item.level-1)*10)prepared=applyEconomyActionV6(prepared,{type:'claim',itemId:item.id});
  const firstFeeDay=c.rows.find(r=>BigInt(r.balances.coin)>=BigInt(MARKET_V2_RULES.listingMilli))?.day??null;
  inputs.push({file,archiveSha256:sha(bytes),id,originalId:c.run.economy.accountId,initial,run:prepared,rates,firstFeeDay,farm:{activity,floor,durationMs:6*HOUR,events:farm.events,kills:farm.kills,pausedByCombat:farm.pausedByCombat,coinEarnedMilli:String(BigInt(prepared.economy.balances.coin)-BigInt(initial.balances.coin)),earnedMilli:Object.fromEntries(currencies.map(k=>[k,String(BigInt(prepared.economy.balances[k])-BigInt(initial.balances[k]))])),newItems:owned(prepared.economy).length-owned(initial).length},campaign:{grossCoinMilli:c.gross.coin,spentCoinMilli:c.spent.coin,endingCoinMilli:initial.balances.coin},brute:c.build==='brute'});
 }
 assert.equal(inputs.length,7);return inputs;
}
export function runMarket(inputs,multiplier){
 const startAt=Math.max(...inputs.map(i=>i.run.economy.economicThroughMs));
 let world=initialMarketV2(Object.fromEntries(inputs.map(i=>[i.id,i.run])),startAt),serial=0;
 const uid=()=>`20000000-0000-4000-8000-${String(++serial).padStart(12,'0')}`;
 const opening=totals(world),burn=Object.fromEntries(currencies.map(k=>[k,0n]));
 const metrics={multiplier,attempted:0,listed:0,resourceTrades:0,itemTrades:0,offered:0,feeBlocked:0,unaffordable:0,noUtility:0,refinements:0,refinementOutcomes:{},refinementSpentMilli:Object.fromEntries(currencies.map(k=>[k,'0'])),scrollsConsumed:0,expired:0,listingFeeMilli:'0',saleTaxMilli:'0',grossVolumeMilli:'0',paidBuyerIds:[],itemPurchases:[],resourcePurchases:[],bruteBefore:replayBoss(inputs.find(i=>i.brute).run)};
 const act=(who,action,now=startAt)=>{
  const before=totals(world),n=world.book.trades.length;
  const result=applyMarketV2(world,who,action,now,uid);world=result.world;
  const local={};
  if(action.type.startsWith('list.')){local.coin=BigInt(MARKET_V2_RULES.listingMilli);metrics.listingFeeMilli=String(BigInt(metrics.listingFeeMilli)+local.coin);}
  if(world.book.trades.length>n){const trade=world.book.trades.at(-1);local.coin=(local.coin??0n)+BigInt(trade.fee);metrics.saleTaxMilli=String(BigInt(metrics.saleTaxMilli)+BigInt(trade.fee));metrics.grossVolumeMilli=String(BigInt(metrics.grossVolumeMilli)+BigInt(trade.price));metrics.paidBuyerIds.push(trade.buyer);}
  assertConservation(before,totals(world),local);for(const k of currencies)burn[k]+=local[k]??0n;return result.listingId;
 };
 function list(seller,action){metrics.attempted++;if(BigInt(world.runs[seller].economy.balances.coin)<BigInt(MARKET_V2_RULES.listingMilli)){metrics.feeBlocked++;return null;}const id=act(seller,action);metrics.listed++;return world.book.listings.find(l=>l.id===id);}
 function purchase(buyer,listing,willingness){
  const budget=BigInt(world.runs[buyer].economy.balances.coin)/20n;
  const ceiling=BigInt(milli(willingness));
  const ask=BigInt(listing.price),payment=ask<=ceiling?ask:ceiling;
  if(payment>budget){metrics.unaffordable++;return false;}
  // Seller accepts a 20% discount at most; fees and opportunity price remain sunk.
  if(payment*100n<ask*80n){metrics.noUtility++;return false;}
  if(payment<ask){act(buyer,{type:'offer',listingId:listing.id,price:String(payment),currency:'coin'});metrics.offered++;act(listing.seller,{type:'offer.accept',offerId:world.book.offers.at(-1).id});}
  else act(buyer,{type:'buy',listingId:listing.id});return true;
 }
 // Retained real loot only. Buyers evaluate equal-refinement potential, not just current +0 stats.
 for(const seller of inputs){
  const e=world.runs[seller.id].economy;
  const candidates=e.inventory.filter(i=>!Object.values(e.equipped).includes(i.id)).sort((a,b)=>itemScore(b)-itemScore(a)).slice(0,20-world.book.listings.filter(l=>l.seller===seller.id&&l.status==='active').length);
  for(const item of candidates){
   // A seller keeps loot that would improve its own equal-refinement equipment.
   if(utility(world.runs[seller.id].economy,item))continue;
   const buyers=inputs.filter(i=>i.id!==seller.id).map(i=>({input:i,utility:utility(world.runs[i.id].economy,item)})).filter(x=>x.utility&&!metrics.itemPurchases.some(p=>p.buyer===x.input.id&&p.slot===x.utility.slot)).sort((a,b)=>b.utility.relativeGain-a.utility.relativeGain||a.input.id.localeCompare(b.input.id));
   if(!buyers.length){metrics.noUtility++;continue;}
   const ask=milli(Number(MARKET_V2_RULES.listingMilli)/0.9+seller.rates.coin.milli/24*multiplier);
   const listing=list(seller.id,{type:'list.item',itemId:item.id,price:ask,currency:'coin'});if(!listing)continue;
   for(const {input:buyer,utility:u} of buyers){
    // At most one hour of measured Coin farming, scaled by the projected useful improvement.
    const willingness=buyer.rates.coin.milli*Math.min(1,u.relativeGain*4);
    if(purchase(buyer.id,listing,willingness)){metrics.itemTrades++;metrics.itemPurchases.push({buyer:buyer.id,itemId:item.id,target:u.target,slot:u.slot,projectedGain:u.gain,price:world.book.trades.at(-1).price});break;}
   }
  }
 }
 // Material purchases follow actual item purchases, funding those upgrade plans first.
 for(const resource of resources)for(const buyer of inputs){
  const e=world.runs[buyer.id].economy,wanted=reserve(e,metrics.itemPurchases.filter(p=>p.buyer===buyer.id))[resource]-BigInt(e.balances[resource]);if(wanted<=0n)continue;
  let deficit=wanted;
  for(const seller of inputs.filter(i=>i.id!==buyer.id)){
   const se=world.runs[seller.id].economy,available=BigInt(se.balances[resource])-reserve(se,metrics.itemPurchases.filter(p=>p.buyer===seller.id))[resource];if(available<=0n||deficit<=0n)continue;
   const quantity=available<deficit?available:deficit;
   const sellerRate=seller.rates[resource].milli,buyerRate=buyer.rates[resource].milli;if(!sellerRate||!buyerRate)continue;
   const opportunity=Number(quantity)*seller.rates.coin.milli/sellerRate;
   const ask=milli(opportunity*multiplier+Number(MARKET_V2_RULES.listingMilli)/0.9);
   const listing=list(seller.id,{type:'list.resource',resource,quantity:String(quantity),price:ask,currency:'coin'});if(!listing)continue;
   const willingness=Number(quantity)*buyer.rates.coin.milli/buyerRate;
   if(purchase(buyer.id,listing,willingness)){metrics.resourceTrades++;metrics.resourcePurchases.push({buyer:buyer.id,seller:seller.id,resource,quantity:String(quantity),price:world.book.trades.at(-1).price});deficit-=quantity;}
  }
 }
 // First reconcile market conservation independently; then perform actual paid RNG upgrades.
 assertConservation(opening,totals(world),burn);
 const beforeRefine=totals(world);
 for(const input of inputs){
  let run=world.runs[input.id];
  const purchases=metrics.itemPurchases.filter(p=>p.buyer===input.id);
  const targets=purchases.length?purchases.map(p=>({id:p.itemId,target:p.target,slot:p.slot})):[];
  // Existing armour +9 -> +12 creates a concrete material sink; no +16 bypass.
  if(!targets.length){const next=nextQuote(run.economy);if(next)targets.push({id:next.item.id,target:Math.min(15,next.item.enhancement+3),slot:null});}
  for(const target of targets)for(let attempt=0;attempt<100;attempt++){
   const item=run.economy.inventory.find(i=>i.id===target.id);if(!item||item.enhancement>=target.target)break;
   const protect=item.enhancement>=7&&run.economy.protection>0;
   // Never risk breaking acquired gear merely to manufacture test volume.
   if(item.enhancement>=7&&!protect)break;
   const q=refinementQuoteV5(item,protect);if(!q.available||currencies.some(k=>BigInt(run.economy.balances[k])<BigInt(q.cost[k])))break;
   const previous=run.economy;run=applyEconomyActionV6(run,{type:'refine',itemId:item.id,protect});metrics.refinements++;
   metrics.scrollsConsumed+=previous.protection-run.economy.protection;
   const outcome=run.log.at(-1).text;metrics.refinementOutcomes[outcome]=(metrics.refinementOutcomes[outcome]??0)+1;
   for(const k of currencies){const spent=BigInt(previous.balances[k])-BigInt(run.economy.balances[k]);assert.equal(spent,BigInt(q.cost[k]));metrics.refinementSpentMilli[k]=String(BigInt(metrics.refinementSpentMilli[k])+spent);}
  }
  for(const target of targets.filter(t=>t.slot)){
   const item=run.economy.inventory.find(i=>i.id===target.id);
   // Projected potential is not enough: equip only when the actual paid result improves the current gear.
   if(item){const actual=utility(run.economy,{...item});const old=run.economy.inventory.find(i=>i.id===run.economy.equipped[target.slot]);const shield=ITEMS[item.definitionId].twoHanded?run.economy.inventory.find(i=>i.id===run.economy.equipped.shield):null;
    if(actual&&itemScore(item)>(old?itemScore(old):0)+(shield?itemScore(shield):0)){
     if(target.slot==='ring1')run=applyEconomyActionV6(run,{type:'unequip',slot:'ring1'});
     run=applyEconomyActionV6(run,{type:'equip',itemId:item.id});
    }
   }
  }
  world.runs[input.id]=run;
 }
 const afterRefine=totals(world);
 for(const k of currencies)assert.equal(afterRefine.balances[k]+BigInt(metrics.refinementSpentMilli[k]),beforeRefine.balances[k]);
 assert.equal(afterRefine.protection+metrics.scrollsConsumed,beforeRefine.protection);
 const unrefined=items=>items.map(i=>{const x=JSON.parse(i);delete x.enhancement;return JSON.stringify(x);}).sort();
 assert.deepEqual(unrefined(afterRefine.items),unrefined(beforeRefine.items));
 // Expiry/claim proves unsold real assets return exactly; fees remain burned, no invented buyback.
 world=syncMarketV2(world,startAt+73*HOUR);
 const beforeClaims=totals(world);
 for(const l of world.book.listings.filter(l=>l.status==='expired'&&!l.claimed)){act(l.seller,{type:'claim',listingId:l.id},startAt+73*HOUR);metrics.expired++;}
 assertConservation(beforeClaims,totals(world),{});MarketV2WorldSchema.parse(world);
 metrics.paidBuyerIds=[...new Set(metrics.paidBuyerIds)];
 metrics.sellThrough=metrics.listed?(metrics.resourceTrades+metrics.itemTrades)/metrics.listed:0;
 metrics.openingCoinMilli=String(opening.balances.coin);metrics.endingCoinMilli=String(totals(world).balances.coin);
 metrics.marketBurnShare=Number(BigInt(metrics.listingFeeMilli)+BigInt(metrics.saleTaxMilli))/Number(opening.balances.coin);
 metrics.volumeToOpeningCoin=Number(BigInt(metrics.grossVolumeMilli))/Number(opening.balances.coin);
 const concentration=key=>{const volumes=inputs.map(i=>sum(world.book.trades.filter(t=>t[key]===i.id).map(t=>t.price)));const total=sum(volumes);return total?Number(volumes.reduce((a,b)=>a>b?a:b,0n))/Number(total):0;};
 metrics.largestBuyerVolumeShare=concentration('buyer');metrics.largestSellerVolumeShare=concentration('seller');
 const walletShare=w=>Number(Object.values(w.runs).map(r=>BigInt(r.economy.balances.coin)).reduce((a,b)=>a>b?a:b,0n))/Number(totals(w).balances.coin);
 metrics.largestEndingWalletShare=walletShare(world);
 metrics.bruteAfter=replayBoss(world.runs[inputs.find(i=>i.brute).id]);
 metrics.bruteActualEquipment=world.runs[inputs.find(i=>i.brute).id].economy.inventory.filter(i=>Object.values(world.runs[inputs.find(i=>i.brute).id].economy.equipped).includes(i.id));
 metrics.endingBalancesMilli=Object.fromEntries(inputs.map(i=>[i.id,world.runs[i.id].economy.balances]));
 metrics.purchasedItemResults=metrics.itemPurchases.map(p=>({buyer:p.buyer,target:p.target,item:owned(world.runs[p.buyer].economy).find(i=>i.id===p.itemId),equipped:Object.values(world.runs[p.buyer].economy.equipped).includes(p.itemId)}));
 metrics.equippedPurchasedItems=metrics.itemPurchases.filter(p=>Object.values(world.runs[p.buyer].economy.equipped).includes(p.itemId)).length;
 metrics.conservationPassed=true;metrics.finalWorldSha256=sha(JSON.stringify(world));
 return {metrics,world};
}
export async function experiment(){
 assert.equal(ECONOMY_V2_ACTIVE,false);const inputs=await acquiredInputs();
 const specializedInputs=await acquiredInputs('specialized');
 const scenarios=[0.25,1,4].map(multiplier=>runMarket(inputs,multiplier).metrics);
 const sourceFiles=['scripts/economy-v2/liquidity.mjs',...(await readdir('packages/shared/src')).filter(f=>f.endsWith('.ts')&&!f.endsWith('.test.ts')).sort().map(f=>'packages/shared/src/'+f)];
 const source=createHash('sha256');for(const f of sourceFiles)source.update(f).update(await readFile(f));
 return {version:'acquired-liquidity-v11-1',sourceHash:source.digest('hex'),campaignSourceHash:JSON.parse(await readFile('docs/plans/hunts-builds/campaign-v10/results.json','utf8')).sourceHash,
 rules:MARKET_V2_RULES,accounts:inputs.map(({run,initial,rates,...i})=>({...i,rates,openingBalancesMilli:initial.balances,preparedBalancesMilli:run.economy.balances})),
 scenarios,specialized:{scope:'Independent alternative of the same seven acquired wallets; first three produce coal/iron/gold for six hours, other four farm tower; never combine alternative worlds or their money',accounts:specializedInputs.map(({run,initial,rates,...i})=>({...i,rates,openingBalancesMilli:initial.balances,preparedBalancesMilli:run.economy.balances})),scenarios:[0.25,1,4].map(m=>runMarket(specializedInputs,m).metrics)},integrityPassed:true,liquidityApproved:false,activationReady:false,
 limits:['Seven reidentified independent end-of-campaign worlds, not a sampled coupled population or trade-assisted campaign','Six additional hours of real farming, tower-only or specialized material supply; deaths stop farming, no item or money is granted','One-hour forked Coin/material measurements price opportunity cost; failed probes retreat by 10% until one hour survives, diagnostic earnings never enter wallets','Finite eight-quotes-per-level material demand/reserves for bought-item targets or three next equipped levels, 5% wallet purchase cap; ask multipliers and utility are policy hypotheses, not discovered player preferences','Trading observation with paused characters; 73h book expiry is not credited as farm, XP or offline presence','No replacement/refarming/price discovery after expiry; no infinite buyer or NPC market maker','Endgame slices do not validate early-game entry, population, P95 fill time, real inflation or long-run sink equilibrium','+16–20, Jade population, public consumer cutover and monetization remain disabled']};
}
