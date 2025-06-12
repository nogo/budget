import { env } from "~/lib/env";

export const AllowRegistration = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  if (!env.VITE_AUTH_ALLOW_REGISTRATION) return null;

  return <>{children}</>;
};
