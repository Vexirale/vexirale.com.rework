import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Custom apex domain (vexirale.com) is served from the site root,
// so base must be "/" — NOT "/repo-name/".
export default defineConfig({
  base: "/",
  plugins: [react()],
  build: {
    // lucide-react is imported wholesale so any icon name works from config;
    // split vendors so that weight is cached separately from app code.
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom"],
          motion: ["framer-motion"],
          icons: ["lucide-react"],
        },
      },
    },
    chunkSizeWarningLimit: 900,
  },
});
