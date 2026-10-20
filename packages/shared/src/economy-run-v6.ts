import {z} from 'zod';
import {EconomyV2Schema,initialEconomyV2,masteryLevel,ECONOMY_XP_V2,canEquipV2,type EconomyV2} from './economy-v2.js';
import {CombatV3Schema,startCombatV3,advanceCombatV3,hitChancePpm,attackDamageV3,type CombatStatsV3} from './combat-v3.js';
import {heroStatsV3,trainAttribute,ATTRIBUTE_IDS} from './builds-v3.js';
import {presetBuildV3} from './build-presets-v3.js';
import {encounterEnemies,enemyDefinition} from './bestiary.js';
import {commonEnemyV3} from './enemies-v3.js';
import {huntEnemyV4} from './hunts-v4.js';
import {refineItemV5} from './refinement-v5.js';
import {planTowerProtectionV5} from './protection-v5.js';
import {ITEMS,ITEM_IDS,RARITIES,floorDefinition,SLOT_IDS} from './content.js';
const time=z.number().int().nonnegative().safe();
const Log=z.object({id:time,at:time,text:z.string()});
export const EconomyRunV6Schema=z.object({version:z.literal('economy-run-v6-1'),economy:EconomyV2Schema,seed:z.number().int().min(1).max(4294967295),
 sequence:time,killSequence:time,xpCarry:time.max(999999),paused:z.boolean(),autoAdvance:z.boolean(),nextAt:time,
 encounter:z.object({id:time,activity:z.enum(['main','coal','iron','gold']),floor:time.min(1).max(1000),wave:time.min(1).max(3),combatMs:time,reference:time.min(1).max(1000),combat:CombatV3Schema,rewarded:z.array(z.string()).max(3)}).nullable(),
 log:z.array(Log).max(60),logSequence:time,
}).strict();
export type EconomyRunV6=z.infer<typeof EconomyRunV6Schema>;
export type EconomyEntropyV6=(key:string,bound:number)=>number;
function draw(s:EconomyRunV6,key:string,bound:number,entropy?:EconomyEntropyV6){
 if(entropy){const n=entropy(key,bound);z.number().int().min(0).max(bound-1).parse(n);return n;}
 const limit=Math.floor(4294967296/bound)*bound;let x=s.seed;do{x^=x<<13;x^=x>>>17;x^=x<<5;x>>>=0;}while(x>=limit);s.seed=x;return x%bound;
}
function log(s:EconomyRunV6,at:number,text:string){s.log.push({id:++s.logSequence,at,text});if(s.log.length>60)s.log.shift();}
export function initialRunV6(accountId:string,at=0,seed=4213):EconomyRunV6{return EconomyRunV6Schema.parse({version:'economy-run-v6-1',economy:initialEconomyV2(accountId,at),seed,sequence:0,killSequence:0,xpCarry:0,paused:false,autoAdvance:true,nextAt:at,encounter:null,log:[],logSequence:0});}
function enemies(activity:EconomyV2['activity'],floor:number,wave:number){
 if(activity!=='main'){const h=huntEnemyV4(activity,floor);return [{id:h.id,stats:h.stats}];}
 if(floor%10===0){const b=floorDefinition(floor);return [{id:'tower-guardian',stats:{attack:b.attack,maxHp:b.hp,physicalDefense:0,magicDefense:0,intervalMs:b.interval,dexterity:0,evasion:floor,criticalPpm:0,physicalShareBp:10000}}];}
 return encounterEnemies(floor,wave).map((t,i)=>({id:`enemy-${i}-${t.id}`,stats:commonEnemyV3(floor,t.id).stats}));
}
const benchmarkCache=new Map<string,number>(),heroCache=new Map<number,CombatStatsV3>();
function benchmark(level:number,activity:EconomyV2['activity'],floor:number){
 const key=`${level}/${activity}/${floor}`;if(benchmarkCache.has(key))return benchmarkCache.get(key)!;
 if(!heroCache.has(level)){if(heroCache.size>=128)heroCache.delete(heroCache.keys().next().value!);heroCache.set(level,heroStatsV3(presetBuildV3(level,'swift','epic9')));}
 const hero=heroCache.get(level)!,waves=activity==='main'&&floor%10!==0?3:1,reference=activity==='main'?floor:huntEnemyV4(activity,floor).reference;
 let ms=0;
 for(let wave=1;wave<=waves;wave++)for(const e of enemies(activity,floor,wave)){
  const normal=BigInt(Math.min(e.stats.maxHp,attackDamageV3(hero,e.stats,reference,false))),critical=BigInt(Math.min(e.stats.maxHp,attackDamageV3(hero,e.stats,reference,true)));
  const expected=(normal*BigInt(100000-hero.criticalPpm)+critical*BigInt(hero.criticalPpm))*BigInt(hitChancePpm(hero,e.stats));
  const attempts=(BigInt(e.stats.maxHp)*10000000000n+expected-1n)/expected;ms+=Number(attempts)*hero.intervalMs;
 }
 if(benchmarkCache.size>=512)benchmarkCache.delete(benchmarkCache.keys().next().value!);benchmarkCache.set(key,ms);return ms;
}
/** Integrate every level boundary, fixed micro-ms carry. Never credits walking/losses. */
function mastery(s:EconomyRunV6,combatMs:number,activity:EconomyV2['activity'],floor:number,reference:number){
 let budget=BigInt(combatMs)*1000000n,earned=0;
 while(budget>0n&&s.economy.masteryMs<ECONOMY_XP_V2[999]!){
  const level=masteryLevel(s.economy.masteryMs),cap=benchmark(level,activity,floor);
  const numerator=BigInt(Math.min(reference*reference,level*level))*BigInt(Math.min(combatMs,cap)),denominator=BigInt(level*level)*BigInt(combatMs);
  const need=BigInt(ECONOMY_XP_V2[level]!-s.economy.masteryMs)*1000000n-BigInt(s.xpCarry),raw=(need*denominator+numerator-1n)/numerator;
  if(budget>=raw){budget-=raw;earned+=ECONOMY_XP_V2[level]!-s.economy.masteryMs;s.economy.masteryMs=ECONOMY_XP_V2[level]!;s.xpCarry=0;}
  else {const credit=budget*numerator/denominator+BigInt(s.xpCarry),ms=Number(credit/1000000n);earned+=ms;s.economy.masteryMs+=ms;s.xpCarry=Number(credit%1000000n);break;}
 }
 if(s.economy.masteryMs===ECONOMY_XP_V2[999])s.xpCarry=0;return earned;
}
function grant(s:EconomyRunV6,key:keyof EconomyV2['balances'],amount:bigint){s.economy.balances[key]=String(BigInt(s.economy.balances[key])+amount);}
function loot(s:EconomyRunV6,enemyId:string,at:number,entropy?:EconomyEntropyV6){
 const encounter=s.encounter!;s.killSequence++;const key=`kill/${s.killSequence}`;
 if(encounter.activity!=='main'){const h=huntEnemyV4(encounter.activity,encounter.floor);grant(s,encounter.activity,BigInt(h.material)*1000n);log(s,at,`+${h.material} ${encounter.activity}`);return;}
 const boss=encounter.floor%10===0;
 const template=enemyId.replace(/^enemy-\d+-/,'');const coin=enemyDefinition(encounter.floor,template).coin;
 const x=BigInt(Math.max(0,encounter.floor-100));const reward=BigInt(coin)*1000n*900n**2n/(900n**2n+3n*x*x);grant(s,'coin',reward);log(s,at,`+${Number(reward)/1000} Coin`);
 const scroll=planTowerProtectionV5({accountId:s.economy.accountId,killId:key,activity:'main',floor:encounter.floor,defeated:true,roll:draw(s,key+'/scroll',1000000,entropy)}).amount;s.economy.protection+=scroll;if(scroll)log(s,at,'+1 pergaminho');
 // Existing boss anchors are bridged unchanged. Common drops provide renewable legendary items.
 const chance=boss?Math.min(200000,100000+(Math.floor(encounter.floor/10)-1)*1000):5000;
 if(draw(s,key+'/drop',1000000,entropy)>=chance)return;
 const weights=boss?[500000-Math.min(100000,(Math.floor(encounter.floor/10)-1)*1000),320000,150000+Math.min(100000,(Math.floor(encounter.floor/10)-1)*1000),28000,2000]:encounter.floor>=100?[740000,200000,50000,6000,4000]:[800000,170000,30000,0,0];
 let r=draw(s,key+'/rarity',1000000,entropy),index=0;while(index<4&&r>=weights[index]!){r-=weights[index]!;index++;}
 const item={id:`${s.economy.accountId}/loot/${s.killSequence}`,origin:'tower' as const,definitionId:ITEM_IDS[draw(s,key+'/base',ITEM_IDS.length,entropy)]!,rarity:RARITIES[index]!,level:Math.ceil(encounter.floor/10),enhancement:0,qualityBp:9000+draw(s,key+'/quality',2001,entropy)};
 (s.economy.inventory.length<120?s.economy.inventory:s.economy.vault).push(item);log(s,at,`Equipamento: ${item.definitionId} ${item.rarity}${s.economy.inventory.length>=120?' · confira mochila/cofre':''}`);
}
function start(s:EconomyRunV6,at:number,wave=1,hp?:number,entropy?:EconomyEntropyV6){
 const previous=s.encounter,activity=s.economy.activity,floor=s.economy.floor;
 const id=wave===1?++s.sequence:previous!.id,reference=activity==='main'?floor:huntEnemyV4(activity,floor).reference;
 const combat=startCombatV3(wave===1?heroStatsV3(s.economy):previous!.combat.actors[0]!.stats,enemies(activity,floor,wave),{seed:1+draw(s,`fight/${id}/${wave}`,4294967295,entropy),floor:reference,at,...(activity!=='main'||floor%10===0?{deadlineMs:at+30000}:{})});
 if(hp!==undefined)combat.actors[0]!.hp=Math.min(hp,combat.actors[0]!.stats.maxHp);
 s.encounter={id,activity,floor,wave,combatMs:wave===1?0:previous!.combatMs,reference,combat,rewarded:[]};
}
/** Bounded event work; backlog returns a preserved cursor, never credits skipped time. */
export function advanceRunV6(input:EconomyRunV6,toMs:number,maxEvents=1000,entropy?:EconomyEntropyV6){
 const s=EconomyRunV6Schema.parse(input);time.parse(toMs);z.number().int().min(1).max(100000).parse(maxEvents);
 if(toMs<s.economy.economicThroughMs)throw Error('ECONOMY_CLOCK_REWIND');let processed=0;
 // Recover active snapshots saved by R6 before the tower-boss deadline fix.
 const saved=s.encounter;
 if(saved&&saved.activity==='main'&&saved.floor%10===0&&saved.combat.status==='fighting'&&saved.combat.deadlineMs===null){
  if(saved.combatMs>=30000){s.paused=true;s.encounter=null;s.nextAt=s.economy.economicThroughMs+3000;log(s,s.economy.economicThroughMs,`Tempo esgotado main ${saved.floor} · encontro antigo`);}
  else saved.combat.deadlineMs=saved.combat.clockMs-saved.combatMs+30000;
 }
 while(s.economy.economicThroughMs<toMs){
  if(s.paused){s.economy.economicThroughMs=toMs;break;}
  if(processed>=maxEvents){s.economy.revision++;return {state:s,backlog:true,processed};}
  if(!s.encounter){if(s.nextAt>=toMs){s.economy.economicThroughMs=toMs;break;}start(s,Math.max(s.nextAt,s.economy.economicThroughMs),1,undefined,entropy);}
  const e=s.encounter!,before=e.combat.clockMs,r=advanceCombatV3(e.combat,toMs,Math.min(32,maxEvents-processed));e.combat=r.state;e.combatMs+=r.state.clockMs-before;processed+=r.processed;s.economy.economicThroughMs=r.state.clockMs;
  for(const actor of e.combat.actors.slice(1))if(actor.hp===0&&!e.rewarded.includes(actor.id)){e.rewarded.push(actor.id);loot(s,actor.id,e.combat.hits.filter(h=>h.target===actor.id&&h.damage>0).at(-1)!.at,entropy);}
  if(r.backlog){if(processed<maxEvents)continue;s.economy.revision++;return {state:EconomyRunV6Schema.parse(s),backlog:true,processed};}
  if(e.combat.status==='fighting')break;
  const at=e.combat.clockMs;
  if(e.combat.status==='victory'&&e.activity==='main'&&e.floor%10!==0&&e.wave<3){s.nextAt=at+3000;const hp=e.combat.actors[0]!.hp;
   // Preserve the completed wave while walking, so the next read cannot start wave1 again.
   if(s.nextAt>=toMs){s.economy.economicThroughMs=toMs;break;}
   start(s,s.nextAt,e.wave+1,hp,entropy);continue;
  }
  if(e.combat.status==='victory'){
   const gained=mastery(s,e.combatMs,e.activity,e.floor,e.reference);s.economy.highest[e.activity]=Math.max(s.economy.highest[e.activity],e.floor);log(s,at,`Vitória ${e.activity} ${e.floor} · XP ${gained}ms`);
   if(s.autoAdvance&&e.floor<1000){let next=e.floor+1;if(e.activity==='main'&&next%10===0&&next<=s.economy.highest.main)next=next<1000?next+1:e.floor;s.economy.floor=next;}
   // Already cleared bosses can never be farmed again.
   else if(e.activity==='main'&&e.floor%10===0)s.economy.floor=Math.max(1,e.floor-1);
  }else {log(s,at,`${e.combat.status==='timeout'?'Tempo esgotado':'Derrota'} ${e.activity} ${e.floor}`);s.paused=true;}
  s.encounter=null;s.nextAt=at+3000;
 }
 s.economy.revision++;return {state:EconomyRunV6Schema.parse(s),backlog:false,processed};
}
export const EconomyActionV6Schema=z.discriminatedUnion('type',[
 z.object({type:z.literal('select'),activity:z.enum(['main','coal','iron','gold']),floor:time.min(1).max(1000)}).strict(),
 z.object({type:z.literal('pause'),paused:z.boolean()}).strict(),z.object({type:z.literal('auto'),enabled:z.boolean()}).strict(),
 z.object({type:z.literal('train'),attribute:z.enum(ATTRIBUTE_IDS)}).strict(),
 z.object({type:z.literal('refine'),itemId:z.string(),protect:z.boolean()}).strict(),
 z.object({type:z.literal('equip'),itemId:z.string()}).strict(),z.object({type:z.literal('unequip'),slot:z.enum(SLOT_IDS)}).strict(),
 z.object({type:z.literal('claim'),itemId:z.string()}).strict(),z.object({type:z.literal('salvage'),itemId:z.string(),confirmed:z.boolean()}).strict(),
]);
export type EconomyActionV6=z.infer<typeof EconomyActionV6Schema>;
export function applyEconomyActionV6(input:EconomyRunV6,inputAction:EconomyActionV6,entropy?:EconomyEntropyV6){
 const s=EconomyRunV6Schema.parse(input),a=EconomyActionV6Schema.parse(inputAction),e=s.economy;
 if(a.type==='select'){
  if(a.activity!=='main'&&e.highest.main<(a.activity==='gold'?20:5))throw Error('HUNT_LOCKED');
  if(a.floor>e.highest[a.activity]+1)throw Error('FLOOR_NOT_UNLOCKED');
  if(a.activity==='main'&&a.floor%10===0&&a.floor<=e.highest.main)throw Error('BOSS_NOT_REPEATABLE');
  e.activity=a.activity;e.floor=a.floor;s.encounter=null;s.nextAt=e.economicThroughMs+3000;s.paused=false;
 }else if(a.type==='pause'){s.paused=a.paused;if(a.paused){s.encounter=null;s.nextAt=e.economicThroughMs+3000;}}
 else if(a.type==='auto')s.autoAdvance=a.enabled;
 else if(a.type==='train')s.economy=trainAttribute(e,a.attribute).state;
 else if(a.type==='refine'){const result=refineItemV5(e,{itemId:a.itemId,expectedRevision:e.revision,protect:a.protect},1+draw(s,`refine/${e.revision}`,4294967295,entropy));s.economy=result.state;log(s,e.economicThroughMs,`Refino: ${result.receipt.outcome}`);}
 else if(a.type==='equip'){
  if(!canEquipV2(e,a.itemId))throw Error('ITEM_LEVEL_OR_LOCATION');const item=e.inventory.find(i=>i.id===a.itemId)!;let slot=ITEMS[item.definitionId].slot;if(slot==='ring1'&&e.equipped.ring1!==null&&e.equipped.ring1!==item.id)slot='ring2';
  for(const previous of SLOT_IDS)if(e.equipped[previous]===item.id)e.equipped[previous]=null;
  e.equipped[slot]=item.id;if(ITEMS[item.definitionId].twoHanded)e.equipped.shield=null;
 }else if(a.type==='unequip')e.equipped[a.slot]=null;
 else if(a.type==='claim'){
  if(e.inventory.length>=120)throw Error('INVENTORY_FULL');const i=e.vault.findIndex(i=>i.id===a.itemId);if(i<0)throw Error('ITEM_NOT_AVAILABLE');if(masteryLevel(e.masteryMs)<1+(e.vault[i]!.level-1)*10)throw Error('ITEM_LEVEL_NOT_UNLOCKED');e.inventory.push(e.vault.splice(i,1)[0]!);
 }else if(a.type==='salvage'){
  const item=e.inventory.find(i=>i.id===a.itemId);if(!item||Object.values(e.equipped).includes(a.itemId))throw Error('ITEM_NOT_AVAILABLE');
  if((RARITIES.indexOf(item.rarity)>=2||item.enhancement>0)&&!a.confirmed)throw Error('CONFIRM_REQUIRED');
  const mult=[100n,115n,135n,175n,225n][RARITIES.indexOf(item.rarity)]!;grant(s,'coin',BigInt(Math.max(1,Number(BigInt(item.level)*mult/200n)))*1000n);e.inventory=e.inventory.filter(i=>i.id!==item.id);
 }
 s.economy.revision++;return EconomyRunV6Schema.parse(s);
}
