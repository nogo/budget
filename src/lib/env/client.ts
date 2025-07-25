import { createEnv } from "@t3-oss/env-core";
import { z } from "zod/v4";

export const env = createEnv({
  clientPrefix: "VITE_",
  client: {
    VITE_LOCALE: z.string().optional().default("de-DE"),
    VITE_CURRENCY: z.string().optional().default("EUR"),
    VITE_BETTER_AUTH_URL: z.url(),
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
    VITE_LOCALE: import.meta.env.VITE_LOCALE,
    VITE_CURRENCY: import.meta.env.VITE_CURRENCY,
    VITE_BETTER_AUTH_URL: import.meta.env.VITE_BETTER_AUTH_URL,
    VITE_AUTH_ALLOW_REGISTRATION: import.meta.env.VITE_AUTH_ALLOW_REGISTRATION,
    VITE_AUTH_DEFAULT_USER: import.meta.env.VITE_AUTH_DEFAULT_USER,
    VITE_AUTH_DEFAULT_EMAIL: import.meta.env.VITE_AUTH_DEFAULT_EMAIL,
    VITE_AUTH_DEFAULT_PASSWORD: import.meta.env.VITE_AUTH_DEFAULT_PASSWORD,
  },

  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
