import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import type { Waypoint } from "./schema";

interface ProseBlockProps {
  waypoint: Waypoint;
  activeId: string | undefined;
  registerBlock: (id: string) => (el: HTMLElement | null) => void;
  onJumpTo: (id: string) => void;
  onHoverTo: (id: string) => void;
}

// How long the mouse has to settle on one linked phrase — with no further
// hover changes — before it pans the image. Long enough that briefly
// passing over a link while aiming the cursor at a different one nearby
// (or at a link inside the note panel's own text) doesn't register as a
// deliberate hover.
const HOVER_SETTLE_MS = 550;

/**
 * A long-form text block whose markdown can contain inline links like
 * `[phrase](#some-waypoint-id)` — each becomes a <span> registered with
 * the same scrollspy/jump machinery a full waypoint block uses, so a
 * single word or phrase mid-paragraph can pan/zoom the image, not just a
 * whole block. A real link (any href not starting with "#") still renders
 * as a normal external link.
 *
 * Scroll-sync alone can't tell apart several linked phrases that share the
 * same line (there's no vertical scroll position that distinguishes them),
 * so hovering a phrase also pans to it once the mouse settles there — full
 * 2D mouse position resolves what scroll position can't. The settle timer
 * resets on every hover change rather than cancelling on mouseleave, so
 * moving across several closely-spaced links doesn't fire a pan for each
 * one in passing — only whichever one the mouse actually comes to rest on.
 */
export function ProseBlock({ waypoint, activeId, registerBlock, onJumpTo, onHoverTo }: ProseBlockProps) {
  const timeoutRef = useRef<number | null>(null);

  function clearPending() {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }

  useEffect(() => clearPending, []);

  function handleMouseEnter(id: string) {
    clearPending();
    timeoutRef.current = window.setTimeout(() => {
      timeoutRef.current = null;
      onHoverTo(id);
    }, HOVER_SETTLE_MS);
  }

  return (
    <section className="prose-block" onMouseLeave={clearPending}>
      {waypoint.title && <h3>{waypoint.title}</h3>}
      <ReactMarkdown
        components={{
          a: ({ href, children }) => {
            if (!href?.startsWith("#")) {
              return (
                <a href={href} target="_blank" rel="noreferrer">
                  {children}
                </a>
              );
            }
            const targetId = href.slice(1);
            return (
              <span
                ref={registerBlock(targetId) as React.Ref<HTMLSpanElement>}
                data-waypoint-id={targetId}
                className={`prose-anchor${targetId === activeId ? " prose-anchor--active" : ""}`}
                onClick={() => onJumpTo(targetId)}
                onMouseEnter={() => handleMouseEnter(targetId)}
              >
                {children}
              </span>
            );
          },
        }}
      >
        {waypoint.body}
      </ReactMarkdown>
    </section>
  );
}
