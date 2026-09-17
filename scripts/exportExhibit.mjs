import { cpSync, existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { exhibitSchema, migrateExhibitRaw } from "../src/viewer/schema.ts";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const slug = process.argv[2];

if (!slug) {
  console.error("Usage: npm run export -- <slug>");
  process.exit(1);
}

const exhibitDir = path.join(rootDir, "exhibits", slug);
const exhibitJsonPath = path.join(exhibitDir, "exhibit.json");
if (!existsSync(exhibitJsonPath)) {
  console.error(`No exhibit found at exhibits/${slug}/exhibit.json`);
  process.exit(1);
}

let raw;
try {
  raw = JSON.parse(readFileSync(exhibitJsonPath, "utf-8"));
} catch (err) {
  console.error(`exhibits/${slug}/exhibit.json is not valid JSON: ${err.message}`);
  process.exit(1);
}

const result = exhibitSchema.safeParse(migrateExhibitRaw(raw));
if (!result.success) {
  console.error(
    `exhibits/${slug}/exhibit.json failed validation:\n${result.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n")}`,
  );
  process.exit(1);
}

console.log(`Building standalone export for "${slug}"...`);
const viteBin = path.join(rootDir, "node_modules", ".bin", "vite");
execFileSync(viteBin, ["build", "--config", "vite.export.config.ts"], {
  cwd: rootDir,
  stdio: "inherit",
  env: { ...process.env, VITE_EXPORT_SLUG: slug },
});

const outDir = path.join(rootDir, "export", slug);

// Vite built export.html as the entry; rename it to index.html so static
// hosts serve it by default for a bare directory request.
renameSync(path.join(outDir, "export.html"), path.join(outDir, "index.html"));

// Write the canonical (migrated, schema-validated) exhibit.json rather than
// copying the raw on-disk file, so the export is self-consistent even if
// the source was still schemaVersion 1.
writeFileSync(path.join(outDir, "exhibit.json"), JSON.stringify(result.data, null, 2) + "\n");

// Copy tiles: the legacy flat page-1 layout, plus a pages/ subfolder if
// this exhibit has more than one page.
for (const name of ["tiles.dzi", "tiles_files", "pages"]) {
  const src = path.join(exhibitDir, name);
  if (existsSync(src)) {
    cpSync(src, path.join(outDir, name), { recursive: true });
  }
}

console.log(`\nExported to export/${slug}/`);
console.log(`Upload the contents of that folder to any static web host — it's fully self-contained.`);
