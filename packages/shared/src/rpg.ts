import type { LocalSnapshot } from "./index.js";
import {
  ITEMS,
  ITEM_IDS,
  RARITIES,
  RARITY,
  CONTENT,
  AFFIX_IDS,
  levelFromXp,
  type ItemId,
  type Rarity,
  type Slot,
} from "./content.js";
import {
  RpgCommandSchema,
  type RpgCommand,
  type Equipment,
} from "./rpg-schema.js";
export type Cost = Partial<
  Record<"coin" | "iron" | "coal" | "gold" | "jade" | "castIron", number>
>;
const MAX = 10n ** 38n - 1n;
export function addResource(
  s: LocalSnapshot,
  key: "coin" | "iron" | "coal" | "gold" | "jade",
  amount: bigint,
): void {
  const n = BigInt(s.balances[key]) + amount;
  if (n < 0n || n > MAX) throw Error("BALANCE_LIMIT");
  s.balances[key] = String(n);
}
export function canPay(s: LocalSnapshot, cost: Cost): boolean {
  return Object.entries(cost).every(
    ([key, n]) =>
      Number.isSafeInteger(n) &&
      n >= 0 &&
      BigInt(
        key === "castIron"
          ? s.rpg.castIron
          : s.balances[key as keyof typeof s.balances],
      ) >=
        BigInt(n) * 1000n,
  );
}
function pay(s: LocalSnapshot, cost: Cost): boolean {
  if (!canPay(s, cost)) return false;
  for (const [key, n] of Object.entries(cost))
    if (key === "castIron")
      s.rpg.castIron = String(BigInt(s.rpg.castIron) - BigInt(n) * 1000n);
    else
      s.balances[key as keyof typeof s.balances] = String(
        BigInt(s.balances[key as keyof typeof s.balances]) - BigInt(n) * 1000n,
      );
  return true;
}
export function nextRandom(s: LocalSnapshot): number {
  let x = s.rpg.rng;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  s.rpg.rng = x >>> 0;
  return s.rpg.rng;
}
export function rollRarity(boss: boolean, roll: number, floor = 10): Rarity {
  if (!Number.isInteger(roll) || roll < 0 || roll >= 10000)
    throw Error("INVALID_ROLL");
  // More advanced bosses shift at most10 percentage points from common to rare.
  const shift = boss ? Math.min(1000, Math.floor(floor / 10 - 1) * 10) : 0;
  const weights = boss
    ? [5000 - shift, 3200, 1500 + shift, 280, 20]
    : [8000, 1700, 300, 0, 0];
  let sum = 0;
  for (let i = 0; i < weights.length; i++) {
    sum += weights[i]!;
    if (roll < sum) return RARITIES[i]!;
  }
  throw Error("INVALID_TABLE");
}
export function createEquipment(
  s: LocalSnapshot,
  definitionId: ItemId,
  level: number,
  rarity: Rarity,
  random: (max: number) => number = (max) => nextRandom(s) % max,
): Equipment {
  if (s.rpg.nextItemId >= 999999999999999) throw Error("ITEM_ID_LIMIT");
  const d = ITEMS[definitionId],
    bp = RARITY[rarity].bp,
    variation = 9000 + random(2001);
  const scale = (value: number) =>
    Math.floor((value * level * level * bp * variation) / 100000000);
  const a = {
    attack: scale(d.attack),
    hp: scale(d.hp),
    defense: Math.floor((d.defense * level * bp) / 10000),
    miningBp: 0,
    productionBp: 0,
  };
  const pool = [...AFFIX_IDS],
    affixes: Equipment["affixes"] = [];
  for (let i = 0; i < RARITY[rarity].affixes; i++) {
    const index = random(pool.length),
      affix = pool.splice(index, 1)[0]!;
    affixes.push(affix);
    if (affix === "might") a.attack += level * level;
    if (affix === "vigor") a.hp += 2 * level * level;
    if (affix === "guard") a.defense += level;
    if (affix === "prospector") a.miningBp += 500;
    if (affix === "industry") a.productionBp += 500;
  }
  return {
    id: `item-${s.rpg.nextItemId++}`,
    definitionId,
    rarity,
    level,
    enhancement: 0,
    attributes: a,
    affixes,
  };
}
export function gearStats(s: LocalSnapshot) {
  const sum = { attack: 0, hp: 0, defense: 0, miningBp: 0, productionBp: 0 };
  for (const id of Object.values(s.rpg.equipped))
    if (id) {
      const item = s.rpg.inventory.find((i) => i.id === id);
      if (item)
        for (const key of Object.keys(sum) as Array<keyof typeof sum>)
          sum[key] += Math.ceil(
            (item.attributes[key] * (100 + item.enhancement * 5)) / 100,
          );
    }
  return sum;
}
export const itemTierAvailable = (s: LocalSnapshot) =>
  Math.min(100, 1 + Math.floor(s.battle.highest / 10));
