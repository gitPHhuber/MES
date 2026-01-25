import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const previewHost = env.VITE_PREVIEW_HOST || "localhost";
  const previewPort = Number.parseInt(env.VITE_PREVIEW_PORT || "4173", 10);

  return {
    preview: {
      host: previewHost,
      port: Number.isNaN(previewPort) ? 4173 : previewPort,
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
  };
});
