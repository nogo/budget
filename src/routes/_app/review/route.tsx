import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/review")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="w-full">
      <Outlet />
    </div>
  );
}
