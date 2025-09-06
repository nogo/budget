import { useState } from 'react'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Download, X } from 'lucide-react'

// PWA register hook types
interface PWARegisterOptions {
  immediate?: boolean
  onNeedRefresh?: () => void
  onOfflineReady?: () => void
  onRegistered?: (registration: ServiceWorkerRegistration | undefined) => void
  onRegisterError?: (error: any) => void
}

// This will be available when vite-plugin-pwa is properly configured
declare module 'virtual:pwa-register/react' {
  export function useRegisterSW(options?: PWARegisterOptions): {
    needRefresh: [boolean, (value: boolean) => void]
    offlineReady: [boolean, (value: boolean) => void]
    updateServiceWorker: (reloadPage?: boolean) => Promise<void>
  }
}

// Import the PWA register hook
import { useRegisterSW } from 'virtual:pwa-register/react'

export function PWAUpdateNotification() {
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false)
  
  const {
    offlineReady: [offlineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered:', r)
    },
    onRegisterError(error) {
      console.log('SW registration error:', error)
    },
    onOfflineReady() {
      console.log('App ready to work offline')
    },
    onNeedRefresh() {
      console.log('New version available')
      setShowUpdatePrompt(true)
    },
  })

  const handleUpdate = () => {
    updateServiceWorker(true)
    setShowUpdatePrompt(false)
    setNeedRefresh(false)
  }

  const handleDismiss = () => {
    setShowUpdatePrompt(false)
    setNeedRefresh(false)
  }

  // Show update notification when needed
  if (showUpdatePrompt && needRefresh) {
    return (
      <div className="fixed bottom-4 right-4 z-50 max-w-sm">
        <Card className="border-primary">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="text-sm">Update Available</CardTitle>
                <CardDescription className="text-xs">
                  A new version of Budget is ready to install
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                onClick={handleDismiss}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleUpdate}
                className="flex items-center gap-2 flex-1"
              >
                <Download className="h-3 w-3" />
                Update Now
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleDismiss}
              >
                Later
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show offline ready notification briefly
  if (offlineReady) {
    return (
      <div className="fixed bottom-4 right-4 z-50 max-w-sm">
        <Card className="border-green-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              App is ready to work offline
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return null
}