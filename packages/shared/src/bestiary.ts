import { floorDefinition } from './content.js';
import { ENEMY_TEMPLATES } from './bestiary-data.js';
export { ENEMY_TEMPLATES } from './bestiary-data.js';
export type EnemyId = typeof ENEMY_TEMPLATES[number]['id'];
export type EnemyRole = typeof ENEMY_TEMPLATES[number]['role'];
export const ENEMY_IDS = ENEMY_TEMPLATES.map(t => t.id) as [EnemyId, ...EnemyId[]];
export const ENEMY_ROLES = {
 fighter: { label: 'Combatente', hp: 10000, attack: 10000, interval: 10000 },
 runner: { label: 'Ágil', hp: 8500, attack: 8000, interval: 8000 },
 brute: { label: 'Brutamontes', hp: 12500, attack: 12000, interval: 12000 },
 tank: { label: 'Tanque', hp: 13500, attack: 9000, interval: 11250 },
 ranged: { label: 'Arqueiro', hp: 9000, attack: 9000, interval: 9000 },
} as const;
export const enemyTemplate = (id?: string) => ENEMY_TEMPLATES.find(t => t.id === id);
/** No RNG consumed: reward RNG sequence and persisted old encounters remain compatible. */
export function encounterEnemies(floor: number, wave = 1) {
 const base = floorDefinition(floor);
 if (base.boss) return [];
 const pool = ENEMY_TEMPLATES.filter(t => t.minFloor <= floor);
 const offset = (floor-1)*7 + (wave-1)*3;
 return Array.from({length:3}, (_,i) => pool[(offset+i)%pool.length]!);
}
export function enemyDefinition(floor: number, id?: string) {
 const base = floorDefinition(floor), template = base.boss ? undefined : enemyTemplate(id);
 if (!template) return {...base, name: base.boss ? 'Guardião da torre' : 'Esqueleto', role: 'fighter' as EnemyRole, xpBp:10000};
 const role = ENEMY_ROLES[template.role];
 // Stable threat budget: 75% durability +25% sustained DPS, independent of rounding.
 const budget = (3*role.hp + 10000*role.attack/role.interval)/40000;
 return {...base, name:template.name, role:template.role,
  hp:Math.max(1,Math.round(base.hp*role.hp/10000)),
  attack:Math.max(1,Math.round(base.attack*role.attack/10000)),
  interval:Math.round(base.interval*role.interval/10000),
  coin:Math.max(1,Math.round(base.coin*budget)), xpBp:Math.round(10000*budget)};
}
