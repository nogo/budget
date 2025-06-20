import { createEnv } from "@t3-oss/env-core";
import { z } from "zod/v4";

const getViteEnv = (key: string) => {
  return import.meta.env ? import.meta.env[key] : process.env[key];
};

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().regex(/^(file:).+/, {
      message:
        "Invalid DATABASE_URL format. Must start with 'sqlite://' or 'file:'.",
    }),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    BETTER_AUTH_SECRET: z.string(),
  },

  clientPrefix: "PUBLIC_",
  client: {
    PUBLIC_LOCALE: z.string().optional().default("de-DE"),
    PUBLIC_CURRENCY: z.string().optional().default("EUR"),
    PUBLIC_BETTER_AUTH_URL: z.url().default("http://localhost:3000"),
    PUBLIC_AUTH_ALLOW_REGISTRATION: z
      .string()
      .refine((s) => s === "true" || s === "false")
      .transform((s) => s === "true")
      .optional(),
    PUBLIC_AUTH_DEFAULT_USER: z.string().optional(),
    PUBLIC_AUTH_DEFAULT_EMAIL: z.email().optional(),
    PUBLIC_AUTH_DEFAULT_PASSWORD: z.string().optional(),
  },

  runtimeEnvStrict: {
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    PUBLIC_LOCALE: getViteEnv("PUBLIC_LOCALE"),
    PUBLIC_CURRENCY: getViteEnv("PUBLIC_CURRENCY"),
    PUBLIC_BETTER_AUTH_URL: getViteEnv("PUBLIC_BETTER_AUTH_URL"),
    PUBLIC_AUTH_ALLOW_REGISTRATION: getViteEnv("PUBLIC_AUTH_ALLOW_REGISTRATION"),
    PUBLIC_AUTH_DEFAULT_USER: getViteEnv("PUBLIC_AUTH_DEFAULT_USER"),
    PUBLIC_AUTH_DEFAULT_EMAIL: getViteEnv("PUBLIC_AUTH_DEFAULT_EMAIL"),
    PUBLIC_AUTH_DEFAULT_PASSWORD: getViteEnv("PUBLIC_AUTH_DEFAULT_PASSWORD"),
  },

  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
