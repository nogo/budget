import { Plugin } from 'vite';
import { build } from 'esbuild';
import { injectManifest } from 'workbox-build';
import { resolve } from 'path';
import { existsSync, mkdirSync } from 'fs';

export function pwaPlugin(): Plugin {
  let buildCompleted = false;

  return {
    name: 'pwa-nitro-workaround',
    apply: 'build',

    // Hook after build completes
    closeBundle: async () => {
      // Prevent duplicate runs
      if (buildCompleted) return;
      buildCompleted = true;

      try {
        // Target dist/client where Vite outputs client build
        const clientDist = resolve('dist/client');
        const swTempDest = resolve('dist/sw-temp.js');
        const swDest = resolve(clientDist, 'sw.js');

        console.log('🔧 Building PWA service worker...');

        // Ensure output directory exists
        if (!existsSync(clientDist)) {
          console.warn('⚠️  Client dist directory not found, skipping SW generation');
          return;
        }

        // Build SW with esbuild
        await build({
          entryPoints: ['./src/sw.ts'],
          bundle: true,
          outfile: swTempDest,
          platform: 'browser',
          format: 'iife',
          minify: true,
          target: 'es2020',
        });

        console.log('📦 Injecting manifest into service worker...');

        // Inject workbox manifest
        const { count, size } = await injectManifest({
          swSrc: swTempDest,
          swDest,
          globDirectory: clientDist,
          globPatterns: [
            '**/*.{js,css,html,ico,png,svg,webp,woff,woff2,ttf,eot}'
          ],
          // Don't precache the service worker itself
          globIgnores: ['**/sw.js', '**/workbox-*.js'],
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
        });

        console.log(`✓ PWA service worker generated successfully!`);
        console.log(`  - ${count} files will be precached`);
        console.log(`  - Total size: ${(size / 1024).toFixed(2)} KB`);
        console.log(`  - Location: ${swDest}`);
      } catch (error) {
        console.error('❌ Failed to generate PWA service worker:', error);
        throw error;
      }
    },
  };
}
