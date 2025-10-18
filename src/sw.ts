import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst } from 'workbox-strategies';

declare let self: ServiceWorkerGlobalScope;

// Precache static assets generated during build
precacheAndRoute(self.__WB_MANIFEST);

// Runtime caching strategy for API calls
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api-cache',
    networkTimeoutSeconds: 10,
    plugins: [
      {
        cacheWillUpdate: async ({ response }) => {
          // Only cache successful responses
          if (response && response.status === 200) {
            return response;
          }
          return null;
        },
      },
    ],
  })
);

// Listen for skip waiting message
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
