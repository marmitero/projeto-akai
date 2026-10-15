import { z } from 'zod';

export const PROTOCOL_VERSION = 1 as const;
export const CONFIG_VERSION = 'foundation-1' as const;
export const ScreenSchema = z.enum(['battle', 'mine', 'production']);
export type Screen = z.infer<typeof ScreenSchema>;
// Amounts are integer thousandths; no JS Number is used to represent balances.
export const AmountSchema = z.string().regex(/^(0|[1-9]\d{0,37})$/);
export const BalancesSchema = z.object({ coin: AmountSchema, iron: AmountSchema, coal: AmountSchema, gold: AmountSchema, jade: AmountSchema, ruby: AmountSchema }).strict();
const safeInteger = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
export const LocalSnapshotSchema = z.object({
  schemaVersion: z.literal(1), configVersion: z.literal(CONFIG_VERSION), mode: z.literal('local'),
  generation: safeInteger, savedAt: safeInteger,
  profile: z.object({ id: z.literal('local-test'), name: z.string().min(1).max(24) }).strict(),
  screen: ScreenSchema, activeMs: safeInteger, balances: BalancesSchema,
}).strict();
export type LocalSnapshot = z.infer<typeof LocalSnapshotSchema>;
export const HealthSchema = z.object({ status: z.literal('ok'), service: z.literal('akai-server'), protocolVersion: z.literal(PROTOCOL_VERSION), stage: z.literal('foundation'), onlineGameplay: z.literal(false) }).strict();
export const MiningClickSchema = z.object({ commandId: z.uuid(), expectedVersion: safeInteger, mineId: z.literal('iron') }).strict();
export const ApiErrorSchema = z.object({ error: z.object({ code: z.string(), message: z.string(), retryable: z.boolean(), requestId: z.string() }).strict() }).strict();
