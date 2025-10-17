import { betterAuth } from "better-auth";
import { username } from "better-auth/plugins";
import { reactStartCookies } from "better-auth/react-start";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import db from "../db";
import { env } from "../env/server";
import { accounts, sessions, users, verifications } from "~/db/schema";

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  trustedOrigins: [env.BETTER_AUTH_URL],

  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema: {
      user: users,
      session: sessions,
      account: accounts,
      verification: verifications,
    },
  }),
  
  plugins: [
    username(),
    reactStartCookies()
  ],
  
  emailAndPassword: {
    enabled: true,
  },
  
  // Session configuration - long-lived with background refresh
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // 24 hours - session refreshed daily
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes - cookie cache refresh
    },
  },
  
  // Rate limiting - production security
  rateLimit: {
    enabled: env.NODE_ENV === "production",
    window: 60, // 60 seconds
    max: 100, // 100 requests per window
    customRules: {
      "/sign-in/email": {
        window: 10, // 10 seconds
        max: 3, // 3 attempts
      },
      "/sign-up/email": {
        window: 60, // 60 seconds
        max: 5, // 5 signups per minute
      },
      "/forget-password": {
        window: 60, // 60 seconds
        max: 3, // 3 password reset requests
      },
    },
  },
  
  // Advanced configuration for production
  advanced: {
    database: {
      generateId: () => crypto.randomUUID()
    },
    crossSubDomainCookies: {
      enabled: false,
    },
  },
});
