import { z } from "zod";
const ConfigSchema = z.object({
  HOST: z.string().min(1).default("127.0.0.1"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.string().min(1).optional(),
  PUBLIC_ORIGIN: z.url().default("http://localhost:5173"),
  COOKIE_SECURE: z
    .enum(["true", "false"])
    .default("false")
    .transform((x) => x === "true"),
  GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
});
export type ServerConfig = z.infer<typeof ConfigSchema>;
export function parseServerConfig(
  env: Record<string, string | undefined>,
): ServerConfig {
  const config = ConfigSchema.parse(env);
  if (config.PUBLIC_ORIGIN.startsWith("https:") && !config.COOKIE_SECURE)
    throw Error("HTTPS_REQUIRES_SECURE_COOKIE");
  if (
    !config.COOKIE_SECURE &&
    !["localhost", "127.0.0.1", "[::1]"].includes(
      new URL(config.PUBLIC_ORIGIN).hostname,
    )
  )
    throw Error("INSECURE_PUBLIC_ORIGIN");
  return config;
}
