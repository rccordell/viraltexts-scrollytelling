import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

export async function readJson<T>(filePath: string): Promise<T> {
  const raw = await readFile(filePath, "utf-8");
  return JSON.parse(raw) as T;
}

/** Writes JSON via a temp file + rename so readers never see a partial write. */
export async function writeJsonAtomic(
  filePath: string,
  data: unknown,
): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  const tmpPath = `${filePath}.${crypto.randomUUID()}.tmp`;
  await writeFile(tmpPath, JSON.stringify(data, null, 2) + "\n", "utf-8");
  await rename(tmpPath, filePath);
}
