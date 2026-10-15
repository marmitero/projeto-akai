import { z } from "zod";

export const PROTOCOL_VERSION = 1 as const;
export const CONFIG_VERSION = "local-loop-1" as const;
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
export const LocalSnapshotSchema = z
  .object({
    ...base,
    schemaVersion: z.literal(2),
    configVersion: z.literal(CONFIG_VERSION),
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
export type LocalSnapshot = z.infer<typeof LocalSnapshotSchema>;
export function newLoopState() {
  return {
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
    stage: z.literal("foundation"),
    onlineGameplay: z.literal(false),
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
