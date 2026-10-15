// Versioned local content: icons are identities, never wearable animation rigs.
export const SLOT_IDS = [
  "weapon",
  "shield",
  "chest",
  "head",
  "hands",
  "feet",
  "neck",
  "ring1",
  "ring2",
] as const;
export const ITEM_IDS = [
  "sword",
  "dagger",
  "axe",
  "mace",
  "greatsword",
  "spear",
  "bow",
  "shield",
  "armor",
  "hat",
  "gloves",
  "boots",
  "pendant",
  "ring",
] as const;
export const RARITIES = [
  "common",
  "uncommon",
  "rare",
  "epic",
  "legendary",
] as const;
export type ItemId = (typeof ITEM_IDS)[number];
export type Slot = (typeof SLOT_IDS)[number];
export type Rarity = (typeof RARITIES)[number];
export const RARITY = {
  common: { label: "Comum", bp: 10000, affixes: 0 },
  uncommon: { label: "Incomum", bp: 11500, affixes: 1 },
  rare: { label: "Raro", bp: 13500, affixes: 2 },
  epic: { label: "Épico", bp: 17000, affixes: 3 },
  legendary: { label: "Lendário", bp: 22000, affixes: 4 },
} as const;
export const ITEMS: Record<
  ItemId,
  {
    name: string;
    slot: Slot;
    twoHanded: boolean;
    attack: number;
    hp: number;
    defense: number;
  }
> = {
  sword: {
    name: "Espada do reino",
    slot: "weapon",
    twoHanded: false,
    attack: 6,
    hp: 0,
    defense: 0,
  },
  dagger: {
    name: "Adaga de ferro",
    slot: "weapon",
    twoHanded: false,
    attack: 5,
    hp: 1,
    defense: 0,
  },
  axe: {
    name: "Machado de batalha",
    slot: "weapon",
    twoHanded: false,
    attack: 7,
    hp: 0,
    defense: 0,
  },
  mace: {
    name: "Maça das galerias",
    slot: "weapon",
    twoHanded: false,
    attack: 6,
    hp: 1,
    defense: 0,
  },
  greatsword: {
    name: "Arma de duas mãos",
    slot: "weapon",
    twoHanded: true,
    attack: 10,
    hp: 0,
    defense: 0,
  },
  spear: {
    name: "Lança da guarda",
    slot: "weapon",
    twoHanded: false,
    attack: 6,
    hp: 1,
    defense: 0,
  },
  bow: {
    name: "Arco do bosque",
    slot: "weapon",
    twoHanded: true,
    attack: 9,
    hp: 0,
    defense: 0,
  },
  shield: {
    name: "Escudo do reino",
    slot: "shield",
    twoHanded: false,
    attack: 0,
    hp: 3,
    defense: 2,
  },
  armor: {
    name: "Veste do aprendiz",
    slot: "chest",
    twoHanded: false,
    attack: 0,
    hp: 5,
    defense: 1,
  },
  hat: {
    name: "Chapéu do aprendiz",
    slot: "head",
    twoHanded: false,
    attack: 0,
    hp: 2,
    defense: 1,
  },
  gloves: {
    name: "Luvas do aprendiz",
    slot: "hands",
    twoHanded: false,
    attack: 1,
    hp: 1,
    defense: 1,
  },
  boots: {
    name: "Botas do aprendiz",
    slot: "feet",
    twoHanded: false,
    attack: 0,
    hp: 3,
    defense: 1,
  },
  pendant: {
    name: "Colar do reino",
    slot: "neck",
    twoHanded: false,
    attack: 2,
    hp: 2,
    defense: 0,
  },
  ring: {
    name: "Anel do reino",
    slot: "ring1",
    twoHanded: false,
    attack: 1,
    hp: 1,
    defense: 0,
  },
};
export const AFFIX_IDS = [
  "might",
  "vigor",
  "guard",
  "prospector",
  "industry",
] as const;
export const AFFIX_LABELS = {
  might: "Força",
  vigor: "Vigor",
  guard: "Proteção",
  prospector: "Prospecção",
  industry: "Indústria",
} as const;
export const SLOT_LABELS: Record<Slot, string> = {
  weapon: "Arma",
  shield: "Escudo",
  chest: "Peitoral",
  head: "Cabeça",
  hands: "Mãos",
  feet: "Pés",
  neck: "Colar",
  ring1: "Anel 1",
  ring2: "Anel 2",
};
export const CONTENT = {
  version: "local-rpg-1",
  maxFloor: 1000,
  maxUpgrade: 1000,
  bagCapacity: 120,
  maxItemLevel: 100,
  maxEnhancement: 20,
  maxPetLevel: 100,
  dropCommonBp: 50,
  dropBossBaseBp: 1000,
  dropBossCapBp: 2000,
} as const;
export const levelFromXp = (xp: number): number =>
  Math.min(1000, 1 + Math.floor(Math.sqrt(xp / 100)));
// F1–20 intentionally retain F3 stats. Polynomial continuation is bounded and auditable.
export function floorDefinition(floor: number) {
  if (!Number.isInteger(floor) || floor < 1 || floor > CONTENT.maxFloor)
    throw Error("INVALID_FLOOR");
  const boss = floor % 10 === 0;
  const factor = 1 + (floor - 20) / 20;
  const hp =
    floor <= 20
      ? Math.ceil(18 * 1.12 ** (floor - 1))
      : Math.ceil(156 * factor * factor);
  const attack =
    floor <= 20
      ? Math.ceil(2 * 1.1 ** (floor - 1))
      : Math.ceil(13 * (1 + (floor - 20) / 40));
  const coin =
    floor <= 20
      ? Math.ceil(3 * 1.1 ** (floor - 1))
      : Math.ceil(19 * factor * factor);
  return {
    id: `tower-${floor}`,
    floor,
    biome: "forest" as const,
    boss,
    waves: boss ? 1 : 3,
    count: boss ? 1 : 3,
    hp: hp * (boss ? 8 : 1),
    attack: attack * (boss ? 2 : 1),
    coin: coin * (boss ? 15 : 1),
    interval: boss ? 1800 : 2000,
  };
}
export const FLOOR_CATALOG = Array.from({ length: CONTENT.maxFloor }, (_, i) =>
  floorDefinition(i + 1),
);
