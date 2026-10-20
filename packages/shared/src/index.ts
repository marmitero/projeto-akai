import { ENEMY_IDS } from "./bestiary.js";
import { z } from "zod";
import { RpgSchema, newRpgState } from "./rpg-schema.js";
import { ITEMS, SLOT_IDS } from "./content.js";

export const PROTOCOL_VERSION = 1 as const;
export const CONFIG_VERSION = "local-rpg-1" as const;
export const ScreenSchema = z.enum(["battle", "mine", "production"]);
export type Screen = z.infer<typeof ScreenSchema>;
// Amounts are integer thousandths; no JS Number is used to represent balances.
export const AmountSchema = z.string().regex(/^(0|[1-9]\d{0,37})$/);
export const BalancesSchema = z
  .object({
    coin: AmountSchema,
    iron: AmountSchema,
    coal: AmountSchema,
    gold: AmountSchema,
    jade: AmountSchema,
    ruby: AmountSchema,
  })
  .strict();
const safeInteger = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
const base = {
  mode: z.literal("local"),
  generation: safeInteger,
  savedAt: safeInteger,
  profile: z
    .object({ id: z.literal("local-test"), name: z.string().min(1).max(24) })
    .strict(),
  screen: ScreenSchema,
  activeMs: safeInteger,
  balances: BalancesSchema,
};
export const LegacySnapshotSchema = z
  .object({
    ...base,
    schemaVersion: z.literal(1),
    configVersion: z.literal("foundation-1"),
  })
  .strict();
export const Legacy2SnapshotSchema = z
  .object({
    ...base,
    schemaVersion: z.literal(2),
    configVersion: z.literal("local-loop-1"),
    lastReconciledAt: safeInteger,
    coalRemainder: z.number().int().min(0).max(999),
    upgrades: z
      .object({
        attack: safeInteger.max(100),
        vitality: safeInteger.max(100),
        click: safeInteger.max(100),
        coal: safeInteger.max(100),
      })
      .strict(),
    tutorial: z
      .object({
        victory: z.boolean(),
        mined: z.boolean(),
        upgraded: z.boolean(),
      })
      .strict(),
    battle: z
      .object({
        time: safeInteger,
        floor: safeInteger.min(1).max(20),
        highest: safeInteger.max(20),
        wave: safeInteger.min(1).max(3),
        attempt: safeInteger,
        phase: z.enum(["fighting", "transition", "failed", "complete"]),
        failure: z.enum(["none", "defeat", "timeout", "trained"]),
        paused: z.boolean(),
        training: z.boolean(),
        retryFloor: safeInteger.min(1).max(20),
        heroHp: safeInteger,
        heroNextAt: safeInteger,
        heroStrikes: safeInteger,
        deadline: safeInteger,
        transitionAt: safeInteger,
        enemies: z
          .array(
            z
              .object({
                hp: safeInteger,
                maxHp: safeInteger.min(1),
                nextAt: safeInteger,
                strikes: safeInteger,
              })
              .strict(),
          )
          .min(1)
          .max(3),
      })
      .strict(),
  })
  .strict();
export const BattleReportSchema = z
  .object({
    enemyId: z.enum(ENEMY_IDS).optional(),
    id: safeInteger.min(1),
    kind: z.enum(["reward", "victory", "defeat", "timeout"]),
    floor: safeInteger.min(1).max(1000),
    wave: safeInteger.min(1).max(3),
    coin: z
      .string()
      .regex(/^\d{1,40}$/)
      .default("0"),
    iron: z
      .string()
      .regex(/^\d{1,40}$/)
      .default("0"),
    heroXp: safeInteger.default(0),
    accountXp: safeInteger.default(0),
    loot: z.string().max(200).default(""),
  })
  .strict();
