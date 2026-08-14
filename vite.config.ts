import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  build: {
    target: "es2022",
    sourcemap: false,
  },
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg"],
      manifest: {
        name: "Local Image Resizer",
        short_name: "Image Resizer",
        description:
          "Offline, privacy-first image resizer for app icons and social media. Nothing is ever uploaded.",
        theme_color: "#4f6ef7",
        background_color: "#f4f6fb",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico}"],
        // Never cache user image data — only app shell assets.
        navigateFallbackDenylist: [/^\/privacy/],
      },
    }),
  ],
});
