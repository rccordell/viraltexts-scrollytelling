import { existsSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import { serveExhibitsPlugin } from './server/serveExhibits.js'

const rootDir = path.dirname(fileURLToPath(import.meta.url))
const exhibitsDir = path.join(rootDir, 'exhibits')

// Published exhibits are every non-underscore-prefixed folder under
// exhibits/ (an "_"-prefixed folder, like _fixture, is dev-only test
// content and never ships). Only exhibit.json + the generated tile
// pyramids are copied — raw source images (source.tiff, etc.) are
// deliberately excluded from the deployed output.
const exhibitSlugs = readdirSync(exhibitsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && !entry.name.startsWith('_'))
  .map((entry) => entry.name)

const staticCopyTargets = exhibitSlugs.flatMap((slug) => {
  const dir = path.join(exhibitsDir, slug)
  const targets = [{ src: `exhibits/${slug}/exhibit.json`, dest: '.' }]
  // Legacy page-1 layout: tiles sit flat under the exhibit's own folder.
  if (existsSync(path.join(dir, 'tiles.dzi'))) {
    targets.push({ src: `exhibits/${slug}/tiles.dzi`, dest: '.' })
  }
  if (existsSync(path.join(dir, 'tiles_files'))) {
    targets.push({ src: `exhibits/${slug}/tiles_files`, dest: '.' })
  }
  // Every page beyond the first tiles into its own pages/<pageId>/ folder.
  if (existsSync(path.join(dir, 'pages'))) {
    targets.push({ src: `exhibits/${slug}/pages`, dest: '.' })
  }
  return targets
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    serveExhibitsPlugin(),
    viteStaticCopy({ targets: staticCopyTargets }),
  ],
})
