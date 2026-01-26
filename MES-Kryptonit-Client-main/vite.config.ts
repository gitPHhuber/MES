import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  // Preview (npm run preview)
  const previewHost = env.VITE_PREVIEW_HOST || "localhost";
  const previewPortRaw = Number.parseInt(env.VITE_PREVIEW_PORT || "4173", 10);
  const previewPort = Number.isNaN(previewPortRaw) ? 4173 : previewPortRaw;

  // Dev proxy targets (npm run dev)
  // Можно переопределять через .env.* чтобы не ловить "кривые маршруты" после миграций
  const apiTarget = env.VITE_API_TARGET || "http://10.11.0.16:5001";
  const socketTarget = env.VITE_SOCKET_TARGET || "http://10.11.0.16:5002";

  return {
    server: {
      // если нужно открывать dev-сервер с другой машины в сети
      host: env.VITE_DEV_HOST || "0.0.0.0",
      port: Number(env.VITE_DEV_PORT || 5173),

      proxy: {
        "/api": {
          target: apiTarget,
          changeOrigin: true,
        },
        "/socket.io": {
          target: socketTarget,
          changeOrigin: true,
          ws: true,
        },
      },
    },

    preview: {
      host: previewHost,
      port: previewPort,
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
            { src: "pwa-64x64.png", sizes: "64x64", type: "image/png" },
            { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
            { src: "pwa-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
            { src: "maskable-icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
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
