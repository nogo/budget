import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/categories/$categoryId/merge')({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/categories/$category/merge"!</div>;
}
