import { env } from "~/lib/env/client";

export const AllowRegistration = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  if (!env.PUBLIC_AUTH_ALLOW_REGISTRATION) return null;

  return <>{children}</>;
};
