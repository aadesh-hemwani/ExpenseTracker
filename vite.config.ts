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
        name: 'Minimalist Expense Tracker',
        short_name: 'Expenses',
        description: 'Track your daily expenses with function and form.',
        display: 'standalone', // Removes browser UI for native feel
        scope: '/',
        start_url: '/',
        orientation: 'portrait',
        theme_color: '#ffffff',
        background_color: '#ffffff',
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
        navigateFallbackDenylist: [/^\/.*\.js$/, /^\/.*\.css$/, /^\/.*\.png$/, /^\/.*\.json$/]
      },
    })
  ],
  base: '/',
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('firebase')) return 'firebase';
            if (id.includes('react-ionicons')) return 'icons';
            if (id.includes('html2canvas') || id.includes('jspdf')) return 'pdf';
            if (id.includes('@google/generative-ai')) return 'ai';
            if (id.includes('recharts')) return 'charts';
            if (id.includes('framer-motion')) return 'framer';
            if (id.includes('react-router') || id.includes('react-dom') || id.includes('react/')) return 'vendor';
            if (id.includes('date-fns') || id.includes('canvas-confetti')) return 'utils';
          }
        }
      }
    },
    chunkSizeWarningLimit: 1000
  }
});