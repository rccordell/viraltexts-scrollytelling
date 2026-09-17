import ReactMarkdown from "react-markdown";
import type { Waypoint } from "./schema";

interface ProseBlockProps {
  waypoint: Waypoint;
  activeId: string | undefined;
  registerBlock: (id: string) => (el: HTMLElement | null) => void;
  onJumpTo: (id: string) => void;
}

/**
 * A long-form text block whose markdown can contain inline links like
 * `[phrase](#some-waypoint-id)` — each becomes a <span> registered with
 * the same scrollspy/jump machinery a full waypoint block uses, so a
 * single word or phrase mid-paragraph can pan/zoom the image, not just a
 * whole block. A real link (any href not starting with "#") still renders
 * as a normal external link.
 */
export function ProseBlock({ waypoint, activeId, registerBlock, onJumpTo }: ProseBlockProps) {
  return (
    <section className="prose-block">
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
