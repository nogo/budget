import { betterAuth } from "better-auth";
import { username } from "better-auth/plugins";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { reactStartCookies } from "better-auth/react-start";
import { env } from "../env";
import prisma from "../prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "sqlite",
  }),
  emailAndPassword: {
    enabled: true,
  },
  baseURL: env.PUBLIC_BETTER_AUTH_URL,
  basePath: "/api/auth",
  trustedOrigins: [env.PUBLIC_BETTER_AUTH_URL],
  plugins: [reactStartCookies(), username()],
});
