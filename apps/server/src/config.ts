import { z } from "zod";
const ConfigSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  MONETIZATION_MODE: z
    .enum(["off", "sandbox", "google-play-test"])
    .default("off"),
  MONETIZATION_TEST_DATABASE: z.enum(["true", "false"]).default("false"),
  MONETIZATION_KEY: z
    .string()
    .min(64)
    .regex(/^[a-f0-9]{64}$/)
    .optional(),
  PLAY_PACKAGE_NAME: z
    .string()
    .regex(/^[a-zA-Z][\w]*(\.[\w]+)+$/)
    .optional(),
  PLAY_SERVICE_ACCOUNT_FILE: z.string().min(1).optional(),
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
  if (config.MONETIZATION_MODE !== "off") {
    if (
      config.NODE_ENV === "production" ||
      config.MONETIZATION_TEST_DATABASE !== "true" ||
      !config.MONETIZATION_KEY ||
      !["localhost", "127.0.0.1", "[::1]"].includes(
        new URL(config.PUBLIC_ORIGIN).hostname,
      ) ||
      !["127.0.0.1", "localhost", "::1"].includes(config.HOST)
    )
      throw Error("TEST_MONETIZATION_REQUIRES_ISOLATED_LOOPBACK");
    if (
      config.MONETIZATION_MODE === "google-play-test" &&
      (!config.PLAY_PACKAGE_NAME || !config.PLAY_SERVICE_ACCOUNT_FILE)
    )
      throw Error("PLAY_TEST_CONFIGURATION_REQUIRED");
  }
  return config;
}