export function craftCost(level: number): Cost {
  return level === 1
    ? { iron: 30, coin: 20 }
    : {
        iron: 30 * level * level,
        coin: 20 * level * level,
        coal: 5 * level,
        castIron: 2 * level,
        ...(level >= 10 ? { gold: level } : {}),
        ...(level >= 30 ? { jade: Math.ceil(level / 10) } : {}),
      };
}
export const smeltCost: Cost = { iron: 10, coal: 5 };
export const tonicCost: Cost = { iron: 50, coal: 10, coin: 50 };
export function petCost(s: LocalSnapshot): Cost | undefined {
  const n = s.rpg.petLevel;
  if (n >= CONTENT.maxPetLevel) return;
  return n === 0
    ? { iron: 200, coal: 20, coin: 100 }
    : {
        iron: 100 * n * n,
        coal: 10 * n,
        coin: 50 * n * n,
        ...(n >= 50 ? { gold: n } : {}),
      };
}
export function mineCost(
  s: LocalSnapshot,
  mine: "gold" | "jade",
): Cost | undefined {
  const n = mine === "gold" ? s.rpg.goldLevel : s.rpg.jadeLevel;
  if (n >= CONTENT.maxUpgrade) return;
  if (n === 0)
    return mine === "gold"
      ? { iron: 50000, coal: 500, coin: 10000 }
      : { iron: 100000, coal: 1000, gold: 100, coin: 25000 };
  const factor = (n + 1) ** 2;
  return mine === "gold"
    ? { iron: 1000 * factor, coal: 10 * factor, coin: 500 * factor }
    : {
        iron: 2000 * factor,
        coal: 20 * factor,
        gold: factor,
        coin: 1000 * factor,
      };
}
export const mineEligible = (s: LocalSnapshot, mine: "gold" | "jade") =>
  mine !== "gold" || s.upgrades.coal >= 50;
