import { initialEconomyV2,ECONOMY_XP_V2,type EconomyV2 } from './economy-v2.js';
import { ATTRIBUTE_IDS,ATTRIBUTE_WEIGHT,attributeBudget,attributeCap,validateBuild } from './builds-v3.js';
export const BUILD_PRESETS={balanced:[3,2,1,1,1,.5,1],swift:[1,1,4,.25,.25,.5,1],brute:[5,2,.25,1,.5,1,1],physical:[2,4,.1,5,.5,.2,1],magic:[2,4,.1,.5,5,.2,1],critical:[3,2,.3,1,1,4,2]} as const;
export type BuildPresetV3=keyof typeof BUILD_PRESETS;
/** Equal point budgets only: fixtures do not claim purchase affordability or real acquisition. */
export function presetBuildV3(level:number,preset:BuildPresetV3,gear:'starter'|'epic9'|'legendary20'='starter'):EconomyV2 {
  if(!Object.hasOwn(BUILD_PRESETS,preset))throw Error('INVALID_BUILD_PRESET');
  const budget=attributeBudget(level),s=initialEconomyV2('00000000-0000-4000-8000-000000000001',0);s.masteryMs=ECONOMY_XP_V2[level-1]!;
  let used=0;
  while(true){const eligible=ATTRIBUTE_IDS.map((k,i)=>({k,i})).filter(({k})=>used+ATTRIBUTE_WEIGHT[k]<=budget&&s.attributes[k]<attributeCap(k,level));
    if(!eligible.length)break;
    eligible.sort((a,b)=>s.attributes[a.k]*ATTRIBUTE_WEIGHT[a.k]/BUILD_PRESETS[preset][a.i]!-s.attributes[b.k]*ATTRIBUTE_WEIGHT[b.k]/BUILD_PRESETS[preset][b.i]!||a.i-b.i);
    const k=eligible[0]!.k;s.attributes[k]++;used+=ATTRIBUTE_WEIGHT[k];
  }
  if(gear!=='starter'){
    const definitions={weapon:'dagger',shield:'shield',chest:'armor',head:'hat',hands:'gloves',feet:'boots',neck:'pendant',ring1:'ring',ring2:'ring'} as const;
    s.inventory=[];
    for(const [slot,definitionId] of Object.entries(definitions)){const id='fixture-'+slot;s.inventory.push({id,origin:'tower',definitionId,rarity:gear==='epic9'?'epic':'legendary',level:1+Math.floor((level-1)/10),enhancement:gear==='epic9'?9:20,qualityBp:10000});s.equipped[slot as keyof typeof s.equipped]=id;}
  }
  validateBuild(s);return s;
}
