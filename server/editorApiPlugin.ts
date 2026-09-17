import type { Plugin, ViteDevServer } from "vite";
import type { IncomingMessage, ServerResponse } from "node:http";
import { existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { readJson, writeJsonAtomic } from "./fsUtil.js";
import { generateDziTiles } from "./tiling.js";

const EXHIBITS_DIR = path.resolve(process.cwd(), "exhibits");
const SLUG_RE = /^[a-z0-9][a-z0-9_-]*$/i;

function isValidSlug(slug: string): boolean {
  return SLUG_RE.test(slug);
}

function exhibitPath(slug: string): string {
  return path.join(EXHIBITS_DIR, slug, "exhibit.json");
}

async function readBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const raw = Buffer.concat(chunks).toString("utf-8");
  return raw ? JSON.parse(raw) : {};
}

function sendJson(res: ServerResponse, status: number, data: unknown): void {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(data));
}

async function handleError(
  res: ServerResponse,
  err: unknown,
  fallbackStatus = 500,
): Promise<void> {
  const message = err instanceof Error ? err.message : String(err);
  sendJson(res, fallbackStatus, { error: message });
}

/**
 * Dev-only Vite middleware providing the filesystem-backed authoring API.
 * Only wired into vite.editor.config.ts — never into the production config,
 * so it structurally cannot ship in a static `dist/` build.
 */
export function editorApiPlugin(): Plugin {
  return {
    name: "editor-api",
    configureServer(server: ViteDevServer) {
      server.middlewares.use("/api/exhibits", async (req, res, next) => {
        try {
          const url = new URL(req.url ?? "/", "http://localhost");
          const segments = url.pathname.split("/").filter(Boolean);
          const method = req.method ?? "GET";

          // GET /api/exhibits -> list
          if (segments.length === 0 && method === "GET") {
            await mkdirIfMissing(EXHIBITS_DIR);
            const entries = await readdir(EXHIBITS_DIR, {
              withFileTypes: true,
            });
            const exhibits = await Promise.all(
              entries
                .filter((e) => e.isDirectory() && isValidSlug(e.name))
                .map(async (e) => {
                  const p = exhibitPath(e.name);
                  if (!existsSync(p)) return null;
                  const data = await readJson<{ title?: string }>(p);
                  return { slug: e.name, title: data.title ?? e.name };
                }),
            );
            return sendJson(
              res,
              200,
              exhibits.filter((e): e is { slug: string; title: string } => !!e),
            );
          }

          const [slug, action] = segments;
          if (!slug || !isValidSlug(slug)) {
            return sendJson(res, 400, { error: "Invalid slug" });
          }

          // GET /api/exhibits/:slug
          if (segments.length === 1 && method === "GET") {
            const p = exhibitPath(slug);
            if (!existsSync(p)) return sendJson(res, 404, { error: "Not found" });
            return sendJson(res, 200, await readJson(p));
          }

          // PUT /api/exhibits/:slug
          if (segments.length === 1 && method === "PUT") {
            const body = await readBody(req);
            await writeJsonAtomic(exhibitPath(slug), body);
            return sendJson(res, 200, { ok: true });
          }

          // POST /api/exhibits/:slug/create
          if (segments.length === 2 && action === "create" && method === "POST") {
            const p = exhibitPath(slug);
            if (existsSync(p)) {
              return sendJson(res, 409, { error: "Exhibit already exists" });
            }
            await writeJsonAtomic(p, {
              schemaVersion: 2,
              slug,
              title: slug,
              pages: [
                {
                  id: "page-1",
                  waypoints: [],
                  image: { dziPath: "tiles.dzi", width: 0, height: 0, tileSize: 256, overlap: 1 },
                },
              ],
            });
            return sendJson(res, 201, { ok: true });
          }

          // POST /api/exhibits/:slug/pages/:pageId/import-image  { sourcePath: string }
          if (
            segments.length === 4 &&
            segments[1] === "pages" &&
            segments[3] === "import-image" &&
            method === "POST"
          ) {
            const pageId = segments[2];
            if (!isValidSlug(pageId)) {
              return sendJson(res, 400, { error: "Invalid page id" });
            }
            const body = (await readBody(req)) as { sourcePath?: string };
            if (!body.sourcePath) {
              return sendJson(res, 400, { error: "sourcePath is required" });
            }
            const sourcePath = path.resolve(process.cwd(), body.sourcePath);
            if (!existsSync(sourcePath)) {
              return sendJson(res, 400, {
                error: `Source image not found: ${body.sourcePath}`,
              });
            }

            const p = exhibitPath(slug);
            if (!existsSync(p)) {
              return sendJson(res, 404, { error: "Exhibit not found" });
            }
            const existing = await readJson<{ pages?: { id: string }[] }>(p);
            if (!existing.pages?.some((page) => page.id === pageId)) {
              return sendJson(res, 404, { error: "Page not found" });
            }

            // Legacy page-1 (migrated from a v1 exhibit, or created via
            // POST .../create above) keeps its flat exhibits/<slug>/ layout;
            // every other page tiles into its own pages/<pageId>/ folder.
            const outDir =
              pageId === "page-1"
                ? path.join(EXHIBITS_DIR, slug)
                : path.join(EXHIBITS_DIR, slug, "pages", pageId);
            const result = await generateDziTiles(sourcePath, outDir);
            const dziPath =
              pageId === "page-1" ? result.dziPath : path.posix.join("pages", pageId, result.dziPath);

            const updated = {
              ...existing,
              pages: existing.pages!.map((page) =>
                page.id === pageId
                  ? {
                      ...page,
                      image: {
                        dziPath,
                        width: result.width,
                        height: result.height,
                        tileSize: 256,
                        overlap: 1,
                      },
                    }
                  : page,
              ),
            };
            await writeJsonAtomic(p, updated);
            return sendJson(res, 200, { ok: true, width: result.width, height: result.height, dziPath });
          }

          return next();
        } catch (err) {
          await handleError(res, err);
        }
      });
    },
  };
}

async function mkdirIfMissing(dir: string): Promise<void> {
  const { mkdir } = await import("node:fs/promises");
  await mkdir(dir, { recursive: true });
}