export function enhancementCost(item: Equipment): Cost | undefined {
  if (item.enhancement >= CONTENT.maxEnhancement) return;
  const n = item.enhancement + 1,
    l = item.level;
  return {
    iron: 20 * l * n,
    coin: 10 * l * n,
    castIron: l * n,
    ...(l >= 10 ? { gold: n } : {}),
    ...(l >= 30 ? { jade: n } : {}),
  };
}
export function awardRpgDeath(
  s: LocalSnapshot,
  floor: number,
  boss: boolean,
  random: (max: number) => number = (max) => nextRandom(s) % max,
): void {
  const r = s.rpg;
  r.heroXp = Math.min(Number.MAX_SAFE_INTEGER, r.heroXp + floor * 10);
  r.accountXp = Math.min(Number.MAX_SAFE_INTEGER, r.accountXp + floor * 2);
  const chance = boss
    ? Math.min(
        CONTENT.dropBossCapBp,
        CONTENT.dropBossBaseBp + Math.floor(floor / 10 - 1) * 10,
      )
    : CONTENT.dropCommonBp;
  if (random(10000) >= chance) return;
  const definitionId = ITEM_IDS[random(ITEM_IDS.length)]!;
  const rarity = rollRarity(boss, random(10000), floor),
    item = createEquipment(
      s,
      definitionId,
      Math.min(100, Math.ceil(floor / 10)),
      rarity,
      random,
    );
  r.lootSerial++;
  if (r.inventory.length >= CONTENT.bagCapacity) {
    addResource(s, "iron", BigInt(item.level * 10) * 1000n);
    r.lastLoot = "Mochila cheia: drop convertido em ferro.";
  } else {
    r.inventory.push(item);
    r.lastLoot = `Encontrado: ${ITEMS[definitionId].name} · ${RARITY[rarity].label}.`;
  }
}
function compatible(s: LocalSnapshot, item: Equipment, slot: Slot): boolean {
  const def = ITEMS[item.definitionId];
  if (
    !(
      def.slot === slot ||
      (item.definitionId === "ring" && slot === "ring2")
    ) ||
    item.level > levelFromXp(s.rpg.heroXp)
  )
    return false;
  if (Object.values(s.rpg.equipped).includes(item.id)) return false;
  if (def.twoHanded && s.rpg.equipped.shield) return false;
  const weapon = s.rpg.inventory.find((i) => i.id === s.rpg.equipped.weapon);
  if (slot === "shield" && weapon && ITEMS[weapon.definitionId].twoHanded)
    return false;
  return true;
}
export function applyRpgCommand(
  s: LocalSnapshot,
  input: RpgCommand,
  random?: (max: number) => number,
): boolean {
  const cmd = RpgCommandSchema.parse(input),
    r = s.rpg;
  switch (cmd.type) {
    case "craft": {
      if (
        cmd.level > itemTierAvailable(s) ||
        cmd.level > levelFromXp(r.heroXp) ||
        r.inventory.length >= CONTENT.bagCapacity ||
        !pay(s, craftCost(cmd.level))
      )
        return false;
      r.inventory.push(
        createEquipment(s, cmd.definitionId, cmd.level, "common", random),
      );
      return true;
    }
    case "equip": {
      const item = r.inventory.find((i) => i.id === cmd.id);
      if (!item || !compatible(s, item, cmd.slot)) return false;
      r.equipped[cmd.slot] = item.id;
      return true;
    }
    case "unequip":
      if (!r.equipped[cmd.slot]) return false;
      r.equipped[cmd.slot] = null;
      return true;
    case "salvage": {
      const i = r.inventory.findIndex((i) => i.id === cmd.id);
      if (i < 0 || Object.values(r.equipped).includes(cmd.id)) return false;
      const item = r.inventory[i]!;
      addResource(s, "iron", BigInt(item.level * 10) * 1000n);
      r.inventory.splice(i, 1);
      return true;
    }
    case "enhance": {
      const item = r.inventory.find((i) => i.id === cmd.id);
      if (!item) return false;
      const cost = enhancementCost(item);
      if (!cost || !pay(s, cost)) return false;
      item.enhancement++;
      return true;
    }
    case "mine": {
      const cost = mineCost(s, cmd.mine);
      if (!cost || !mineEligible(s, cmd.mine) || !pay(s, cost)) return false;
      if (cmd.mine === "gold") r.goldLevel++;
      else r.jadeLevel++;
      return true;
    }
    case "smelt": {
      const next = BigInt(r.castIron) + 1000n;
      if (next > MAX) throw Error("BALANCE_LIMIT");
      if (!pay(s, smeltCost)) return false;
      r.castIron = String(next);
      return true;
    }
    case "adoptPet":
    case "upgradePet": {
      if ((cmd.type === "adoptPet") !== (r.petLevel === 0)) return false;
      const cost = petCost(s);
      if (!cost || !pay(s, cost)) return false;
      r.petLevel++;
      if (r.petLevel === 1) r.petActive = true;
      return true;
    }
    case "togglePet":
      if (!r.petLevel) return false;
      r.petActive = !r.petActive;
      return true;
    case "attackTonic":
    case "productionTonic": {
      const key =
        cmd.type === "attackTonic" ? "attackBuffUntil" : "productionBuffUntil";
      if (r[key] > s.lastReconciledAt || !pay(s, tonicCost)) return false;
      r[key] =
        s.lastReconciledAt + (cmd.type === "attackTonic" ? 60000 : 300000);
      return true;
    }
  }
}
