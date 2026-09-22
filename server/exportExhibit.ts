import { cpSync, existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
// Explicit .ts extension: this module is imported both by Vite (which
// remaps .js specifiers to sibling .ts files) and directly by plain Node
// via scripts/exportExhibit.mjs (native TS-stripping resolution, which
// needs the real extension).
import { exhibitSchema, migrateExhibitRaw } from "../src/viewer/schema.ts";

const execFileAsync = promisify(execFile);

/** A validation/not-found failure, distinct from an unexpected build error —
 * callers (the CLI script, the editor API) use this to decide how to report
 * the failure to whoever triggered the export. */
export class ExportError extends Error {}

/**
 * Builds a fully self-contained static bundle for one exhibit into
 * export/<slug>/, ready to upload to any static host. Shared by
 * scripts/exportExhibit.mjs (the `npm run export` CLI) and the editor's
 * "Export" button (server/editorApiPlugin.ts) so both paths do exactly the
 * same thing.
 */
export async function exportExhibit(rootDir: string, slug: string): Promise<{ outDir: string }> {
  const exhibitDir = path.join(rootDir, "exhibits", slug);
  const exhibitJsonPath = path.join(exhibitDir, "exhibit.json");
  if (!existsSync(exhibitJsonPath)) {
    throw new ExportError(`No exhibit found at exhibits/${slug}/exhibit.json`);
  }

  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(exhibitJsonPath, "utf-8"));
  } catch (err) {
    throw new ExportError(`exhibits/${slug}/exhibit.json is not valid JSON: ${(err as Error).message}`);
  }

  const result = exhibitSchema.safeParse(migrateExhibitRaw(raw));
  if (!result.success) {
    throw new ExportError(
      `exhibits/${slug}/exhibit.json failed validation:\n${result.error.issues
        .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
        .join("\n")}`,
    );
  }

  const viteBin = path.join(rootDir, "node_modules", ".bin", "vite");
  try {
    await execFileAsync(viteBin, ["build", "--config", "vite.export.config.ts"], {
      cwd: rootDir,
      env: { ...process.env, VITE_EXPORT_SLUG: slug },
    });
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; message: string };
    throw new Error(`Export build failed: ${e.stderr || e.stdout || e.message}`);
  }

  const outDir = path.join(rootDir, "export", slug);

  // Vite built export.html as the entry; rename it to index.html so static
  // hosts serve it by default for a bare directory request.
  renameSync(path.join(outDir, "export.html"), path.join(outDir, "index.html"));

  // Write the canonical (migrated, schema-validated) exhibit.json rather
  // than copying the raw on-disk file, so the export is self-consistent
  // even if the source was still schemaVersion 1.
  writeFileSync(path.join(outDir, "exhibit.json"), JSON.stringify(result.data, null, 2) + "\n");

  // Copy tiles: the legacy flat page-1 layout, plus a pages/ subfolder if
  // this exhibit has more than one page.
  for (const name of ["tiles.dzi", "tiles_files", "pages"]) {
    const src = path.join(exhibitDir, name);
    if (existsSync(src)) {
      cpSync(src, path.join(outDir, name), { recursive: true });
    }
  }

  return { outDir };
}
