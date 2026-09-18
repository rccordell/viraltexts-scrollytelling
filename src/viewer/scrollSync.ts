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
  // A browser IntersectionObserver callback only reports entries whose
  // status just *changed*, not a full snapshot of everything currently
  // visible — so we track the current intersecting set ourselves and
  // always pick "closest to center" from that whole set. Without this,
  // when several waypoints are close together (e.g. closely-spaced inline
  // prose links), the active one scrolling out of the band while an
  // already-intersecting neighbor stays put produces a callback with
  // nothing newly-intersecting in it, and the neighbor never gets picked
  // up — the active link gets stuck.
  const intersectingRef = useRef(new Map<Element, IntersectionObserverEntry>());

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            intersectingRef.current.set(entry.target, entry);
          } else {
            intersectingRef.current.delete(entry.target);
          }
        }
        if (Date.now() < suppressUntilRef.current) return;
        if (intersectingRef.current.size === 0) return;
        // Prefer whichever currently-intersecting entry is closest to the
        // vertical center of the band.
        let best: IntersectionObserverEntry | null = null;
        for (const entry of intersectingRef.current.values()) {
          if (!best || Math.abs(entry.boundingClientRect.top) < Math.abs(best.boundingClientRect.top)) {
            best = entry;
          }
        }
        const id = best?.target.getAttribute("data-waypoint-id");
        if (id) onActivate(id);
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 },
    );
    observerRef.current = observer;
    blocksRef.current.forEach((el) => observer.observe(el));
    return () => {
      observer.disconnect();
      intersectingRef.current.clear();
    };
  }, [onActivate]);

  function registerBlock(id: string) {
    return (el: HTMLElement | null) => {
      const prev = blocksRef.current.get(id);
      if (prev && observerRef.current) {
        observerRef.current.unobserve(prev);
        // unobserve() doesn't synthesize a final "left" entry, so drop it
        // from our own tracked set explicitly or it'd linger there stale.
        intersectingRef.current.delete(prev);
      }
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
