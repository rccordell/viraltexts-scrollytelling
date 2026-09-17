import type { Exhibit } from "../viewer/schema";

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  listExhibits: () =>
    fetch("/api/exhibits").then((r) => json<{ slug: string; title: string }[]>(r)),

  getExhibit: (slug: string) =>
    fetch(`/api/exhibits/${slug}`).then((r) => json<Exhibit>(r)),

  saveExhibit: (slug: string, exhibit: Exhibit) =>
    fetch(`/api/exhibits/${slug}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(exhibit),
    }).then((r) => json<{ ok: true }>(r)),

  createExhibit: (slug: string) =>
    fetch(`/api/exhibits/${slug}/create`, { method: "POST" }).then((r) =>
      json<{ ok: true }>(r),
    ),

  importImage: (slug: string, sourcePath: string) =>
    fetch(`/api/exhibits/${slug}/import-image`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourcePath }),
    }).then((r) => json<{ ok: true; width: number; height: number; dziPath: string }>(r)),
};
