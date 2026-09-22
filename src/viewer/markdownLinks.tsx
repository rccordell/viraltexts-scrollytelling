import type { ReactNode } from "react";

/**
 * Every real link in exhibit content (not an internal `#id` anchor to a
 * waypoint/note, which ProseBlock handles separately) opens in a new tab —
 * a reader following a citation or a database link shouldn't lose their
 * place in the exhibit.
 */
export function ExternalLink({ href, children }: { href?: string; children?: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer">
      {children}
    </a>
  );
}

/** Drop-in `components` prop for a ReactMarkdown instance whose body never
 * contains an internal `#id` anchor (waypoint/note bodies, intro, credits).
 * ProseBlock has its own richer `a` handling instead, for its inline links
 * to other waypoints/notes. */
export const externalLinkComponents = {
  a: ({ href, children }: { href?: string; children?: ReactNode }) => (
    <ExternalLink href={href}>{children}</ExternalLink>
  ),
};
