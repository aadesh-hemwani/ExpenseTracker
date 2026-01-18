// vite.config.ts
import { defineConfig } from "file:///C:/Users/aades/OneDrive/Documents/ExpenseTracker/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/aades/OneDrive/Documents/ExpenseTracker/node_modules/@vitejs/plugin-react/dist/index.js";
import { VitePWA } from "file:///C:/Users/aades/OneDrive/Documents/ExpenseTracker/node_modules/vite-plugin-pwa/dist/index.js";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "masked-icon.svg"],
      manifest: {
        name: "Minimalist Expense Tracker",
        short_name: "Expenses",
        description: "Track your daily expenses with function and form.",
        display: "standalone",
        // Removes browser UI for native feel
        scope: "/",
        start_url: "/",
        orientation: "portrait",
        theme_color: "#ffffff",
        background_color: "#ffffff",
        icons: [
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png"
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable"
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
      }
    })
  ],
  base: "/",
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("firebase")) return "firebase";
            if (id.includes("react-ionicons")) return "icons";
            if (id.includes("html2canvas") || id.includes("jspdf")) return "pdf";
            if (id.includes("@google/generative-ai")) return "ai";
            if (id.includes("recharts")) return "charts";
            if (id.includes("framer-motion")) return "framer";
            if (id.includes("react-router") || id.includes("react-dom") || id.includes("react/")) return "vendor";
            if (id.includes("date-fns") || id.includes("canvas-confetti")) return "utils";
          }
        }
      }
    },
    chunkSizeWarningLimit: 1e3
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxhYWRlc1xcXFxPbmVEcml2ZVxcXFxEb2N1bWVudHNcXFxcRXhwZW5zZVRyYWNrZXJcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXGFhZGVzXFxcXE9uZURyaXZlXFxcXERvY3VtZW50c1xcXFxFeHBlbnNlVHJhY2tlclxcXFx2aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVXNlcnMvYWFkZXMvT25lRHJpdmUvRG9jdW1lbnRzL0V4cGVuc2VUcmFja2VyL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSc7XHJcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XHJcbmltcG9ydCB7IFZpdGVQV0EgfSBmcm9tICd2aXRlLXBsdWdpbi1wd2EnO1xyXG5cclxuLy8gaHR0cHM6Ly92aXRlanMuZGV2L2NvbmZpZy9cclxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcclxuICBwbHVnaW5zOiBbXHJcbiAgICByZWFjdCgpLFxyXG4gICAgVml0ZVBXQSh7XHJcbiAgICAgIHJlZ2lzdGVyVHlwZTogJ2F1dG9VcGRhdGUnLFxyXG4gICAgICBpbmNsdWRlQXNzZXRzOiBbJ2Zhdmljb24uaWNvJywgJ2FwcGxlLXRvdWNoLWljb24ucG5nJywgJ21hc2tlZC1pY29uLnN2ZyddLFxyXG4gICAgICBtYW5pZmVzdDoge1xyXG4gICAgICAgIG5hbWU6ICdNaW5pbWFsaXN0IEV4cGVuc2UgVHJhY2tlcicsXHJcbiAgICAgICAgc2hvcnRfbmFtZTogJ0V4cGVuc2VzJyxcclxuICAgICAgICBkZXNjcmlwdGlvbjogJ1RyYWNrIHlvdXIgZGFpbHkgZXhwZW5zZXMgd2l0aCBmdW5jdGlvbiBhbmQgZm9ybS4nLFxyXG4gICAgICAgIGRpc3BsYXk6ICdzdGFuZGFsb25lJywgLy8gUmVtb3ZlcyBicm93c2VyIFVJIGZvciBuYXRpdmUgZmVlbFxyXG4gICAgICAgIHNjb3BlOiAnLycsXHJcbiAgICAgICAgc3RhcnRfdXJsOiAnLycsXHJcbiAgICAgICAgb3JpZW50YXRpb246ICdwb3J0cmFpdCcsXHJcbiAgICAgICAgdGhlbWVfY29sb3I6ICcjZmZmZmZmJyxcclxuICAgICAgICBiYWNrZ3JvdW5kX2NvbG9yOiAnI2ZmZmZmZicsXHJcbiAgICAgICAgaWNvbnM6IFtcclxuICAgICAgICAgIHtcclxuICAgICAgICAgICAgc3JjOiAncHdhLTE5MngxOTIucG5nJyxcclxuICAgICAgICAgICAgc2l6ZXM6ICcxOTJ4MTkyJyxcclxuICAgICAgICAgICAgdHlwZTogJ2ltYWdlL3BuZydcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICB7XHJcbiAgICAgICAgICAgIHNyYzogJ3B3YS01MTJ4NTEyLnBuZycsXHJcbiAgICAgICAgICAgIHNpemVzOiAnNTEyeDUxMicsXHJcbiAgICAgICAgICAgIHR5cGU6ICdpbWFnZS9wbmcnXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAge1xyXG4gICAgICAgICAgICBzcmM6ICdwd2EtNTEyeDUxMi5wbmcnLFxyXG4gICAgICAgICAgICBzaXplczogJzUxMng1MTInLFxyXG4gICAgICAgICAgICB0eXBlOiAnaW1hZ2UvcG5nJyxcclxuICAgICAgICAgICAgcHVycG9zZTogJ2FueSBtYXNrYWJsZSdcclxuICAgICAgICAgIH1cclxuICAgICAgICBdLFxyXG4gICAgICAgIHNob3J0Y3V0czogW1xyXG4gICAgICAgICAge1xyXG4gICAgICAgICAgICBuYW1lOiBcIkFkZCBFeHBlbnNlXCIsXHJcbiAgICAgICAgICAgIHNob3J0X25hbWU6IFwiQWRkXCIsXHJcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIkxvZyBhIG5ldyBleHBlbnNlIHF1aWNrbHlcIixcclxuICAgICAgICAgICAgdXJsOiBcIi8/YWN0aW9uPWFkZFwiLFxyXG4gICAgICAgICAgICBpY29uczogW3sgc3JjOiBcInB3YS0xOTJ4MTkyLnBuZ1wiLCBzaXplczogXCIxOTJ4MTkyXCIsIHR5cGU6IFwiaW1hZ2UvcG5nXCIgfV1cclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICB7XHJcbiAgICAgICAgICAgIG5hbWU6IFwiVmlldyBJbnNpZ2h0c1wiLFxyXG4gICAgICAgICAgICBzaG9ydF9uYW1lOiBcIkluc2lnaHRzXCIsXHJcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIkNoZWNrIHlvdXIgc3BlbmRpbmcgdHJlbmRzXCIsXHJcbiAgICAgICAgICAgIHVybDogXCIvYW5hbHl0aWNzXCIsXHJcbiAgICAgICAgICAgIGljb25zOiBbeyBzcmM6IFwicHdhLTE5MngxOTIucG5nXCIsIHNpemVzOiBcIjE5MngxOTJcIiwgdHlwZTogXCJpbWFnZS9wbmdcIiB9XVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIF0sXHJcbiAgICAgICAgc2hhcmVfdGFyZ2V0OiB7XHJcbiAgICAgICAgICBhY3Rpb246IFwiLz9hY3Rpb249YWRkXCIsXHJcbiAgICAgICAgICBtZXRob2Q6IFwiR0VUXCIsXHJcbiAgICAgICAgICBwYXJhbXM6IHtcclxuICAgICAgICAgICAgdGl0bGU6IFwidGl0bGVcIixcclxuICAgICAgICAgICAgdGV4dDogXCJ0ZXh0XCIsXHJcbiAgICAgICAgICAgIHVybDogXCJ1cmxcIlxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgfSxcclxuICAgICAgd29ya2JveDoge1xyXG4gICAgICAgIGNsZWFudXBPdXRkYXRlZENhY2hlczogdHJ1ZSxcclxuICAgICAgICBjbGllbnRzQ2xhaW06IHRydWUsXHJcbiAgICAgICAgc2tpcFdhaXRpbmc6IHRydWUsXHJcbiAgICAgICAgbmF2aWdhdGVGYWxsYmFja0RlbnlsaXN0OiBbL15cXC8uKlxcLmpzJC8sIC9eXFwvLipcXC5jc3MkLywgL15cXC8uKlxcLnBuZyQvLCAvXlxcLy4qXFwuanNvbiQvXVxyXG4gICAgICB9LFxyXG4gICAgfSlcclxuICBdLFxyXG4gIGJhc2U6ICcvJyxcclxuICBidWlsZDoge1xyXG4gICAgcm9sbHVwT3B0aW9uczoge1xyXG4gICAgICBvdXRwdXQ6IHtcclxuICAgICAgICBtYW51YWxDaHVua3MoaWQpIHtcclxuICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnbm9kZV9tb2R1bGVzJykpIHtcclxuICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdmaXJlYmFzZScpKSByZXR1cm4gJ2ZpcmViYXNlJztcclxuICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdyZWFjdC1pb25pY29ucycpKSByZXR1cm4gJ2ljb25zJztcclxuICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdodG1sMmNhbnZhcycpIHx8IGlkLmluY2x1ZGVzKCdqc3BkZicpKSByZXR1cm4gJ3BkZic7XHJcbiAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnQGdvb2dsZS9nZW5lcmF0aXZlLWFpJykpIHJldHVybiAnYWknO1xyXG4gICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ3JlY2hhcnRzJykpIHJldHVybiAnY2hhcnRzJztcclxuICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdmcmFtZXItbW90aW9uJykpIHJldHVybiAnZnJhbWVyJztcclxuICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdyZWFjdC1yb3V0ZXInKSB8fCBpZC5pbmNsdWRlcygncmVhY3QtZG9tJykgfHwgaWQuaW5jbHVkZXMoJ3JlYWN0LycpKSByZXR1cm4gJ3ZlbmRvcic7XHJcbiAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnZGF0ZS1mbnMnKSB8fCBpZC5pbmNsdWRlcygnY2FudmFzLWNvbmZldHRpJykpIHJldHVybiAndXRpbHMnO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfSxcclxuICAgIGNodW5rU2l6ZVdhcm5pbmdMaW1pdDogMTAwMFxyXG4gIH1cclxufSk7Il0sCiAgIm1hcHBpbmdzIjogIjtBQUE4VSxTQUFTLG9CQUFvQjtBQUMzVyxPQUFPLFdBQVc7QUFDbEIsU0FBUyxlQUFlO0FBR3hCLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFNBQVM7QUFBQSxJQUNQLE1BQU07QUFBQSxJQUNOLFFBQVE7QUFBQSxNQUNOLGNBQWM7QUFBQSxNQUNkLGVBQWUsQ0FBQyxlQUFlLHdCQUF3QixpQkFBaUI7QUFBQSxNQUN4RSxVQUFVO0FBQUEsUUFDUixNQUFNO0FBQUEsUUFDTixZQUFZO0FBQUEsUUFDWixhQUFhO0FBQUEsUUFDYixTQUFTO0FBQUE7QUFBQSxRQUNULE9BQU87QUFBQSxRQUNQLFdBQVc7QUFBQSxRQUNYLGFBQWE7QUFBQSxRQUNiLGFBQWE7QUFBQSxRQUNiLGtCQUFrQjtBQUFBLFFBQ2xCLE9BQU87QUFBQSxVQUNMO0FBQUEsWUFDRSxLQUFLO0FBQUEsWUFDTCxPQUFPO0FBQUEsWUFDUCxNQUFNO0FBQUEsVUFDUjtBQUFBLFVBQ0E7QUFBQSxZQUNFLEtBQUs7QUFBQSxZQUNMLE9BQU87QUFBQSxZQUNQLE1BQU07QUFBQSxVQUNSO0FBQUEsVUFDQTtBQUFBLFlBQ0UsS0FBSztBQUFBLFlBQ0wsT0FBTztBQUFBLFlBQ1AsTUFBTTtBQUFBLFlBQ04sU0FBUztBQUFBLFVBQ1g7QUFBQSxRQUNGO0FBQUEsUUFDQSxXQUFXO0FBQUEsVUFDVDtBQUFBLFlBQ0UsTUFBTTtBQUFBLFlBQ04sWUFBWTtBQUFBLFlBQ1osYUFBYTtBQUFBLFlBQ2IsS0FBSztBQUFBLFlBQ0wsT0FBTyxDQUFDLEVBQUUsS0FBSyxtQkFBbUIsT0FBTyxXQUFXLE1BQU0sWUFBWSxDQUFDO0FBQUEsVUFDekU7QUFBQSxVQUNBO0FBQUEsWUFDRSxNQUFNO0FBQUEsWUFDTixZQUFZO0FBQUEsWUFDWixhQUFhO0FBQUEsWUFDYixLQUFLO0FBQUEsWUFDTCxPQUFPLENBQUMsRUFBRSxLQUFLLG1CQUFtQixPQUFPLFdBQVcsTUFBTSxZQUFZLENBQUM7QUFBQSxVQUN6RTtBQUFBLFFBQ0Y7QUFBQSxRQUNBLGNBQWM7QUFBQSxVQUNaLFFBQVE7QUFBQSxVQUNSLFFBQVE7QUFBQSxVQUNSLFFBQVE7QUFBQSxZQUNOLE9BQU87QUFBQSxZQUNQLE1BQU07QUFBQSxZQUNOLEtBQUs7QUFBQSxVQUNQO0FBQUEsUUFDRjtBQUFBLE1BQ0Y7QUFBQSxNQUNBLFNBQVM7QUFBQSxRQUNQLHVCQUF1QjtBQUFBLFFBQ3ZCLGNBQWM7QUFBQSxRQUNkLGFBQWE7QUFBQSxRQUNiLDBCQUEwQixDQUFDLGNBQWMsZUFBZSxlQUFlLGNBQWM7QUFBQSxNQUN2RjtBQUFBLElBQ0YsQ0FBQztBQUFBLEVBQ0g7QUFBQSxFQUNBLE1BQU07QUFBQSxFQUNOLE9BQU87QUFBQSxJQUNMLGVBQWU7QUFBQSxNQUNiLFFBQVE7QUFBQSxRQUNOLGFBQWEsSUFBSTtBQUNmLGNBQUksR0FBRyxTQUFTLGNBQWMsR0FBRztBQUMvQixnQkFBSSxHQUFHLFNBQVMsVUFBVSxFQUFHLFFBQU87QUFDcEMsZ0JBQUksR0FBRyxTQUFTLGdCQUFnQixFQUFHLFFBQU87QUFDMUMsZ0JBQUksR0FBRyxTQUFTLGFBQWEsS0FBSyxHQUFHLFNBQVMsT0FBTyxFQUFHLFFBQU87QUFDL0QsZ0JBQUksR0FBRyxTQUFTLHVCQUF1QixFQUFHLFFBQU87QUFDakQsZ0JBQUksR0FBRyxTQUFTLFVBQVUsRUFBRyxRQUFPO0FBQ3BDLGdCQUFJLEdBQUcsU0FBUyxlQUFlLEVBQUcsUUFBTztBQUN6QyxnQkFBSSxHQUFHLFNBQVMsY0FBYyxLQUFLLEdBQUcsU0FBUyxXQUFXLEtBQUssR0FBRyxTQUFTLFFBQVEsRUFBRyxRQUFPO0FBQzdGLGdCQUFJLEdBQUcsU0FBUyxVQUFVLEtBQUssR0FBRyxTQUFTLGlCQUFpQixFQUFHLFFBQU87QUFBQSxVQUN4RTtBQUFBLFFBQ0Y7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUFBLElBQ0EsdUJBQXVCO0FBQUEsRUFDekI7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
