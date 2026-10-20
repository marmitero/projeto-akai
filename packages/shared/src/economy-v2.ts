import { z } from 'zod';
import { ITEM_IDS, ITEMS, RARITIES, SLOT_IDS } from './content.js';
import { ECONOMY_XP_V2 } from './economy-xp-v2.js';
export { ECONOMY_XP_V2 } from './economy-xp-v2.js';
export const ECONOMY_V2_CONFIG = 'economy-v2-config-2' as const;
export const ECONOMY_V2_ACTIVE = false as const;
export const JADE_V2 = Object.freeze({participation:3,seconds:600,minimumFloor:100,lastHit:250,top10:[200,180,160,140,120,100,80,60,40,20] as const});
const integer=z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const amount=z.string().regex(/^(0|[1-9]\d{0,37})$/);
const activity=z.enum(['main','coal','iron','gold']);
export const EconomyItemV2Schema=z.object({
  id:z.string().min(1).max(160), origin:z.enum(['starter','legacy','tower']),
  definitionId:z.enum(ITEM_IDS),rarity:z.enum(RARITIES),level:integer.min(1).max(100),
  enhancement:integer.max(20),qualityBp:integer.min(9000).max(11000),
}).strict().refine(x=>x.enhancement<=15||x.rarity==='legendary','Only legendary supports +16–20');
export const EconomyV2Schema=z.object({
  version:z.literal('economy-v2-1'), configVersion:z.literal(ECONOMY_V2_CONFIG),
  accountId:z.uuid(),revision:integer,masteryMs:integer.max(ECONOMY_XP_V2[999]),
  balances:z.object({coin:amount,coal:amount,iron:amount,gold:amount,jade:amount}).strict(),
  protection:integer,attributes:z.object({force:integer,vitality:integer,agility:integer,physical:integer,magic:integer,luck:integer,dexterity:integer}).strict(),
  activity,highest:z.object({main:integer.max(1000),coal:integer.max(1000),iron:integer.max(1000),gold:integer.max(1000)}).strict(),
  floor:integer.min(1).max(1000),economicThroughMs:integer,
  offline:z.object({day:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),usedMs:integer.max(28800000)}).strict(),
  inventory:z.array(EconomyItemV2Schema).max(120),
  vault:z.array(EconomyItemV2Schema),
  equipped:z.record(z.enum(SLOT_IDS),z.string().nullable()),
}).strict().superRefine((s,ctx)=>{
  const all=[...s.inventory,...s.vault];
  if(new Set(all.map(i=>i.id)).size!==all.length)ctx.addIssue({code:'custom',message:'Duplicate equipment identity'});
  const equipped=Object.values(s.equipped).filter((x):x is string=>x!==null);
  if(new Set(equipped).size!==equipped.length)ctx.addIssue({code:'custom',message:'Equipment in multiple slots'});
  for(const [slot,id] of Object.entries(s.equipped)) {
    if(id===null)continue;
    const item=s.inventory.find(i=>i.id===id);
    if(!item){ctx.addIssue({code:'custom',message:'Equipped item outside inventory'});continue;}
    const expected=ITEMS[item.definitionId].slot;
    if(expected!==slot&&!(expected==='ring1'&&slot==='ring2'))ctx.addIssue({code:'custom',message:'Wrong equipment slot'});
    if(masteryLevel(s.masteryMs)<1+(item.level-1)*10)ctx.addIssue({code:'custom',message:'Equipment level not unlocked'});
    if(slot==='weapon'&&ITEMS[item.definitionId].twoHanded&&s.equipped.shield!==null)ctx.addIssue({code:'custom',message:'Two handed weapon conflicts with shield'});
  }
});
export type EconomyV2 = z.infer<typeof EconomyV2Schema>;
export function masteryLevel(ms:number):number {
  integer.parse(ms);
  let lo=0,hi:number=ECONOMY_XP_V2.length;
  while(lo<hi){const mid=(lo+hi)>>>1;if(ECONOMY_XP_V2[mid]!<=ms)lo=mid+1;else hi=mid;}
  return Math.max(1,lo);
}
export function canEquipV2(s:EconomyV2,id:string):boolean {
  const item=s.inventory.find(i=>i.id===id);
  return !!item && masteryLevel(s.masteryMs)>=1+(item.level-1)*10;
}
export function initialEconomyV2(accountId:string,at:number):EconomyV2 {
  const id=`${accountId}/starter/sword`;
  return EconomyV2Schema.parse({version:'economy-v2-1',configVersion:ECONOMY_V2_CONFIG,accountId,revision:0,masteryMs:0,
    balances:{coin:'0',coal:'0',iron:'0',gold:'0',jade:'0'},protection:0,
    attributes:{force:0,vitality:0,agility:0,physical:0,magic:0,luck:0,dexterity:0},
    activity:'main',highest:{main:0,coal:0,iron:0,gold:0},floor:1,economicThroughMs:at,
    offline:{day:null,usedMs:0},inventory:[{id,origin:'starter',definitionId:'sword',rarity:'common',level:1,enhancement:0,qualityBp:10000}],vault:[],
    equipped:Object.fromEntries(SLOT_IDS.map(slot=>[slot,slot==='weapon'?id:null])),
  });
}
