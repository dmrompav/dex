import path from "path"
import tailwindcss from "@tailwindcss/vite"

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // When deploying to GitHub Pages, set the base path via GH_PAGES_BASE env var
  base: process.env.GH_PAGES_BASE || undefined,
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
