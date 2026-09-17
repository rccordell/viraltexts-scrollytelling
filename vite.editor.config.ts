import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { serveExhibitsPlugin } from './server/serveExhibits.js'
import { editorApiPlugin } from './server/editorApiPlugin.js'

// Authoring-only config: adds the filesystem-write API. Never used for
// `vite build` — see vite.config.ts for the production (API-free) config.
export default defineConfig({
  plugins: [react(), serveExhibitsPlugin(), editorApiPlugin()],
  server: {
    port: 5174,
    open: '/editor.html',
  },
})
