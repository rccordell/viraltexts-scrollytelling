import OpenSeadragon from "openseadragon";
import type { Region, Waypoint } from "./schema";

/**
 * Pans/zooms the OSD viewport to frame a waypoint's region, expanded by its
 * zoomPadding fraction so the region isn't flush against the viewport edge.
 * Only "waypoint"-kind entries have a region — headers/notes don't, and
 * callers should skip calling this for those.
 */
export function flyToWaypoint(
  viewer: OpenSeadragon.Viewer,
  waypoint: Waypoint & { region: Region },
  immediately = false,
): void {
  const { region, zoomPadding, minZoomWidth } = waypoint;
  const viewportRect = viewer.viewport.imageToViewportRectangle(
    region.x,
    region.y,
    region.width,
    region.height,
  );

  const padX = viewportRect.width * zoomPadding;
  const padY = viewportRect.height * zoomPadding;
  let padded = new OpenSeadragon.Rect(
    viewportRect.x - padX,
    viewportRect.y - padY,
    viewportRect.width + padX * 2,
    viewportRect.height + padY * 2,
  );

  // A region drawn tightly around a single word (e.g. a phrase-level note)
  // would otherwise fit-zoom in until that word fills the screen. Scale the
  // padded rect up around its own center, preserving its aspect ratio,
  // until it's at least minZoomWidth image-pixels wide.
  if (minZoomWidth) {
    const minViewportWidth = viewer.viewport.imageToViewportRectangle(
      0,
      0,
      minZoomWidth,
      minZoomWidth,
    ).width;
    if (minViewportWidth > padded.width) {
      const scale = minViewportWidth / padded.width;
      const cx = padded.x + padded.width / 2;
      const cy = padded.y + padded.height / 2;
      const newWidth = padded.width * scale;
      const newHeight = padded.height * scale;
      padded = new OpenSeadragon.Rect(cx - newWidth / 2, cy - newHeight / 2, newWidth, newHeight);
    }
  }

  viewer.viewport.fitBounds(padded, immediately);
}
