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
      devOptions: {
        enabled: false,
      },
      includeAssets: ["icons/icon-192.png", "icons/icon-512.png", "placeholder.svg"],
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        navigateFallbackDenylist: [/^\/~oauth/, /^\/zoom-callback/],
        // Skip waiting on new SW install for faster updates
        skipWaiting: false,
        clientsClaim: true,
        runtimeCaching: [
          // Supabase Edge Functions — network-first (always fresh)
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/functions\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-functions-cache",
              expiration: { maxEntries: 50, maxAgeSeconds: 3600 },
              networkTimeoutSeconds: 5,
            },
          },
          // Supabase REST API — network-first
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-rest-cache",
              expiration: { maxEntries: 100, maxAgeSeconds: 300 },
              networkTimeoutSeconds: 5,
            },
          },
          // Hebcal Shabbat — SWR with 7-day cache
          {
            urlPattern: /^https:\/\/www\.hebcal\.com\/shabbat.*/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "hebcal-shabbat-cache",
              expiration: { maxEntries: 10, maxAgeSeconds: 7 * 86400 },
            },
          },
          // Hebcal Zmanim — SWR with 24h cache
          {
            urlPattern: /^https:\/\/www\.hebcal\.com\/zmanim.*/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "hebcal-zmanim-cache",
              expiration: { maxEntries: 30, maxAgeSeconds: 86400 },
            },
          },
          // Other Hebcal — SWR
          {
            urlPattern: /^https:\/\/www\.hebcal\.com\/.*/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "hebcal-cache",
              expiration: { maxEntries: 50, maxAgeSeconds: 86400 },
            },
          },
          // Google Fonts
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "google-fonts-stylesheets",
              expiration: { maxEntries: 10, maxAgeSeconds: 30 * 86400 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-webfonts",
              expiration: { maxEntries: 30, maxAgeSeconds: 365 * 86400 },
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
