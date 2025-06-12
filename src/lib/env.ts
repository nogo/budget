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

  clientPrefix: "VITE_",
  client: {
    VITE_LOCALE: z.string().optional().default("de-DE"),
    VITE_CURRENCY: z.string().optional().default("EUR"),
    VITE_BETTER_AUTH_URL: z.url().default("http://localhost:3000"),
    VITE_AUTH_ALLOW_REGISTRATION: z
      .string()
      .refine((s) => s === "true" || s === "false")
      .transform((s) => s === "true")
      .optional(),
    VITE_AUTH_DEFAULT_USER: z.string().optional(),
    VITE_AUTH_DEFAULT_EMAIL: z.email().optional(),
    VITE_AUTH_DEFAULT_PASSWORD: z.string().optional(),
  },

  runtimeEnvStrict: {
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    VITE_LOCALE: getViteEnv("VITE_LOCALE"),
    VITE_CURRENCY: getViteEnv("VITE_CURRENCY"),
    VITE_BETTER_AUTH_URL: getViteEnv("VITE_BETTER_AUTH_URL"),
    VITE_AUTH_ALLOW_REGISTRATION: getViteEnv("VITE_AUTH_ALLOW_REGISTRATION"),
    VITE_AUTH_DEFAULT_USER: getViteEnv("VITE_AUTH_DEFAULT_USER"),
    VITE_AUTH_DEFAULT_EMAIL: getViteEnv("VITE_AUTH_DEFAULT_EMAIL"),
    VITE_AUTH_DEFAULT_PASSWORD: getViteEnv("VITE_AUTH_DEFAULT_PASSWORD"),
  },

  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
