import { useCallback, useEffect, useState } from "react";
import {
  exhibitSchema,
  type AnnotationStyle,
  type Exhibit,
  type Region,
  type Waypoint,
} from "../viewer/schema";
import { api } from "./api";

export type LoadStatus = "loading" | "ready" | "error";

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
        setExhibit(exhibitSchema.parse(raw));
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

  const addWaypoint = useCallback(
    (id: string, region: Region) => {
      mutate((e) => ({
        ...e,
        waypoints: [
          ...e.waypoints,
          { id, kind: "waypoint", region, zoomPadding: 0.15, body: "" } satisfies Waypoint,
        ],
      }));
    },
    [mutate],
  );

  /** Appends a "header" (subhead, title only) or "note" (prose, no region)
   * entry — narrative content between waypoints that doesn't move the image. */
  const addEntry = useCallback(
    (kind: "header" | "note") => {
      const id = crypto.randomUUID();
      mutate((e) => ({
        ...e,
        waypoints: [
          ...e.waypoints,
          { id, kind, zoomPadding: 0.15, body: "" } satisfies Waypoint,
        ],
      }));
      return id;
    },
    [mutate],
  );

  const updateWaypointRegion = useCallback(
    (id: string, region: Region) => {
      mutate((e) => ({
        ...e,
        waypoints: e.waypoints.map((w) => (w.id === id ? { ...w, region } : w)),
      }));
    },
    [mutate],
  );

  const updateWaypointBody = useCallback(
    (id: string, body: string) => {
      mutate((e) => ({
        ...e,
        waypoints: e.waypoints.map((w) => (w.id === id ? { ...w, body } : w)),
      }));
    },
    [mutate],
  );

  const updateWaypointTitle = useCallback(
    (id: string, title: string) => {
      mutate((e) => ({
        ...e,
        waypoints: e.waypoints.map((w) => (w.id === id ? { ...w, title } : w)),
      }));
    },
    [mutate],
  );

  const removeWaypoint = useCallback(
    (id: string) => {
      mutate((e) => ({
        ...e,
        waypoints: e.waypoints.filter((w) => w.id !== id),
      }));
    },
    [mutate],
  );

  const reorderWaypoints = useCallback(
    (orderedIds: string[]) => {
      mutate((e) => {
        const byId = new Map(e.waypoints.map((w) => [w.id, w]));
        return {
          ...e,
          waypoints: orderedIds
            .map((id) => byId.get(id))
            .filter((w): w is Waypoint => !!w),
        };
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

  const reloadImage = useCallback((image: Exhibit["image"]) => {
    mutate((e) => ({ ...e, image }));
  }, [mutate]);

  const updateAnnotationStyle = useCallback(
    (style: AnnotationStyle) => {
      mutate((e) => ({ ...e, annotationStyle: style }));
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
    updateMeta,
    reloadImage,
    updateAnnotationStyle,
    save,
  };
}
