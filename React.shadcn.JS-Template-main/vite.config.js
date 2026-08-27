import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const proxyTarget = (env.VITE_DEV_API_PROXY || "http://20.109.106.169").replace(/\/api\/?$/, "");

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
    },
    server: {
      proxy: {
        "/api": {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
          ws: true,
          // Video HLS transcoding can take 60s+; avoid ERR_CONNECTION_RESET from proxy timeout
          timeout: 600_000,
          proxyTimeout: 600_000,
        },
        "/uploads": {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
          timeout: 600_000,
          proxyTimeout: 600_000,
        },
      },
    },
  };
});
