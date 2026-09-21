import { useEffect, useState } from "react";

interface ReadingMarkerProps {
  activeId: string | undefined;
  /** Looks up the DOM element registered for a waypoint id (from
   * useScrollSync), used to measure where to place the marker. */
  getElement: (id: string) => HTMLElement | undefined;
}

/**
 * A small arrow in the text column's left margin, pointing at whichever
 * passage is currently active — a more noticeable alternative to the
 * highlight styling alone for showing readers where the scroll position
 * (or a click/hover) currently "is." Positioned via the active element's
 * own offsetTop, so it scrolls naturally along with the text as part of
 * normal document flow — no scroll-event listening needed.
 */
export function ReadingMarker({ activeId, getElement }: ReadingMarkerProps) {
  const [top, setTop] = useState<number | null>(null);

  useEffect(() => {
    if (!activeId) {
      setTop(null);
      return;
    }
    function measure() {
      const el = activeId ? getElement(activeId) : undefined;
      if (!el) return;
      setTop(el.offsetTop + el.offsetHeight / 2);
    }
    measure();
    // A window resize can reflow the text (e.g. rewrapping a prose
    // passage), shifting where the active element sits.
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  if (top === null) return null;

  return <div className="reading-marker" style={{ top: `${top}px` }} aria-hidden="true" />;
}
