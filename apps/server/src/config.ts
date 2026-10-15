import { z } from 'zod';
const ConfigSchema = z.object({
  HOST: z.string().min(1).default('127.0.0.1'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
});
export type ServerConfig = z.infer<typeof ConfigSchema>;
export function parseServerConfig(env: Record<string, string | undefined>): ServerConfig { return ConfigSchema.parse(env); }
