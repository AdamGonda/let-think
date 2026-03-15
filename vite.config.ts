import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Env vars from .env, .env.local, .env.[mode] are auto-loaded.
  // Only variables prefixed with VITE_ are exposed to the client.
  envPrefix: 'VITE_',
})
