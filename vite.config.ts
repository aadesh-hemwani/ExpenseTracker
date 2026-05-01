import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Expenses.',
        short_name: 'Expenses',
        description: 'Track your daily expenses with function and form.',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        orientation: 'portrait',
        theme_color: '#000000',
        background_color: '#000000',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ],
        shortcuts: [
          {
            name: "Add Expense",
            short_name: "Add",
            description: "Log a new expense quickly",
            url: "/?action=add",
            icons: [{ src: "pwa-192x192.png", sizes: "192x192", type: "image/png" }]
          },
          {
            name: "View Insights",
            short_name: "Insights",
            description: "Check your spending trends",
            url: "/analytics",
            icons: [{ src: "pwa-192x192.png", sizes: "192x192", type: "image/png" }]
          }
        ],
        share_target: {
          action: "/?action=add",
          method: "GET",
          params: {
            title: "title",
            text: "text",
            url: "url"
          }
        }
      },

      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}']
      },
    })
  ],
  base: '/',
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'vendor';
            }
            if (id.includes('firebase')) {
              return 'firebase';
            }
            if (id.includes('framer-motion') || id.includes('clsx') || id.includes('tailwind-merge') || id.includes('lucide-react')) {
              return 'ui';
            }
            if (id.includes('recharts')) {
              return 'charts';
            }
            return 'modules';
          }
        }
      }
    },
    chunkSizeWarningLimit: 1000,
  }
});