import path from "node:path";
import { fileURLToPath } from "node:url";
import { exportExhibit, ExportError } from "../server/exportExhibit.ts";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const slug = process.argv[2];

if (!slug) {
  console.error("Usage: npm run export -- <slug>");
  process.exit(1);
}

console.log(`Building standalone export for "${slug}"...`);

try {
  const { outDir } = await exportExhibit(rootDir, slug);
  const rel = path.relative(rootDir, outDir);
  console.log(`\nExported to ${rel}/`);
  console.log(`Upload the contents of that folder to any static web host — it's fully self-contained.`);
} catch (err) {
  console.error(err instanceof ExportError ? err.message : `Export failed: ${err.message}`);
  process.exit(1);
}
