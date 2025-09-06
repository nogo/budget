import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import viteReact from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Read version from package.json
import { readFileSync } from 'fs';
const packageJson = JSON.parse(readFileSync('./package.json', 'utf8'));

export default defineConfig({
  server: {
    port: 3000,
  },
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
  },
  plugins: [
    tsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tanstackStart({ customViteReactPlugin: true, target: "bun" }),
    viteReact(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 5 // 5 minutes
              },
              networkTimeoutSeconds: 10
            }
          }
        ]
      },
      manifest: {
        name: 'Budget App',
        short_name: 'Budget',
        description: 'Personal budget tracking application',
        theme_color: '#733e0a',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/img/favicon-16x16.png',
            sizes: '16x16',
            type: 'image/png'
          },
          {
            src: '/img/favicon-32x32.png',
            sizes: '32x32',
            type: 'image/png'
          },
          {
            src: '/img/favicon-64x64.png',
            sizes: '64x64',
            type: 'image/png'
          },
          {
            src: '/img/favicon-128x128.png',
            sizes: '128x128',
            type: 'image/png'
          },
          {
            src: '/img/favicon-256x256.png',
            sizes: '256x256',
            type: 'image/png'
          }
        ]
      }
    })
  ],
});
