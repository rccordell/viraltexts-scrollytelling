import type { Plugin } from "vite";
import { createReadStream, existsSync, statSync } from "node:fs";
import path from "node:path";

const EXHIBITS_DIR = path.resolve(process.cwd(), "exhibits");

const CONTENT_TYPES: Record<string, string> = {
  ".json": "application/json",
  ".dzi": "application/xml",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".tiff": "image/tiff",
};

/**
 * Dev-only Vite middleware serving `exhibits/<slug>/...` at `/exhibits/<slug>/...`,
 * so the reader/editor can fetch exhibit.json and DZI tiles without a
 * separate static-copy step during development. At build time, a real copy
 * step (scripts/generateManifest.mjs) puts these files into dist/exhibits/.
 */
export function serveExhibitsPlugin(): Plugin {
  return {
    name: "serve-exhibits",
    configureServer(server) {
      server.middlewares.use("/exhibits", (req, res, next) => {
        // Requests with a query string (?import, ?url, ?t=...) are Vite's own
        // module-transform pipeline (e.g. a JS `import x from '*.json'`) —
        // let Vite handle those. This middleware only serves plain runtime
        // fetch()/tile requests, which never carry a query string.
        if ((req.url ?? "").includes("?")) return next();

        const reqPath = decodeURIComponent((req.url ?? "").split("?")[0]);
        const filePath = path.join(EXHIBITS_DIR, reqPath);

        if (!filePath.startsWith(EXHIBITS_DIR)) {
          res.statusCode = 403;
          return res.end("Forbidden");
        }
        if (!existsSync(filePath) || !statSync(filePath).isFile()) {
          return next();
        }

        const ext = path.extname(filePath).toLowerCase();
        res.setHeader(
          "Content-Type",
          CONTENT_TYPES[ext] ?? "application/octet-stream",
        );
        createReadStream(filePath).pipe(res);
      });
    },
  };
}
