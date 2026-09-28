import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'offline.html'],
      manifest: {
        name: 'Acreage - Digital Agriculture Marketplace',
        short_name: 'Acreage',
        description: 'Connect with verified farmers and buyers. List crops, take orders, track sales, and settle via M-Pesa.',
        theme_color: '#166534',
        background_color: '#f0f7eb',
        display: 'standalone',
        icons: [
          {
            src: '/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,ttf,eot}'],
        runtimeCaching: [
          {
            // Only unauthenticated reference data is cached.
            //
            // The Cache API keys entries on URL and method, not on the
            // Authorization header, so the previous `/^https:\/\/api\./` rule
            // wrote every authenticated response — order lists, chat threads,
            // payout balances — into a shared 24 hour cache. Signing out and
            // back in as someone else on the same browser served the previous
            // account's data. A URL pattern cannot see the header, so the
            // check has to be a function.
            urlPattern: ({ url, request }) =>
              request.method === 'GET' &&
              url.pathname.startsWith('/api/') &&
              /^\/api\/(products|market|price-alerts)/.test(url.pathname) &&
              !request.headers.has('Authorization'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'public-api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 5
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: true
      }
    })
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (!id.includes('node_modules')) return
          // Order matters and the matches are anchored. The previous bare
          // `id.includes('react')` also matched lucide-react and
          // react-i18next, so a 293 KB chunk containing the icon library and
          // the i18n runtime was rebuilt whenever React itself changed, and
          // the ui-vendor/i18n-vendor branches below never ran for them.
          if (/node_modules\/(react|react-dom|scheduler|react-router)/.test(id)) {
            return 'react-vendor'
          }
          if (/node_modules\/(framer-motion|motion-dom|motion-utils|lucide-react)/.test(id)) {
            return 'ui-vendor'
          }
          if (id.includes('axios')) {
            return 'api-vendor'
          }
          if (/node_modules\/(i18next|react-i18next|i18next-browser-languagedetector)/.test(id)) {
            return 'i18n-vendor'
          }
        }
      }
    },
    chunkSizeWarningLimit: 400,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    }
  },
  server: {
    headers: {
      'Cache-Control': 'public, max-age=31536000, immutable'
    }
  }
})
