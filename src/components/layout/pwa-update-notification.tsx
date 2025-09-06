import { useState, useEffect } from 'react'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Download, X } from 'lucide-react'

export function PWAUpdateNotification() {
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false)
  const [offlineReady, setOfflineReady] = useState(false)
  const [updateServiceWorker, setUpdateServiceWorker] = useState<(() => Promise<void>) | null>(null)
  
  useEffect(() => {
    // Check if we're in a secure context
    const isSecure = typeof window !== 'undefined' && 
      (window.location.protocol === 'https:' || 
       window.location.hostname === 'localhost' ||
       window.location.hostname === '127.0.0.1')
    
    if (!isSecure) {
      console.warn('Service Worker requires HTTPS or localhost. PWA features disabled.')
      return
    }
    
    // Try to register the service worker directly
    const initializePWA = async () => {
      try {
        // Register service worker directly if available
        if ('serviceWorker' in navigator) {
          try {
            const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
            console.log('SW registered:', registration)
            
            registration.addEventListener('updatefound', () => {
              const newWorker = registration.installing
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    console.log('New version available')
                    setShowUpdatePrompt(true)
                    setUpdateServiceWorker(() => async () => {
                      newWorker.postMessage({ type: 'SKIP_WAITING' })
                      window.location.reload()
                    })
                  }
                })
              }
            })
            
          } catch (error) {
            console.error('SW registration failed:', error)
          }
        }
      } catch (error) {
        // PWA plugin not available or other error
        console.log('PWA features not available:', error)
      }
    }
    
    initializePWA()
  }, [])

  const handleUpdate = async () => {
    if (updateServiceWorker) {
      await updateServiceWorker()
    }
    setShowUpdatePrompt(false)
  }

  const handleDismiss = () => {
    setShowUpdatePrompt(false)
  }

  // Show update notification when needed
  if (showUpdatePrompt) {
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