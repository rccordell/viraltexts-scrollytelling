import ReactMarkdown from "react-markdown";
import type { Waypoint } from "./schema";
import { externalLinkComponents } from "./markdownLinks";

interface WaypointBlockProps {
  waypoint: Waypoint;
  active: boolean;
  registerRef: (el: HTMLElement | null) => void;
  onClick: () => void;
}

export function WaypointBlock({
  waypoint,
  active,
  registerRef,
  onClick,
}: WaypointBlockProps) {
  if (waypoint.kind === "header") {
    return (
      <h2
        ref={registerRef as React.Ref<HTMLHeadingElement>}
        data-waypoint-id={waypoint.id}
        className={`waypoint-heading${active ? " waypoint-heading--active" : ""}`}
        onClick={onClick}
      >
        {waypoint.title}
      </h2>
    );
  }

  return (
    <section
      ref={registerRef as React.Ref<HTMLElement>}
      data-waypoint-id={waypoint.id}
      className={`waypoint-block${active ? " waypoint-block--active" : ""}`}
      onClick={onClick}
    >
      {waypoint.title && <h3>{waypoint.title}</h3>}
      <ReactMarkdown components={externalLinkComponents}>{waypoint.body}</ReactMarkdown>
    </section>
  );
}
