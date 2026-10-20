import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {initialMarketV2,initialRunV6,presetBuildV3,advanceRunV6,applyMarketV2,MarketV2WorldSchema,MarketV2ActionSchema,MARKET_V2_RULES} from '../../packages/shared/dist/index.js';
const ids=[1,2,3,4].map(n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`);let serial=100;
const uid=()=>`00000000-0000-4000-8000-${String(++serial).padStart(12,'0')}`;
let w=initialMarketV2(Object.fromEntries(ids.map(id=>{const r=initialRunV6(id);r.paused=true;r.economy.highest.main=10;r.economy.balances.coin='1000000000000';r.economy.balances.iron='100000000';return [id,r];})),0);
const total=(w,k)=>Object.values(w.runs).reduce((s,r)=>s+BigInt(r.economy.balances[k]),0n)+w.book.listings.filter(l=>!l.claimed&&l.status!=='sold'&&l.asset.kind==='resource'&&l.asset.resource===k).reduce((s,l)=>s+BigInt(l.asset.quantity),0n);
const start=total(w,'coin'),materials=total(w,'iron');let fees=0n;
for(let i=0;i<200;i++){
 const seller=ids[i%4],buyer=ids[(i+1)%4],p=String(10001+i*37),act=(who,a)=>{w=applyMarketV2(w,who,a,i*90000000,uid).world;};
 act(seller,{type:'list.resource',resource:'iron',quantity:'1000',price:p,currency:'coin'});fees+=BigInt(MARKET_V2_RULES.listingMilli);const l=w.book.listings.at(-1);
 if(i%3===0){act(seller,{type:'cancel',listingId:l.id});act(seller,{type:'claim',listingId:l.id});}
 else if(i%3===1)act(buyer,{type:'buy',listingId:l.id});
 else {act(buyer,{type:'offer',listingId:l.id,price:p,currency:'coin'});act(seller,{type:'offer.accept',offerId:w.book.offers.at(-1).id});}
 if(w.book.listings.find(x=>x.id===l.id).status==='sold')fees+=BigInt(w.book.trades.at(-1).fee);assert.equal(total(w,'coin')+fees,start);assert.equal(total(w,'iron'),materials);MarketV2WorldSchema.parse(w);
}
for(const resource of ['jade','ruby','protection','legacyCredit'])assert.equal(MarketV2ActionSchema.safeParse({type:'list.resource',resource,quantity:'1000',price:'1000',currency:'coin'}).success,false);
const income=[];
for(const [level,floor,gear] of [[10,9,'starter'],[100,99,'epic9'],[500,499,'epic9'],[1000,999,'epic9']]){
 let run=initialRunV6(ids[0]);run.economy=presetBuildV3(level,'swift',gear);run.economy.highest.main=Math.max(10,floor);run.economy.floor=floor;run.autoAdvance=false;
 const seconds=3600;for(let i=0;i<500;i++){const r=advanceRunV6(run,seconds*1000,1000);run=r.state;if(!r.backlog)break;}
 const coin=Number(BigInt(run.economy.balances.coin))/1000;
 income.push({level,floor,highestMain:Math.max(10,floor),gear,simulatedSeconds:seconds,qualifiedCompleted:run.economy.economicThroughMs===seconds*1000,paused:run.paused,kills:run.killSequence,coin,feeCoin:100000,listingFeeHoursAtThisMeasuredRate:coin>0?100000/coin:null,interpretation:'One-hour realized income in a fixed synthetic build; ratio is not a promise of acquisition time or stationary long-term income.'});
}
const report={version:'market-v2-audit-1',passed:true,cycles:200,trades:w.book.trades.length,coinConservationWithFeeSinks:true,materialConservation:true,feeMilli:String(fees),boundAssetsRejected:true,income,liquidityApproved:false,activationReady:false,limits:'Private-cohort transaction audit and synthetic fixed-build income. Does not validate player demand, legacy-population market liquidity, market concentration, item acquisition/refinement, or campaign90–120days. Listing fee remains provisional at100000Coin, not optimized.'};
await writeFile('docs/plans/hunts-builds/market-v2/audit-results.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
