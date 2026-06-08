import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'pwa-192.png', 'pwa-512.png'],
      manifest: {
        name: 'CompraYa',
        short_name: 'CompraYa',
        description: 'Lista de compras inteligente',
        theme_color: '#7c3aed',
        background_color: '#0f0a1a',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webp,woff2}'],
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            // Lista activa + listado de listas — cacheado para uso en supermercado sin señal
            urlPattern: ({ url }) =>
              url.pathname.startsWith('/api/v1/lists/') &&
              !url.pathname.includes('/items/') &&
              !url.pathname.includes('/export'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'lists-cache',
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Perfil + catálogo + tiendas — refresca en background
            urlPattern: /\/api\/v1\/(users\/me|stores|products)\/?(\?.*)?$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'meta-cache',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
})
