import { useQuery } from "@tanstack/react-query";
import { createAuthClient } from "better-auth/react";
import { usernameClient } from "better-auth/client/plugins";
import { authQueries } from "~/service/queries";
import { env } from "../env";

export const authClient = createAuthClient({
  baseURL: env.VITE_BETTER_AUTH_URL,
  plugins: [usernameClient()],
});

export const useAuthentication = () => {
  const { data: userSession } = useQuery(authQueries.user());

  return { userSession, isAuthenticated: !!userSession };
};

export const useAuthenticatedUser = () => {
  const { userSession } = useAuthentication();

  if (!userSession) {
    throw new Error("User is not authenticated!");
  }

  return userSession;
};
