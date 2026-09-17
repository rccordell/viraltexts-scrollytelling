import path from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

// Set by scripts/exportExhibit.mjs, which invokes this config once per
// export (it's the only caller — never run this config directly).
const slug = process.env.VITE_EXPORT_SLUG
if (!slug) {
  throw new Error(
    'VITE_EXPORT_SLUG is required. Run this via `npm run export -- <slug>`, not directly.',
  )
}

// base: './' — relative asset paths, so the built folder works when
// uploaded to any subdirectory of any static host, not just site root.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    outDir: path.resolve(rootDir, 'export', slug),
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(rootDir, 'export.html'),
    },
  },
})
