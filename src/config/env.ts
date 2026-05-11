import { z } from "zod";

const envSchema = z.object({
  TELEGRAM_BOT_TOKEN: z.string().min(1, "TELEGRAM_BOT_TOKEN is required"),
  TELEGRAM_WEBHOOK_SECRET: z.string().min(1).optional(),
  GEMINI_API_KEY: z.string().min(1, "GEMINI_API_KEY is required"),
  GEMINI_MODEL: z.string().min(1).default("gemini-2.5-flash"),
  SUPABASE_URL: z.string().url("SUPABASE_URL must be a URL"),
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, "SUPABASE_SERVICE_ROLE_KEY is required"),
  STORE_NAME: z.string().min(1, "STORE_NAME is required"),
  STORE_CODE: z.string().min(1, "STORE_CODE is required"),
  DEFAULT_LANGUAGE: z.string().min(1).default("id"),
  NODE_ENV: z.string().min(1).default("development"),
  VERCEL_PUBLIC_URL: z.string().url().optional(),
  VERCEL_URL: z.string().min(1).optional()
});

export type AppEnv = z.infer<typeof envSchema>;
const metadataEnvSchema = z.object({
  GEMINI_MODEL: z.string().min(1).default("gemini-2.5-flash"),
  STORE_NAME: z.string().min(1, "STORE_NAME is required"),
  STORE_CODE: z.string().min(1, "STORE_CODE is required"),
  DEFAULT_LANGUAGE: z.string().min(1).default("id")
});

export type MetadataEnv = z.infer<typeof metadataEnvSchema>;

let cachedEnv: AppEnv | null = null;
let cachedMetadataEnv: MetadataEnv | null = null;

export function getEnv(): AppEnv {
  if (cachedEnv) {
    return cachedEnv;
  }

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "env"}: ${issue.message}`)
      .join("\n");
    throw new Error(`Environment validation failed:\n${details}`);
  }

  cachedEnv = parsed.data;
  return cachedEnv;
}

export function getMetadataEnv(): MetadataEnv {
  if (cachedMetadataEnv) {
    return cachedMetadataEnv;
  }

  const parsed = metadataEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "env"}: ${issue.message}`)
      .join("\n");
    throw new Error(`Environment validation failed:\n${details}`);
  }

  cachedMetadataEnv = parsed.data;
  return cachedMetadataEnv;
}

export function getGeminiApiKey(): string | null {
  const value = process.env.GEMINI_API_KEY?.trim();
  return value ? value : null;
}

export function getPublicBaseUrl(env: AppEnv = getEnv()): string | null {
  if (env.VERCEL_PUBLIC_URL) {
    return env.VERCEL_PUBLIC_URL.replace(/\/+$/, "");
  }
  if (env.VERCEL_URL) {
    return `https://${env.VERCEL_URL.replace(/\/+$/, "")}`;
  }
  return null;
}
