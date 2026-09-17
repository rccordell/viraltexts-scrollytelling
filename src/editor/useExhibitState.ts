import { useCallback, useEffect, useState } from "react";
import {
  exhibitSchema,
  migrateExhibitRaw,
  type AnnotationStyle,
  type Exhibit,
  type ExhibitImage,
  type Page,
  type Region,
  type Theme,
  type Waypoint,
} from "../viewer/schema";
import { api } from "./api";

export type LoadStatus = "loading" | "ready" | "error";

const BLANK_IMAGE: ExhibitImage = {
  dziPath: "tiles.dzi",
  width: 0,
  height: 0,
  tileSize: 256,
  overlap: 1,
};

export function useExhibitState(slug: string) {
  const [exhibit, setExhibit] = useState<Exhibit | null>(null);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setStatus("loading");
    setExhibit(null);
    setDirty(false);
    api
      .getExhibit(slug)
      .then((raw) => {
        setExhibit(exhibitSchema.parse(migrateExhibitRaw(raw)));
        setStatus("ready");
      })
      .catch((err) => {
        setError(String(err));
        setStatus("error");
      });
  }, [slug]);

  const mutate = useCallback((fn: (e: Exhibit) => Exhibit) => {
    setExhibit((prev) => (prev ? fn(prev) : prev));
    setDirty(true);
  }, []);

  const mutatePage = useCallback(
    (pageId: string, fn: (p: Page) => Page) => {
      mutate((e) => ({
        ...e,
        pages: e.pages.map((p) => (p.id === pageId ? fn(p) : p)),
      }));
    },
    [mutate],
  );

  const addWaypoint = useCallback(
    (pageId: string, id: string, region: Region) => {
      mutatePage(pageId, (p) => ({
        ...p,
        waypoints: [
          ...p.waypoints,
          { id, kind: "waypoint", region, zoomPadding: 0.15, body: "" } satisfies Waypoint,
        ],
      }));
    },
    [mutatePage],
  );

  /** Appends a "header" (subhead), "note", or "prose" entry — narrative
   * content with no region of its own that doesn't move the image. */
  const addEntry = useCallback(
    (pageId: string, kind: "header" | "note" | "prose") => {
      const id = crypto.randomUUID();
      mutatePage(pageId, (p) => ({
        ...p,
        waypoints: [...p.waypoints, { id, kind, zoomPadding: 0.15, body: "" } satisfies Waypoint],
      }));
      return id;
    },
    [mutatePage],
  );

  const updateWaypointRegion = useCallback(
    (pageId: string, id: string, region: Region) => {
      mutatePage(pageId, (p) => ({
        ...p,
        waypoints: p.waypoints.map((w) => (w.id === id ? { ...w, region } : w)),
      }));
    },
    [mutatePage],
  );

  const updateWaypointBody = useCallback(
    (pageId: string, id: string, body: string) => {
      mutatePage(pageId, (p) => ({
        ...p,
        waypoints: p.waypoints.map((w) => (w.id === id ? { ...w, body } : w)),
      }));
    },
    [mutatePage],
  );

  const updateWaypointTitle = useCallback(
    (pageId: string, id: string, title: string) => {
      mutatePage(pageId, (p) => ({
        ...p,
        waypoints: p.waypoints.map((w) => (w.id === id ? { ...w, title } : w)),
      }));
    },
    [mutatePage],
  );

  const removeWaypoint = useCallback(
    (pageId: string, id: string) => {
      mutatePage(pageId, (p) => ({
        ...p,
        waypoints: p.waypoints.filter((w) => w.id !== id),
      }));
    },
    [mutatePage],
  );

  const reorderWaypoints = useCallback(
    (pageId: string, orderedIds: string[]) => {
      mutatePage(pageId, (p) => {
        const byId = new Map(p.waypoints.map((w) => [w.id, w]));
        return {
          ...p,
          waypoints: orderedIds.map((id) => byId.get(id)).filter((w): w is Waypoint => !!w),
        };
      });
    },
    [mutatePage],
  );

  const reloadPageImage = useCallback(
    (pageId: string, image: ExhibitImage) => {
      mutatePage(pageId, (p) => ({ ...p, image }));
    },
    [mutatePage],
  );

  const updatePageTitle = useCallback(
    (pageId: string, title: string) => {
      mutatePage(pageId, (p) => ({ ...p, title }));
    },
    [mutatePage],
  );

  // A new page must exist on disk before the import-image endpoint can
  // tile into it (that endpoint looks the page up in the saved
  // exhibit.json), so adding a page saves immediately rather than just
  // marking state dirty like other edits.
  const addPage = useCallback(async () => {
    const id = crypto.randomUUID();
    if (!exhibit) return id;
    const updated: Exhibit = {
      ...exhibit,
      pages: [...exhibit.pages, { id, image: BLANK_IMAGE, waypoints: [] } satisfies Page],
    };
    setExhibit(updated);
    setDirty(true);
    setSaving(true);
    try {
      await api.saveExhibit(slug, updated);
      setDirty(false);
    } finally {
      setSaving(false);
    }
    return id;
  }, [exhibit, slug]);

  const removePage = useCallback(
    (pageId: string) => {
      mutate((e) => (e.pages.length <= 1 ? e : { ...e, pages: e.pages.filter((p) => p.id !== pageId) }));
    },
    [mutate],
  );

  const movePage = useCallback(
    (pageId: string, direction: -1 | 1) => {
      mutate((e) => {
        const index = e.pages.findIndex((p) => p.id === pageId);
        const target = index + direction;
        if (index < 0 || target < 0 || target >= e.pages.length) return e;
        const pages = [...e.pages];
        [pages[index], pages[target]] = [pages[target], pages[index]];
        return { ...e, pages };
      });
    },
    [mutate],
  );

  const updateMeta = useCallback(
    (fields: Partial<Pick<Exhibit, "title" | "subtitle" | "intro" | "credits">>) => {
      mutate((e) => ({ ...e, ...fields }));
    },
    [mutate],
  );

  const save = useCallback(async () => {
    if (!exhibit) return;
    setSaving(true);
    try {
      await api.saveExhibit(slug, exhibit);
      setDirty(false);
    } finally {
      setSaving(false);
    }
  }, [exhibit, slug]);

  const updateAnnotationStyle = useCallback(
    (style: AnnotationStyle) => {
      mutate((e) => ({ ...e, annotationStyle: style }));
    },
    [mutate],
  );

  const updateTheme = useCallback(
    (theme: Theme) => {
      mutate((e) => ({ ...e, theme }));
    },
    [mutate],
  );

  return {
    exhibit,
    status,
    error,
    dirty,
    saving,
    addWaypoint,
    addEntry,
    updateWaypointRegion,
    updateWaypointBody,
    updateWaypointTitle,
    removeWaypoint,
    reorderWaypoints,
    reloadPageImage,
    updatePageTitle,
    addPage,
    removePage,
    movePage,
    updateMeta,
    updateAnnotationStyle,
    updateTheme,
    save,
  };
}
