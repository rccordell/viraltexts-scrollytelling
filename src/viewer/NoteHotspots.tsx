import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import ReactMarkdown from "react-markdown";
import OpenSeadragon from "openseadragon";
import type { AnnotationStyle, Region, Waypoint } from "./schema";
import { flyToWaypoint } from "./flyToWaypoint";
import { applyBoxStyleVars } from "./boxStyle";

type Note = Waypoint & { region: Region };

interface NoteHotspotsProps {
  viewer: OpenSeadragon.Viewer | null;
  notes: Note[];
  /** The exhibit's configured "Box appearance", used for any note that
   * doesn't have its own style override. */
  defaultStyle: AnnotationStyle;
}

// Matches the popup's CSS width (220px) plus a little breathing room —
// used to decide whether docking it to the right of a region's box would
// push it past the edge of the window.
const POPUP_WIDTH = 220;
const EDGE_MARGIN = 12;

type Side = "right" | "left";

function sideForBox(boxEl: HTMLElement): Side {
  const rect = boxEl.getBoundingClientRect();
  if (rect.right + POPUP_WIDTH + EDGE_MARGIN > window.innerWidth) return "left";
  return "right";
}

/**
 * Highlights a "note"-kind entry's drawn region directly on the image —
 * popups that aren't part of the scrolling prose flow. The region stays
 * invisible until the mouse is over it (discoverable without cluttering the
 * image), then highlights; clicking it pans/zooms to the region (like a
 * waypoint) and shows the note's text docked beside it. Placed via an
 * OpenSeadragon rect overlay, which scales with pan/zoom so the highlight
 * always exactly tracks the drawn box.
 */
export function NoteHotspots({ viewer, notes, defaultStyle }: NoteHotspotsProps) {
  const [containers, setContainers] = useState<Record<string, HTMLElement>>({});
  const [open, setOpen] = useState<{ id: string; side: Side } | null>(null);
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
      setOpen(null);
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
  // all, so the region/popup behave like normal clickable UI. (This does
  // mean a drag-to-pan can't be *started* from inside a note's box — an
  // accepted trade-off, same as clicking any overlay on a pannable map.)
  function stopForOsd(e: React.SyntheticEvent) {
    e.stopPropagation();
  }

  function activate(note: Note, boxEl: HTMLElement, isOpen: boolean) {
    if (isOpen) {
      setOpen(null);
      return;
    }
    if (!viewer) return;
    flyToWaypoint(viewer, note);
    // Wait for the pan/zoom to land before reading the box's (now updated)
    // on-screen position, so the popup docks on whichever side actually has
    // room once the region is in view.
    viewer.addOnceHandler("animation-finish", () => {
      setOpen({ id: note.id, side: sideForBox(boxEl) });
    });
  }

  return (
    <>
      {notes.map((note) => {
        const container = containers[note.id];
        if (!container) return null;
        const isOpen = open?.id === note.id;
        return createPortal(
          <div
            className={`note-region${isOpen ? " note-region--open" : ""}`}
            role="button"
            tabIndex={0}
            aria-label={note.title || "Note"}
            onPointerDown={stopForOsd}
            onMouseDown={stopForOsd}
            onTouchStart={stopForOsd}
            onClick={(e) => activate(note, e.currentTarget, isOpen)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                activate(note, e.currentTarget, isOpen);
              }
            }}
          >
            {isOpen && (
              <div className={`note-region__popup note-region__popup--${open.side}`}>
                <button
                  type="button"
                  className="note-hotspot__close"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpen(null);
                  }}
                  aria-label="Close"
                >
                  ×
                </button>
                {note.title && <h4>{note.title}</h4>}
                <ReactMarkdown>{note.body}</ReactMarkdown>
              </div>
            )}
          </div>,
          container,
        );
      })}
    </>
  );
}
