import { createAuthClient } from "better-auth/react";
import { usernameClient } from "better-auth/client/plugins";
import { env } from "../env/client";
import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { auth } from "./server";

export const authClient = createAuthClient({
  baseURL: env.VITE_BETTER_AUTH_URL,
  plugins: [
    usernameClient()
  ],
});

export const { signIn, signUp, signOut, useSession } = authClient;

export function authQueryOptions() {
  return queryOptions({
    queryKey: ["auth", "user"],
    queryFn: () => getCurrentUserSessionFn(),
    staleTime: 1000 * 60 * 60 * 24, // 24 hours - matches session updateAge
    gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days - keep in cache
    refetchInterval: 1000 * 60 * 60 * 12, // 12 hours - background refresh
    refetchOnWindowFocus: true,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

export const getCurrentUserSessionFn = createServerFn({
  method: "GET",
}).handler(async () => {
  try {
    const request = getRequest();

    if (!request?.headers) {
      return null;
    }

    const userSession = await auth.api.getSession({ headers: request.headers });

    if (!userSession) return null;

    return { user: userSession.user, session: userSession.session };
  } catch (error) {
    console.error("[Auth] Failed to get session:", error);
    return null;
  }
});