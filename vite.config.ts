import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // Silent in-place updates — right for a personal tool; a new
      // version simply applies on the next launch.
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'favicon.ico', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'Tessera',
        short_name: 'Tessera',
        description: 'A quiet, local-first habit tracker — one heatmap per habit.',
        display: 'standalone',
        // start_url and scope are omitted on purpose: the plugin derives
        // them from Vite's `base`, which keeps subpath deploys working.
        theme_color: '#09090b',
        background_color: '#09090b',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // The app makes zero runtime network requests — precache all of
        // it and offline is total.
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
      },
      // Never run the service worker against the dev server; verify PWA
      // behavior with `npm run build && npm run preview`.
      devOptions: { enabled: false },
    }),
  ],
  optimizeDeps: {
    // Pre-bundle these so the first dev-server load doesn't reload
    // mid-render when Vite discovers them lazily.
    include: ['dexie', 'dexie-react-hooks'],
  },
  test: {
    environment: 'happy-dom',
    setupFiles: ['./src/test-setup.ts'],
  },
})
