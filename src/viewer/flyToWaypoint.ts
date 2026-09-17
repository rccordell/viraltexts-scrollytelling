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
  const { region, zoomPadding } = waypoint;
  const viewportRect = viewer.viewport.imageToViewportRectangle(
    region.x,
    region.y,
    region.width,
    region.height,
  );

  const padX = viewportRect.width * zoomPadding;
  const padY = viewportRect.height * zoomPadding;
  const padded = new OpenSeadragon.Rect(
    viewportRect.x - padX,
    viewportRect.y - padY,
    viewportRect.width + padX * 2,
    viewportRect.height + padY * 2,
  );

  viewer.viewport.fitBounds(padded, immediately);
}
