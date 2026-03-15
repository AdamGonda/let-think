import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Env vars from .env, .env.local, .env.[mode] are auto-loaded.
  // Only variables prefixed with VITE_ are exposed to the client.
  envPrefix: 'VITE_',
})
