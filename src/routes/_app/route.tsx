
import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import Navbar from "~/components/layout/navbar";

export const Route = createFileRoute("/_app")({
  beforeLoad: async ({ context }) => {
    if (!context.isAuthenticated) {
      throw redirect({ to: "/login" });
    }
  },
  component: AppRouteComponent,
});

function AppRouteComponent() {
  return (
    <div className="relative">
      <Navbar />
      <main className="flex flex-col gap-4 md:flex-row min-h-screen pt-20 px-4">
        <Outlet />
      </main>
    </div>
  );
}
