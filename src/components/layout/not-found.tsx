import { Link } from '@tanstack/react-router'
import { ArrowLeft, Home } from 'lucide-react'
import { Button } from '../ui/button'

export function NotFound({ children }: { children?: any }) {
  return (
    <div className="min-w-0 flex-1 p-4 flex flex-col items-center justify-center gap-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-semibold">Page Not Found</h1>
        <div className="text-muted-foreground">
          {children || <p>The page you are looking for does not exist.</p>}
        </div>
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <Button
          onClick={() => window.history.back()}
          variant="outline"
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4" />
          Go Back
        </Button>
        <Link to="/">
          <Button className="flex items-center gap-2">
            <Home className="h-4" />
            Home
          </Button>
        </Link>
      </div>
    </div>
  )
}