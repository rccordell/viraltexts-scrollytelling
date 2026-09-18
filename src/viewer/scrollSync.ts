import { useEffect, useRef, type RefObject } from "react";

interface ScrollSyncOptions {
  onActivate: (id: string) => void;
  /** The scrollable element jumpTo's scrollIntoView acts on — used to wait
   * for that scroll to actually finish before the observer resumes. */
  scrollContainerRef: RefObject<HTMLElement | null>;
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
export function useScrollSync({ onActivate, scrollContainerRef }: ScrollSyncOptions) {
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
  // Whichever waypoint was last made active, however that happened (scroll,
  // click, or hover) — see the stickiness check below.
  const activeIdRef = useRef<string | null>(null);
  const pendingScrollEndCleanupRef = useRef<(() => void) | null>(null);
  // registerBlock(id) must return the *same* function across renders for a
  // given id — a fresh closure each render looks like "a different ref" to
  // React, which re-fires it (unobserve, then observe again) on every
  // single render. Since a render happens on every activeId change, that
  // would unobserve/re-observe all waypoints each time one became active,
  // racing the observer's own async re-notification against the stickiness
  // check above and producing exactly the instability it's meant to avoid.
  const refCallbacksRef = useRef(new Map<string, (el: HTMLElement | null) => void>());

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

        // Sticky: if the currently active waypoint is still in view, leave
        // it active rather than re-picking "closest" every time the
        // observer happens to fire. This matters most when several
        // waypoints sit at nearly the same vertical position — e.g. a few
        // links on one line — where "closest to center" is a near-tie that
        // would otherwise keep reverting to whichever wins that tie
        // (typically the first), overriding a deliberate click or hover on
        // a later one.
        const activeEl = activeIdRef.current ? blocksRef.current.get(activeIdRef.current) : undefined;
        if (activeEl && intersectingRef.current.has(activeEl)) return;

        // Prefer whichever currently-intersecting entry is closest to the
        // vertical center of the band.
        let best: IntersectionObserverEntry | null = null;
        for (const entry of intersectingRef.current.values()) {
          if (!best || Math.abs(entry.boundingClientRect.top) < Math.abs(best.boundingClientRect.top)) {
            best = entry;
          }
        }
        const id = best?.target.getAttribute("data-waypoint-id");
        if (id) {
          activeIdRef.current = id;
          onActivate(id);
        }
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 },
    );
    observerRef.current = observer;
    blocksRef.current.forEach((el) => observer.observe(el));
    return () => {
      observer.disconnect();
      intersectingRef.current.clear();
      pendingScrollEndCleanupRef.current?.();
    };
  }, [onActivate]);

  function registerBlock(id: string) {
    const cached = refCallbacksRef.current.get(id);
    if (cached) return cached;
    const callback = (el: HTMLElement | null) => {
      const prev = blocksRef.current.get(id);
      if (prev === el) return; // same element re-reported — nothing changed
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
    refCallbacksRef.current.set(id, callback);
    return callback;
  }

  function jumpTo(id: string) {
    const el = blocksRef.current.get(id);
    if (!el) return;
    activeIdRef.current = id;
    onActivate(id);

    if (pendingScrollEndCleanupRef.current) pendingScrollEndCleanupRef.current();

    const scroller = scrollContainerRef.current;
    if (scroller && "onscrollend" in window) {
      // Suppress until the smooth scroll actually finishes, not a guessed
      // duration — a fixed window can expire mid-scroll, letting the
      // observer lock onto whatever waypoint happens to be passing through
      // the center at that moment instead of the real target (and, since
      // that pick then counts as "the current active one," the stickiness
      // check above would hold it there rather than self-correcting).
      suppressUntilRef.current = Infinity;
      const handleScrollEnd = () => {
        suppressUntilRef.current = 0;
        pendingScrollEndCleanupRef.current = null;
      };
      scroller.addEventListener("scrollend", handleScrollEnd, { once: true });
      pendingScrollEndCleanupRef.current = () => {
        scroller.removeEventListener("scrollend", handleScrollEnd);
        suppressUntilRef.current = 0;
      };
    } else {
      // Fallback for browsers without the scrollend event: a generous
      // fixed window (smooth scrollIntoView typically settles well under
      // this, even for a long scroll).
      suppressUntilRef.current = Date.now() + 1200;
    }

    el.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  /** Marks a waypoint active without scrolling to it (e.g. a hover-settle
   * on an inline link) — still needs to register as the "current" pick so
   * the stickiness check above holds it once the observer next fires. */
  function markActive(id: string) {
    activeIdRef.current = id;
  }

  return { registerBlock, jumpTo, markActive };
}
