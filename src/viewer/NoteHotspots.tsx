import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import OpenSeadragon from "openseadragon";
import type { AnnotationStyle, Region, Waypoint } from "./schema";
import { applyBoxStyleVars } from "./boxStyle";

type Note = Waypoint & { region: Region };

interface NoteHotspotsProps {
  viewer: OpenSeadragon.Viewer | null;
  notes: Note[];
  /** The exhibit's configured "Box appearance", used for any note that
   * doesn't have its own style override. */
  defaultStyle: AnnotationStyle;
  /** Activates a note the same way clicking a waypoint or prose link does
   * — pans/zooms to it and makes it the reader's activeId, which in turn
   * drives both the region highlight and the note panel's content. */
  onSelect: (id: string) => void;
}

/**
 * A "note"-kind entry's drawn region, highlighted directly on the image.
 * The region stays invisible until the mouse is over it (discoverable
 * without cluttering the image), then highlights; clicking it activates it
 * exactly like a waypoint or an inline prose link would — the note's text
 * itself shows in a fixed panel (see NotePanel), not tied to this box's
 * on-screen position. Placed via an OpenSeadragon rect overlay, which
 * scales with pan/zoom so the highlight always exactly tracks the drawn
 * box.
 */
export function NoteHotspots({ viewer, notes, defaultStyle, onSelect }: NoteHotspotsProps) {
  const [containers, setContainers] = useState<Record<string, HTMLElement>>({});
  const noteKey = notes
    .map((n) => {
      const s = n.style;
      // Include style fields so a live edit to a note's own box appearance
      // (or the exhibit default) re-places/re-styles the overlay, not just
      // a change in which notes exist.
      return [
        n.id,
        s?.showBorder,
        s?.borderColor,
        s?.borderWidth,
        s?.showFill,
        s?.fillColor,
        s?.fillOpacity,
      ].join(":");
    })
    .join(",");

  useEffect(() => {
    if (!viewer) return;
    const created: Record<string, HTMLElement> = {};

    // The viewport's bounds aren't meaningful until the tile source has
    // actually finished opening — placing overlays before that (e.g. while
    // a large image's tiles are still loading) produces wildly wrong
    // positions, so wait for it when needed.
    function placeOverlays() {
      for (const note of notes) {
        const el = document.createElement("div");
        applyBoxStyleVars(el, note.style ?? defaultStyle);
        // addOverlay's Rect location is in viewport coordinates, not image
        // pixels — convert, same as flyToWaypoint does for panning.
        const rect = viewer!.viewport.imageToViewportRectangle(
          note.region.x,
          note.region.y,
          note.region.width,
          note.region.height,
        );
        viewer!.addOverlay({ element: el, location: rect });
        created[note.id] = el;
      }
      setContainers(created);
    }

    if (viewer.isOpen()) {
      placeOverlays();
    } else {
      viewer.addOnceHandler("open", placeOverlays);
    }

    return () => {
      viewer.removeHandler("open", placeOverlays);
      for (const el of Object.values(created)) viewer.removeOverlay(el);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewer, noteKey]);

  // OpenSeadragon's own pan/zoom pointer tracking listens broadly enough
  // that a press-and-release on an overlay can still get captured as a
  // canvas gesture, swallowing the click before React ever sees it.
  // Stopping propagation on press keeps it from reaching OSD's tracker at
  // all, so the region behaves like normal clickable UI. (This does mean a
  // drag-to-pan can't be *started* from inside a note's box — an accepted
  // trade-off, same as clicking any overlay on a pannable map.)
  function stopForOsd(e: React.SyntheticEvent) {
    e.stopPropagation();
  }

  return (
    <>
      {notes.map((note) => {
        const container = containers[note.id];
        if (!container) return null;
        return createPortal(
          <div
            className="note-region"
            role="button"
            tabIndex={0}
            aria-label={note.title || "Note"}
            onPointerDown={stopForOsd}
            onMouseDown={stopForOsd}
            onTouchStart={stopForOsd}
            onClick={() => onSelect(note.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(note.id);
              }
            }}
          />,
          container,
        );
      })}
    </>
  );
}
