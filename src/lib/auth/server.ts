import { betterAuth } from "better-auth";
import { username } from "better-auth/plugins";
import { reactStartCookies } from "better-auth/react-start";
import { prismaAdapter } from "better-auth/adapters/prisma";
import prisma from "../prisma";
import { env } from "../env/server";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "sqlite",
  }),
  emailAndPassword: {
    enabled: true,
  },
  baseURL: env.BETTER_AUTH_URL,
  trustedOrigins: [env.BETTER_AUTH_URL],
  plugins: [
    username(),
    reactStartCookies()
  ],
});
