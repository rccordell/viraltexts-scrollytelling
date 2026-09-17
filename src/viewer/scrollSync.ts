import { useEffect, useRef } from "react";

interface ScrollSyncOptions {
  onActivate: (id: string) => void;
}

/**
 * Scrollspy: watches waypoint block elements (registered via the returned
 * `registerBlock` ref-callback) and calls `onActivate` with whichever one
 * is nearest the vertical center of the scroll container.
 *
 * Programmatic scrolls (from clicking a waypoint) are suppressed for a
 * short window so they don't spuriously fire onActivate for waypoints the
 * scroll merely passes through en route to its target.
 */
export function useScrollSync({ onActivate }: ScrollSyncOptions) {
  const blocksRef = useRef(new Map<string, HTMLElement>());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const suppressUntilRef = useRef(0);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (Date.now() < suppressUntilRef.current) return;
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length === 0) return;
        // Prefer the entry closest to the vertical center of the band.
        const best = visible.reduce((a, b) =>
          Math.abs(a.boundingClientRect.top) <
          Math.abs(b.boundingClientRect.top)
            ? a
            : b,
        );
        const id = best.target.getAttribute("data-waypoint-id");
        if (id) onActivate(id);
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 },
    );
    observerRef.current = observer;
    blocksRef.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [onActivate]);

  function registerBlock(id: string) {
    return (el: HTMLElement | null) => {
      const prev = blocksRef.current.get(id);
      if (prev && observerRef.current) observerRef.current.unobserve(prev);
      if (el) {
        blocksRef.current.set(id, el);
        observerRef.current?.observe(el);
      } else {
        blocksRef.current.delete(id);
      }
    };
  }

  function jumpTo(id: string) {
    const el = blocksRef.current.get(id);
    if (!el) return;
    // Suppress the observer for the duration of the smooth scroll so
    // intermediate waypoints it passes over don't get spuriously activated.
    suppressUntilRef.current = Date.now() + 700;
    onActivate(id);
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return { registerBlock, jumpTo };
}
