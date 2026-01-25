import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    proxy: {
      "/api": {
        target: "http://10.11.0.16:5001",
        changeOrigin: true,
      },
      "/socket.io": {
        target: "http://10.11.0.16:5002",
        changeOrigin: true,
        ws: true,
      },
    },
  },
  preview: {
    host: "10.11.0.15",
    port: 4173,
  },

  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "favicon.ico",
        "apple-touch-icon.png",
        "maskable-icon-512x512.svg",
      ],
      manifest: {
        name: "MES_crypto",
        short_name: "Vite PWA Project",
        theme_color: "#ffffff",
        icons: [
          {
            src: "pwa-64x64.png",
            sizes: "64x64",
            type: "image/png",
          },
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "maskable-icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
  ],

  resolve: {
    alias: {
      public: "/public",
      src: "/src",
      api: "/src/api",
      assets: "/src/assets",
      components: "/src/components",
      pages: "src/pages",
      store: "/src/store",
      types: "/src/types",
    },
  },
});
