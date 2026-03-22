import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/icon-192.png", "icons/icon-512.png", "placeholder.svg"],
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        navigateFallbackDenylist: [/^\/~oauth/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/www\.hebcal\.com\/shabbat.*/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "hebcal-shabbat-cache",
              expiration: { maxEntries: 10, maxAgeSeconds: 7 * 86400 },
            },
          },
          {
            urlPattern: /^https:\/\/www\.hebcal\.com\/zmanim.*/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "hebcal-zmanim-cache",
              expiration: { maxEntries: 30, maxAgeSeconds: 86400 },
            },
          },
          {
            urlPattern: /^https:\/\/www\.hebcal\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "hebcal-cache",
              expiration: { maxEntries: 50, maxAgeSeconds: 86400 },
            },
          },
        ],
      },
      manifest: false, // Use existing public/manifest.json
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
