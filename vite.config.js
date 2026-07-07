import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite doesn't read the generic PORT env var on its own — without this, a launcher that
// assigns a free port via PORT (rather than a --port flag) gets ignored, and Vite silently
// falls back to its own next-available-port search instead of the one it was actually given.
const port = process.env.PORT ? Number(process.env.PORT) : 5173

export default defineConfig({
  plugins: [react()],
  server: { port, strictPort: false },
  preview: { port },
})
