import { z } from "zod";
import { RpgCommandSchema } from "./rpg-schema.js";
import type { LocalSnapshot } from "./index.js";
export const OnlineActionSchema = z.union([
  z.object({ type: z.literal("mining.click") }).strict(),
  z
    .object({
      type: z.literal("upgrade"),
      kind: z.enum(["attack", "vitality", "click", "coal"]),
    })
    .strict(),
  z
    .object({
      type: z.literal("battle"),
      action: z.enum(["pause", "resume", "retry", "train"]),
    })
    .strict(),
  z.object({ type: z.literal("rpg"), command: RpgCommandSchema }).strict(),
]);
export type OnlineAction = z.infer<typeof OnlineActionSchema>;
export const OnlineCommandSchema = z
  .object({
    commandId: z.uuid(),
    expectedVersion: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
    action: OnlineActionSchema,
  })
  .strict();
export type OnlineCommand = z.infer<typeof OnlineCommandSchema>;
export type OnlineSnapshot = Omit<LocalSnapshot, "mode" | "profile" | "rpg"> & {
  mode: "online";
  profile: { id: string; name: string };
  rpg: Omit<LocalSnapshot["rpg"], "rng">;
};
export interface OnlineState {
  stateVersion: number;
  commandVersion: number;
  serverTime: number;
  snapshot: OnlineSnapshot;
}
export interface CommandResult {
  commandId: string;
  status: "applied" | "rejected";
  code: string;
  stateVersion: number;
  commandVersion: number;
}
