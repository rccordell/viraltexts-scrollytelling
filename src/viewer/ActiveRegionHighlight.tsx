import { useEffect } from "react";
import OpenSeadragon from "openseadragon";
import type { AnnotationStyle, Region } from "./schema";
import { applyBoxStyleVars } from "./boxStyle";

interface ActiveRegionHighlightProps {
  viewer: OpenSeadragon.Viewer | null;
  region: Region | null;
  style: AnnotationStyle;
}

/**
 * Outlines whichever region the reader is currently looking at — the
 * active waypoint's box, whether it's showing as its own block or was
 * jumped to via an inline prose link — so it's visible which part of the
 * image the current text refers to, not just that the view panned there.
 * Purely visual (pointer-events: none), so it never blocks panning/zooming.
 */
export function ActiveRegionHighlight({ viewer, region, style }: ActiveRegionHighlightProps) {
  useEffect(() => {
    if (!viewer || !region) return;
    const el = document.createElement("div");
    el.className = "active-region-highlight";
    applyBoxStyleVars(el, style);

    function place() {
      const rect = viewer!.viewport.imageToViewportRectangle(
        region!.x,
        region!.y,
        region!.width,
        region!.height,
      );
      viewer!.addOverlay({ element: el, location: rect });
    }

    if (viewer.isOpen()) {
      place();
    } else {
      viewer.addOnceHandler("open", place);
    }

    return () => {
      viewer.removeHandler("open", place);
      viewer.removeOverlay(el);
    };
    // Depend on style's individual fields rather than the object itself —
    // it's often recomputed inline by the caller, so a reference-based
    // dependency would tear down and recreate the overlay every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    viewer,
    region?.x,
    region?.y,
    region?.width,
    region?.height,
    style.showBorder,
    style.borderColor,
    style.borderWidth,
    style.showFill,
    style.fillColor,
    style.fillOpacity,
  ]);

  return null;
}
