import { z } from "zod";
import { SLOT_IDS, ITEM_IDS, RARITIES, AFFIX_IDS } from "./content.js";
const n = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
const attributes = z
  .object({
    attack: n.max(10000000),
    hp: n.max(10000000),
    defense: n.max(100000),
    miningBp: n.max(20000),
    productionBp: n.max(20000),
  })
  .strict();
export const EquipmentSchema = z
  .object({
    id: z.string().regex(/^item-[1-9]\d{0,14}$/),
    definitionId: z.enum(ITEM_IDS),
    rarity: z.enum(RARITIES),
    level: n.min(1).max(100),
    enhancement: n.max(20),
    attributes,
    affixes: z.array(z.enum(AFFIX_IDS)).max(4),
  })
  .strict();
export type Equipment = z.infer<typeof EquipmentSchema>;
const equipped = z
  .object({
    weapon: z.string().nullable(),
    shield: z.string().nullable(),
    chest: z.string().nullable(),
    head: z.string().nullable(),
    hands: z.string().nullable(),
    feet: z.string().nullable(),
    neck: z.string().nullable(),
    ring1: z.string().nullable(),
    ring2: z.string().nullable(),
  })
  .strict();
export const RpgSchema = z
  .object({
    rng: n.min(1).max(4294967295),
    nextItemId: n.min(1).max(999999999999999),
    inventory: z.array(EquipmentSchema).max(120),
    equipped,
    heroXp: n,
    accountXp: n,
    goldLevel: n.max(1000),
    jadeLevel: n.max(1000),
    goldRemainder: n.max(39999999),
    jadeRemainder: n.max(39999999),
    castIron: z.string().regex(/^(0|[1-9]\d{0,37})$/),
    petLevel: n.max(100),
    petActive: z.boolean(),
    attackBuffUntil: n,
    productionBuffUntil: n,
    lootSerial: n,
    lastLoot: z.string().max(180),
  })
  .strict();
export const RpgCommandSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("craft"),
      definitionId: z.enum(ITEM_IDS),
      level: n.min(1).max(100),
    })
    .strict(),
  z
    .object({
      type: z.literal("equip"),
      id: EquipmentSchema.shape.id,
      slot: z.enum(SLOT_IDS),
    })
    .strict(),
  z.object({ type: z.literal("unequip"), slot: z.enum(SLOT_IDS) }).strict(),
  z
    .object({
      type: z.enum(["salvage", "enhance"]),
      id: EquipmentSchema.shape.id,
    })
    .strict(),
  z
    .object({ type: z.literal("mine"), mine: z.enum(["gold", "jade"]) })
    .strict(),
  z
    .object({
      type: z.enum([
        "smelt",
        "adoptPet",
        "upgradePet",
        "togglePet",
        "attackTonic",
        "productionTonic",
      ]),
    })
    .strict(),
]);
export type RpgCommand = z.infer<typeof RpgCommandSchema>;
export function newRpgState(seed = 0x41a7f37b) {
  return RpgSchema.parse({
    rng: seed,
    nextItemId: 1,
    inventory: [],
    equipped: Object.fromEntries(SLOT_IDS.map((id) => [id, null])),
    heroXp: 0,
    accountXp: 0,
    goldLevel: 0,
    jadeLevel: 0,
    goldRemainder: 0,
    jadeRemainder: 0,
    castIron: "0",
    petLevel: 0,
    petActive: false,
    attackBuffUntil: 0,
    productionBuffUntil: 0,
    lootSerial: 0,
    lastLoot: "",
  });
}
