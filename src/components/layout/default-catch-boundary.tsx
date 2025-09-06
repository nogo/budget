import {
  ErrorComponent,
  Link,
  rootRouteId,
  useMatch,
  useRouter,
} from '@tanstack/react-router'
import type { ErrorComponentProps } from '@tanstack/react-router'
import { RefreshCw, Home, ArrowLeft } from 'lucide-react'
import { Button } from '../ui/button'

export function DefaultCatchBoundary({ error }: ErrorComponentProps) {
  const router = useRouter()
  const isRoot = useMatch({
    strict: false,
    select: (state) => state.id === rootRouteId,
  })

  console.error('DefaultCatchBoundary Error:', error)

  return (
    <div className="min-w-0 flex-1 p-4 flex flex-col items-center justify-center gap-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-semibold">Something went wrong</h1>
        <div className="text-muted-foreground">
          <p>An unexpected error occurred. Please try again.</p>
        </div>
      </div>
      <ErrorComponent error={error} />
      <div className="flex items-center gap-3 flex-wrap">
        <Button
          onClick={() => {
            router.invalidate()
          }}
          variant="outline"
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4" />
          Try Again
        </Button>
        {isRoot ? (
          <Link to="/">
            <Button className="flex items-center gap-2">
              <Home className="h-4" />
              Home
            </Button>
          </Link>
        ) : (
          <Button
            onClick={(e) => {
              e.preventDefault()
              window.history.back()
            }}
            variant="secondary"
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4" />
            Go Back
          </Button>
        )}
      </div>
    </div>
  )
}