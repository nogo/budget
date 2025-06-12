import Navbar from "~/components/Navbar";
import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_app")({
  component: RouteComponent,
  beforeLoad: async ({ context }) => {
    if (!context.userSession) {
      throw redirect({ to: "/login" });
    }
  },
});

function RouteComponent() {
  return (
    <div className="relative">
      <Navbar />
      <main className="flex flex-col gap-4 md:flex-row min-h-screen pt-20 px-4">
        <Outlet />
      </main>
    </div>
  );
}
