import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// In Docker, VITE_BACKEND_HOST is set to the compose service name (e.g. "app").
// Locally it falls back to "localhost".
const backendHost = process.env.VITE_BACKEND_HOST ?? "localhost";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true, // Required to expose Vite dev server outside Docker container
    proxy: {
      "/api": `http://${backendHost}:3000`,
      "/socket.io": { target: `ws://${backendHost}:3000`, ws: true },
    },
  },
});