export type BattleReport = z.infer<typeof BattleReportSchema>;
export const LocalSnapshotSchema = Legacy2SnapshotSchema.extend({
  schemaVersion: z.literal(3),
  configVersion: z.literal(CONFIG_VERSION),
  coalRemainder: safeInteger.max(39999999),
  upgrades: z
    .object({
      attack: safeInteger.max(1000),
      vitality: safeInteger.max(1000),
      click: safeInteger.max(1000),
      coal: safeInteger.max(1000),
    })
    .strict(),
  battle: Legacy2SnapshotSchema.shape.battle.extend({
    enemies: z.array(Legacy2SnapshotSchema.shape.battle.shape.enemies.element.extend({ templateId: z.enum(ENEMY_IDS).optional() })).min(1).max(3),
    reportSerial: safeInteger.default(0),
    reports: z.array(BattleReportSchema).max(60).default([]),
    floor: safeInteger.min(1).max(1000),
    highest: safeInteger.max(1000),
    retryFloor: safeInteger.min(1).max(1000),
    hits: z
      .array(
        z
          .object({
            strike: safeInteger.min(1),
            attempt: safeInteger,
            target: safeInteger.max(2),
            damage: safeInteger.min(1),
            critical: z.boolean(),
          })
          .strict(),
      )
      .max(8)
      .default([]),
  }),
  rpg: RpgSchema,
}).superRefine((s, ctx) => {
  const reports = s.battle.reports;
  if (
    reports.some(
      (report, index) =>
        report.id > s.battle.reportSerial ||
        (index > 0 && report.id <= reports[index - 1]!.id),
    )
  )
    ctx.addIssue({ code: "custom", message: "Invalid battle report sequence" });
  const ids = s.rpg.inventory.map((i) => i.id),
    used = Object.values(s.rpg.equipped).filter((x) => x !== null);
  if (
    new Set(ids).size !== ids.length ||
    new Set(used).size !== used.length ||
    ids.some((id) => Number(id.slice(5)) >= s.rpg.nextItemId)
  )
    ctx.addIssue({ code: "custom", message: "Invalid item identity" });
  for (const slot of SLOT_IDS) {
    const id = s.rpg.equipped[slot];
    if (!id) continue;
    const item = s.rpg.inventory.find((i) => i.id === id);
    if (
      !item ||
      !(
        ITEMS[item.definitionId].slot === slot ||
        (item.definitionId === "ring" && slot === "ring2")
      )
    )
      ctx.addIssue({ code: "custom", message: "Invalid equipment reference" });
  }
  const weapon = s.rpg.inventory.find((i) => i.id === s.rpg.equipped.weapon);
  if (weapon && ITEMS[weapon.definitionId].twoHanded && s.rpg.equipped.shield)
    ctx.addIssue({ code: "custom", message: "Two handed conflict" });
});
export type LocalSnapshot = z.infer<typeof LocalSnapshotSchema>;
export function newLoopState() {
  return {
    rpg: newRpgState(),
    lastReconciledAt: 0,
    coalRemainder: 0,
    upgrades: { attack: 0, vitality: 0, click: 0, coal: 0 },
    tutorial: { victory: false, mined: false, upgraded: false },
    battle: {
      time: 0,
      floor: 1,
      highest: 0,
      wave: 1,
      attempt: 1,
      phase: "fighting" as const,
      failure: "none" as const,
      paused: false,
      training: false,
      retryFloor: 1,
      heroHp: 100,
      heroNextAt: 1000,
      heroStrikes: 0,
      deadline: 0,
      transitionAt: 0,
      enemies: Array.from({ length: 3 }, () => ({
        hp: 18,
        maxHp: 18,
        nextAt: 2000,
        strikes: 0,
      })),
    },
  };
}
export * from "./loop.js";
export const HealthSchema = z
  .object({
    status: z.literal("ok"),
    service: z.literal("akai-server"),
    protocolVersion: z.literal(PROTOCOL_VERSION),
    stage: z.enum(["foundation", "online"]),
    onlineGameplay: z.boolean(),
  })
  .strict();
export const MiningClickSchema = z
  .object({
    commandId: z.uuid(),
    expectedVersion: safeInteger,
    mineId: z.literal("iron"),
  })
  .strict();
export const ApiErrorSchema = z
  .object({
    error: z
      .object({
        code: z.string(),
        message: z.string(),
        retryable: z.boolean(),
        requestId: z.string(),
      })
      .strict(),
  })
  .strict();

export * from "./content.js";
export * from "./rpg-schema.js";
export * from "./rpg.js";

export * from "./online.js";

export * from "./community.js";

export * from "./market.js";

export * from "./monetization.js";

export * from "./bestiary.js";

export * from './economy-v2.js';
export * from './daily-boss-jade.js';
export * from './builds-v3.js';
export * from './combat-v3.js';
export * from './enemies-v3.js';
export * from './build-presets-v3.js';
export * from './hunts-v4.js';
export * from './refinement-v5.js';
export * from './protection-v5.js';
export * from './economy-run-v6.js';
export * from './offline-v7.js';
