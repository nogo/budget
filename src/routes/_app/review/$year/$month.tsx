import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/review/$year/$month')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/_app/review/$year/categories"!</div>
}
