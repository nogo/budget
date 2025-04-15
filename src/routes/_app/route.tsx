import Navbar from '~/components/Navbar'
import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_app')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div className="max-w-screen overflow-x-hidden">
      <Navbar />
      <main className="pt-20 px-4 flex flex-col gap-4">
        <Outlet />
      </main>
    </div>
  )
}
