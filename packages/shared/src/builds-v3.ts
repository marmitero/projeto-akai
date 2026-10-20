import { z } from 'zod';
import { ITEMS,RARITY,SLOT_IDS } from './content.js';
import { EconomyV2Schema,masteryLevel,type EconomyV2,type EconomyItemV2Schema } from './economy-v2.js';
import { ATTACK_INTERVAL_V3 } from './combat-speed-v3.js';
export { ATTACK_INTERVAL_V3 } from './combat-speed-v3.js';
export const ATTRIBUTE_IDS=['force','vitality','agility','physical','magic','luck','dexterity'] as const;
export type AttributeV3=typeof ATTRIBUTE_IDS[number];
export const ATTRIBUTE_WEIGHT:Record<AttributeV3,number>={force:1,vitality:1,agility:5,physical:1,magic:1,luck:1,dexterity:1};
const BASE_COST:Record<AttributeV3,number>={force:100,vitality:80,agility:150,physical:100,magic:100,luck:120,dexterity:90};
export type ItemV2=z.infer<typeof EconomyItemV2Schema>;
const ceilDiv=(a:bigint,b:bigint)=>(a+b-1n)/b;
export function attributeBudget(level:number){return 6*(z.number().int().min(1).max(1000).parse(level)-1);}
export function attributeCap(kind:AttributeV3,level:number){z.enum(ATTRIBUTE_IDS).parse(kind);attributeBudget(level);return kind==='agility'?Math.min(800,Math.ceil(4*(level-1)/5)):1000;}
export function usedAttributePoints(s:EconomyV2){return ATTRIBUTE_IDS.reduce((n,k)=>n+s.attributes[k]*ATTRIBUTE_WEIGHT[k],0);}
export function validateBuild(s:EconomyV2){
  EconomyV2Schema.parse(s);const level=masteryLevel(s.masteryMs);
  if(usedAttributePoints(s)>attributeBudget(level))throw Error('ATTRIBUTE_BUDGET_EXCEEDED');
  for(const k of ATTRIBUTE_IDS)if(s.attributes[k]>attributeCap(k,level))throw Error('ATTRIBUTE_CAP_EXCEEDED');
}
/** Values are integer thousandths, as in the balances/ledger. No float price calculation. */
export function attributeCost(kind:AttributeV3,target:number){
  z.enum(ATTRIBUTE_IDS).parse(kind);z.number().int().min(1).max(kind==='agility'?800:1000).parse(target);
  const power=Math.min(target-1,20),growth=BigInt(Math.max(20,target-1));
  const coin=ceilDiv(BigInt(BASE_COST[kind])*59n**BigInt(power)*growth*growth,50n**BigInt(power)*400n)*1000n;
  const milestone=target%10===0?BigInt(target/10):0n;
  return {coin:coin.toString(),coal:(target>=50?10n*milestone*1000n:0n).toString(),iron:(25n*milestone*1000n).toString(),gold:(target>=200?2n*milestone*1000n:0n).toString(),jade:'0'};
}
/** Pure atomic transition. Rejections leave the caller's state untouched. Future server command IDs gate replay. */
export function trainAttribute(s:EconomyV2,kind:AttributeV3){
  validateBuild(s);z.enum(ATTRIBUTE_IDS).parse(kind);
  const target=s.attributes[kind]+1,level=masteryLevel(s.masteryMs);
  if(target>attributeCap(kind,level)||usedAttributePoints(s)+ATTRIBUTE_WEIGHT[kind]>attributeBudget(level))throw Error('ATTRIBUTE_LIMIT');
  const cost=attributeCost(kind,target);
  for(const k of Object.keys(cost) as (keyof typeof cost)[])if(BigInt(s.balances[k])<BigInt(cost[k]))throw Error('INSUFFICIENT_RESOURCES');
  const next=structuredClone(s);
  for(const k of Object.keys(cost) as (keyof typeof cost)[])next.balances[k]=(BigInt(next.balances[k])-BigInt(cost[k])).toString();
  next.attributes[kind]=target;next.revision++;validateBuild(next);return {state:next,cost};
}
export function equipmentStats(i:ItemV2){
  const d=ITEMS[i.definitionId],r=BigInt(RARITY[i.rarity].bp),l=BigInt(i.level),q=BigInt(i.qualityBp),g=10000n+250n*BigInt(i.enhancement)+15n*BigInt(i.enhancement)**2n;
  const stat=(v:number,defense=false)=>{
    const base=defense?BigInt(v)*l*r/10000n:BigInt(v)*l*l*r*q/100000000n;
    const enhanced=base*g/10000n;
    return Number(i.enhancement>0&&base>0n&&enhanced===base?base+1n:enhanced);
  };
  return {attack:stat(d.attack),hp:stat(d.hp),physicalDefense:stat(d.defense,true),magicDefense:stat(d.defense,true)};
}
export function heroStatsV3(s:EconomyV2){
  validateBuild(s);const level=masteryLevel(s.masteryMs),a=s.attributes;
  let attack=6+2*a.force+2*(level-1),maxHp=100+15*a.vitality+10*(level-1),physicalDefense=2*a.physical,magicDefense=2*a.magic,gearAgilityNumerator=0;
  for(const slot of SLOT_IDS){const id=s.equipped[slot];if(!id)continue;const i=s.inventory.find(i=>i.id===id)!;const p=equipmentStats(i);
    attack+=p.attack;maxHp+=p.hp;physicalDefense+=p.physicalDefense;magicDefense+=p.magicDefense;
    const rarity=['common','uncommon','rare','epic','legendary'].indexOf(i.rarity);
    gearAgilityNumerator+=200*Math.max(0,i.level-70)*Math.max(0,rarity-1)*i.enhancement;
  }
  const gearAgility=Math.min(200,Math.floor(gearAgilityNumerator/16200)),agility=Math.min(1000,a.agility+gearAgility);
  return {attack,maxHp,physicalDefense,magicDefense,intervalMs:ATTACK_INTERVAL_V3[agility]!,dexterity:a.dexterity,evasion:0,criticalPpm:Math.min(45000,5000+40*a.luck),physicalShareBp:10000,gearAgility};
}
