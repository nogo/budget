import { createEnv } from "@t3-oss/env-core";
import { z } from "zod/v4";

const getViteEnv = (key: string) => {
  return import.meta.env ? import.meta.env[key] : process.env[key];
};

export const env = createEnv({
  clientPrefix: "PUBLIC_",
  client: {
    PUBLIC_LOCALE: z.string().optional().default("de-DE"),
    PUBLIC_CURRENCY: z.string().optional().default("EUR"),
    PUBLIC_BETTER_AUTH_URL: z.url(),
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
    PUBLIC_LOCALE: getViteEnv("PUBLIC_LOCALE"),
    PUBLIC_CURRENCY: getViteEnv("PUBLIC_CURRENCY"),
    PUBLIC_BETTER_AUTH_URL: getViteEnv("PUBLIC_BETTER_AUTH_URL"),
    PUBLIC_AUTH_ALLOW_REGISTRATION: getViteEnv(
      "PUBLIC_AUTH_ALLOW_REGISTRATION",
    ),
    PUBLIC_AUTH_DEFAULT_USER: getViteEnv("PUBLIC_AUTH_DEFAULT_USER"),
    PUBLIC_AUTH_DEFAULT_EMAIL: getViteEnv("PUBLIC_AUTH_DEFAULT_EMAIL"),
    PUBLIC_AUTH_DEFAULT_PASSWORD: getViteEnv("PUBLIC_AUTH_DEFAULT_PASSWORD"),
  },

  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
