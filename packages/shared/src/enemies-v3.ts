import { z } from 'zod';
import { enemyDefinition,enemyTemplate,ENEMY_IDS } from './bestiary.js';
import { CombatStatsV3Schema,type CombatStatsV3 } from './combat-v3.js';
/** V3 common enemies only. Legacy definitions and bosses remain unchanged. */
export function commonEnemyV3(floor:number,id:typeof ENEMY_IDS[number]){
  z.number().int().min(1).max(1000).parse(floor);z.enum(ENEMY_IDS).parse(id);
  if(floor%10===0)throw Error('BOSS_CONTENT_RESERVED');
  const t=enemyTemplate(id)!;if(floor<t.minFloor)throw Error('ENEMY_NOT_UNLOCKED');
  const d=enemyDefinition(floor,id),x=BigInt(Math.max(0,floor-100)),den=900n;
  const ceil=(a:bigint,b:bigint)=>Number((a+b-1n)/b);
  const magicalFamilies:Record<string,number>={Shadow:10000,Inquisitor:7000,Mushroom:2500,'Owlet Monster':5000};
  const magic=floor>=11?(magicalFamilies[t.family]??0):0;
  // Evasion expressed in tenths, avoiding floor/10 float variation in probability thresholds.
  const evasion=floor+(floor%3===1?1200:0);
  const stats:CombatStatsV3=CombatStatsV3Schema.parse({
    attack:ceil(BigInt(d.attack)*(den**3n+25n*x**3n),den**3n),
    maxHp:ceil(BigInt(d.hp)*(den**2n+2n*x*x),den**2n),physicalDefense:0,magicDefense:0,
    intervalMs:d.interval,dexterity:0,evasion,criticalPpm:0,physicalShareBp:10000-magic,
  });
  return {id,name:t.name,role:t.role,style:t.role==='ranged'||magic>=7000?'ranged' as const:'melee' as const,stats};
}
