import { useAuthentication } from "~/lib/auth/client";

export const LoggedOut = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuthentication();

  if (isAuthenticated) return null;

  return <>{children}</>;
};
