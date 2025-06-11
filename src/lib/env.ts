import { createEnv } from "@t3-oss/env-core";
import { z } from "zod/v4";

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
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnvStrict: {
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    VITE_LOCALE: process.env.VITE_LOCALE,
    VITE_CURRENCY: process.env.VITE_CURRENCY,
    VITE_BETTER_AUTH_URL: process.env.VITE_BETTER_AUTH_URL,
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  /**
   * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
   * `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
});
