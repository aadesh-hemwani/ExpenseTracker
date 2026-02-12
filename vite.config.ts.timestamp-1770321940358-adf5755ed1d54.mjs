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
        name: "Expenses.",
        short_name: "Expenses",
        description: "Track your daily expenses with function and form.",
        display: "standalone",
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
        globIgnores: ["**/*react-ionicons_lib*"],
        navigateFallbackDenylist: [/^\/.*\.js$/, /^\/.*\.css$/, /^\/.*\.png$/, /^\/.*\.json$/]
      }
    })
  ],
  base: "/",
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor": ["react", "react-dom", "react-router-dom"],
          "firebase": ["firebase/app", "firebase/auth", "firebase/firestore", "firebase/analytics"],
          "ui": ["framer-motion", "react-ionicons", "clsx", "tailwind-merge"],
          "charts": ["recharts"]
        }
      }
    },
    chunkSizeWarningLimit: 1e3
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxhYWRlc1xcXFxPbmVEcml2ZVxcXFxEb2N1bWVudHNcXFxcRXhwZW5zZVRyYWNrZXJcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXGFhZGVzXFxcXE9uZURyaXZlXFxcXERvY3VtZW50c1xcXFxFeHBlbnNlVHJhY2tlclxcXFx2aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVXNlcnMvYWFkZXMvT25lRHJpdmUvRG9jdW1lbnRzL0V4cGVuc2VUcmFja2VyL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSc7XHJcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XHJcbmltcG9ydCB7IFZpdGVQV0EgfSBmcm9tICd2aXRlLXBsdWdpbi1wd2EnO1xyXG5cclxuLy8gaHR0cHM6Ly92aXRlanMuZGV2L2NvbmZpZy9cclxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcclxuICBwbHVnaW5zOiBbXHJcbiAgICByZWFjdCgpLFxyXG4gICAgVml0ZVBXQSh7XHJcbiAgICAgIHJlZ2lzdGVyVHlwZTogJ2F1dG9VcGRhdGUnLFxyXG4gICAgICBpbmNsdWRlQXNzZXRzOiBbJ2Zhdmljb24uaWNvJywgJ2FwcGxlLXRvdWNoLWljb24ucG5nJywgJ21hc2tlZC1pY29uLnN2ZyddLFxyXG4gICAgICBtYW5pZmVzdDoge1xyXG4gICAgICAgIG5hbWU6ICdFeHBlbnNlcy4nLFxyXG4gICAgICAgIHNob3J0X25hbWU6ICdFeHBlbnNlcycsXHJcbiAgICAgICAgZGVzY3JpcHRpb246ICdUcmFjayB5b3VyIGRhaWx5IGV4cGVuc2VzIHdpdGggZnVuY3Rpb24gYW5kIGZvcm0uJyxcclxuICAgICAgICBkaXNwbGF5OiAnc3RhbmRhbG9uZScsIFxyXG4gICAgICAgIHNjb3BlOiAnLycsXHJcbiAgICAgICAgc3RhcnRfdXJsOiAnLycsXHJcbiAgICAgICAgb3JpZW50YXRpb246ICdwb3J0cmFpdCcsXHJcbiAgICAgICAgdGhlbWVfY29sb3I6ICcjZmZmZmZmJyxcclxuICAgICAgICBiYWNrZ3JvdW5kX2NvbG9yOiAnI2ZmZmZmZicsXHJcbiAgICAgICAgaWNvbnM6IFtcclxuICAgICAgICAgIHtcclxuICAgICAgICAgICAgc3JjOiAncHdhLTE5MngxOTIucG5nJyxcclxuICAgICAgICAgICAgc2l6ZXM6ICcxOTJ4MTkyJyxcclxuICAgICAgICAgICAgdHlwZTogJ2ltYWdlL3BuZydcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICB7XHJcbiAgICAgICAgICAgIHNyYzogJ3B3YS01MTJ4NTEyLnBuZycsXHJcbiAgICAgICAgICAgIHNpemVzOiAnNTEyeDUxMicsXHJcbiAgICAgICAgICAgIHR5cGU6ICdpbWFnZS9wbmcnXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAge1xyXG4gICAgICAgICAgICBzcmM6ICdwd2EtNTEyeDUxMi5wbmcnLFxyXG4gICAgICAgICAgICBzaXplczogJzUxMng1MTInLFxyXG4gICAgICAgICAgICB0eXBlOiAnaW1hZ2UvcG5nJyxcclxuICAgICAgICAgICAgcHVycG9zZTogJ2FueSBtYXNrYWJsZSdcclxuICAgICAgICAgIH1cclxuICAgICAgICBdLFxyXG4gICAgICAgIHNob3J0Y3V0czogW1xyXG4gICAgICAgICAge1xyXG4gICAgICAgICAgICBuYW1lOiBcIkFkZCBFeHBlbnNlXCIsXHJcbiAgICAgICAgICAgIHNob3J0X25hbWU6IFwiQWRkXCIsXHJcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIkxvZyBhIG5ldyBleHBlbnNlIHF1aWNrbHlcIixcclxuICAgICAgICAgICAgdXJsOiBcIi8/YWN0aW9uPWFkZFwiLFxyXG4gICAgICAgICAgICBpY29uczogW3sgc3JjOiBcInB3YS0xOTJ4MTkyLnBuZ1wiLCBzaXplczogXCIxOTJ4MTkyXCIsIHR5cGU6IFwiaW1hZ2UvcG5nXCIgfV1cclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICB7XHJcbiAgICAgICAgICAgIG5hbWU6IFwiVmlldyBJbnNpZ2h0c1wiLFxyXG4gICAgICAgICAgICBzaG9ydF9uYW1lOiBcIkluc2lnaHRzXCIsXHJcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIkNoZWNrIHlvdXIgc3BlbmRpbmcgdHJlbmRzXCIsXHJcbiAgICAgICAgICAgIHVybDogXCIvYW5hbHl0aWNzXCIsXHJcbiAgICAgICAgICAgIGljb25zOiBbeyBzcmM6IFwicHdhLTE5MngxOTIucG5nXCIsIHNpemVzOiBcIjE5MngxOTJcIiwgdHlwZTogXCJpbWFnZS9wbmdcIiB9XVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIF0sXHJcbiAgICAgICAgc2hhcmVfdGFyZ2V0OiB7XHJcbiAgICAgICAgICBhY3Rpb246IFwiLz9hY3Rpb249YWRkXCIsXHJcbiAgICAgICAgICBtZXRob2Q6IFwiR0VUXCIsXHJcbiAgICAgICAgICBwYXJhbXM6IHtcclxuICAgICAgICAgICAgdGl0bGU6IFwidGl0bGVcIixcclxuICAgICAgICAgICAgdGV4dDogXCJ0ZXh0XCIsXHJcbiAgICAgICAgICAgIHVybDogXCJ1cmxcIlxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgfSxcclxuICAgICAgd29ya2JveDoge1xyXG4gICAgICAgIGNsZWFudXBPdXRkYXRlZENhY2hlczogdHJ1ZSxcclxuICAgICAgICBjbGllbnRzQ2xhaW06IHRydWUsXHJcbiAgICAgICAgc2tpcFdhaXRpbmc6IHRydWUsXHJcbiAgICAgICAgZ2xvYklnbm9yZXM6IFsnKiovKnJlYWN0LWlvbmljb25zX2xpYionXSxcclxuICAgICAgICBuYXZpZ2F0ZUZhbGxiYWNrRGVueWxpc3Q6IFsvXlxcLy4qXFwuanMkLywgL15cXC8uKlxcLmNzcyQvLCAvXlxcLy4qXFwucG5nJC8sIC9eXFwvLipcXC5qc29uJC9dXHJcbiAgICAgIH0sXHJcbiAgICB9KVxyXG4gIF0sXHJcbiAgYmFzZTogJy8nLFxyXG4gIGJ1aWxkOiB7XHJcbiAgICByb2xsdXBPcHRpb25zOiB7XHJcbiAgICAgIG91dHB1dDoge1xyXG4gICAgICAgIG1hbnVhbENodW5rczoge1xyXG4gICAgICAgICAgJ3ZlbmRvcic6IFsncmVhY3QnLCAncmVhY3QtZG9tJywgJ3JlYWN0LXJvdXRlci1kb20nXSxcclxuICAgICAgICAgICdmaXJlYmFzZSc6IFsnZmlyZWJhc2UvYXBwJywgJ2ZpcmViYXNlL2F1dGgnLCAnZmlyZWJhc2UvZmlyZXN0b3JlJywgJ2ZpcmViYXNlL2FuYWx5dGljcyddLFxyXG4gICAgICAgICAgJ3VpJzogWydmcmFtZXItbW90aW9uJywgJ3JlYWN0LWlvbmljb25zJywgJ2Nsc3gnLCAndGFpbHdpbmQtbWVyZ2UnXSxcclxuICAgICAgICAgICdjaGFydHMnOiBbJ3JlY2hhcnRzJ11cclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH0sXHJcbiAgICBjaHVua1NpemVXYXJuaW5nTGltaXQ6IDEwMDBcclxuICB9XHJcbn0pOyJdLAogICJtYXBwaW5ncyI6ICI7QUFBOFUsU0FBUyxvQkFBb0I7QUFDM1csT0FBTyxXQUFXO0FBQ2xCLFNBQVMsZUFBZTtBQUd4QixJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTO0FBQUEsSUFDUCxNQUFNO0FBQUEsSUFDTixRQUFRO0FBQUEsTUFDTixjQUFjO0FBQUEsTUFDZCxlQUFlLENBQUMsZUFBZSx3QkFBd0IsaUJBQWlCO0FBQUEsTUFDeEUsVUFBVTtBQUFBLFFBQ1IsTUFBTTtBQUFBLFFBQ04sWUFBWTtBQUFBLFFBQ1osYUFBYTtBQUFBLFFBQ2IsU0FBUztBQUFBLFFBQ1QsT0FBTztBQUFBLFFBQ1AsV0FBVztBQUFBLFFBQ1gsYUFBYTtBQUFBLFFBQ2IsYUFBYTtBQUFBLFFBQ2Isa0JBQWtCO0FBQUEsUUFDbEIsT0FBTztBQUFBLFVBQ0w7QUFBQSxZQUNFLEtBQUs7QUFBQSxZQUNMLE9BQU87QUFBQSxZQUNQLE1BQU07QUFBQSxVQUNSO0FBQUEsVUFDQTtBQUFBLFlBQ0UsS0FBSztBQUFBLFlBQ0wsT0FBTztBQUFBLFlBQ1AsTUFBTTtBQUFBLFVBQ1I7QUFBQSxVQUNBO0FBQUEsWUFDRSxLQUFLO0FBQUEsWUFDTCxPQUFPO0FBQUEsWUFDUCxNQUFNO0FBQUEsWUFDTixTQUFTO0FBQUEsVUFDWDtBQUFBLFFBQ0Y7QUFBQSxRQUNBLFdBQVc7QUFBQSxVQUNUO0FBQUEsWUFDRSxNQUFNO0FBQUEsWUFDTixZQUFZO0FBQUEsWUFDWixhQUFhO0FBQUEsWUFDYixLQUFLO0FBQUEsWUFDTCxPQUFPLENBQUMsRUFBRSxLQUFLLG1CQUFtQixPQUFPLFdBQVcsTUFBTSxZQUFZLENBQUM7QUFBQSxVQUN6RTtBQUFBLFVBQ0E7QUFBQSxZQUNFLE1BQU07QUFBQSxZQUNOLFlBQVk7QUFBQSxZQUNaLGFBQWE7QUFBQSxZQUNiLEtBQUs7QUFBQSxZQUNMLE9BQU8sQ0FBQyxFQUFFLEtBQUssbUJBQW1CLE9BQU8sV0FBVyxNQUFNLFlBQVksQ0FBQztBQUFBLFVBQ3pFO0FBQUEsUUFDRjtBQUFBLFFBQ0EsY0FBYztBQUFBLFVBQ1osUUFBUTtBQUFBLFVBQ1IsUUFBUTtBQUFBLFVBQ1IsUUFBUTtBQUFBLFlBQ04sT0FBTztBQUFBLFlBQ1AsTUFBTTtBQUFBLFlBQ04sS0FBSztBQUFBLFVBQ1A7QUFBQSxRQUNGO0FBQUEsTUFDRjtBQUFBLE1BQ0EsU0FBUztBQUFBLFFBQ1AsdUJBQXVCO0FBQUEsUUFDdkIsY0FBYztBQUFBLFFBQ2QsYUFBYTtBQUFBLFFBQ2IsYUFBYSxDQUFDLHlCQUF5QjtBQUFBLFFBQ3ZDLDBCQUEwQixDQUFDLGNBQWMsZUFBZSxlQUFlLGNBQWM7QUFBQSxNQUN2RjtBQUFBLElBQ0YsQ0FBQztBQUFBLEVBQ0g7QUFBQSxFQUNBLE1BQU07QUFBQSxFQUNOLE9BQU87QUFBQSxJQUNMLGVBQWU7QUFBQSxNQUNiLFFBQVE7QUFBQSxRQUNOLGNBQWM7QUFBQSxVQUNaLFVBQVUsQ0FBQyxTQUFTLGFBQWEsa0JBQWtCO0FBQUEsVUFDbkQsWUFBWSxDQUFDLGdCQUFnQixpQkFBaUIsc0JBQXNCLG9CQUFvQjtBQUFBLFVBQ3hGLE1BQU0sQ0FBQyxpQkFBaUIsa0JBQWtCLFFBQVEsZ0JBQWdCO0FBQUEsVUFDbEUsVUFBVSxDQUFDLFVBQVU7QUFBQSxRQUN2QjtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsSUFDQSx1QkFBdUI7QUFBQSxFQUN6QjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
