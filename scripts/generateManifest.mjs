import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { exhibitSchema } from "../src/viewer/schema.ts";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const exhibitsDir = path.join(rootDir, "exhibits");

const slugs = readdirSync(exhibitsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && !entry.name.startsWith("_"))
  .map((entry) => entry.name)
  .sort();

const manifest = slugs.map((slug) => {
  const exhibitPath = path.join(exhibitsDir, slug, "exhibit.json");
  let raw;
  try {
    raw = JSON.parse(readFileSync(exhibitPath, "utf-8"));
  } catch (err) {
    throw new Error(`exhibits/${slug}/exhibit.json is missing or not valid JSON: ${err.message}`);
  }

  const result = exhibitSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(
      `exhibits/${slug}/exhibit.json failed validation:\n${result.error.issues
        .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
        .join("\n")}`,
    );
  }

  return { slug, title: result.data.title, subtitle: result.data.subtitle };
});

writeFileSync(
  path.join(exhibitsDir, "manifest.json"),
  JSON.stringify(manifest, null, 2) + "\n",
);

console.log(`Wrote exhibits/manifest.json with ${manifest.length} exhibit(s): ${slugs.join(", ") || "(none)"}`);
