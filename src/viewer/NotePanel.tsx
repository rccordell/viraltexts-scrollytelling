import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import type { Region, Waypoint } from "./schema";
import { externalLinkComponents } from "./markdownLinks";

type Note = Waypoint & { region: Region };

interface NotePanelProps {
  /** The currently-active note (by activeId), or null when nothing active
   * is a note. Selecting a note — by clicking its box on the image, an
   * inline prose link, or hovering either — all funnel through the same
   * activeId, so this panel shows the same content regardless of how the
   * note was reached. */
  note: Note | null;
  /** Bumped on every explicit click/hover activation, even re-selecting
   * the same note — otherwise closing the panel and then clicking the
   * same link again wouldn't reopen it, since activeId wouldn't change. */
  flightNonce: number;
}

/**
 * A fixed panel docked to the bottom of the image viewer, showing the
 * active note's text — deliberately *not* positioned relative to the
 * note's box on the image. Chasing a moving/zooming box around with a
 * popup turned out to be fragile (it could run off-screen, or get stuck
 * behind the scrolling text column); a fixed panel sidesteps that
 * entirely. The box itself still highlights on the image (via
 * ActiveRegionHighlight) so it's clear which spot the text refers to.
 */
export function NotePanel({ note, flightNonce }: NotePanelProps) {
  const [dismissed, setDismissed] = useState(false);

  // A newly-active note should always show, even if the previous one was
  // dismissed — only re-hide once the user dismisses *this* one. Also
  // reopens on flightNonce alone (re-selecting the *same* note), since
  // note?.id wouldn't change in that case.
  useEffect(() => {
    setDismissed(false);
  }, [note?.id, flightNonce]);

  if (!note || dismissed) return null;

  return (
    <div className="note-panel">
      <button
        type="button"
        className="note-panel__close"
        onClick={() => setDismissed(true)}
        aria-label="Close"
      >
        ×
      </button>
      {note.title && <h4>{note.title}</h4>}
      <ReactMarkdown components={externalLinkComponents}>{note.body}</ReactMarkdown>
    </div>
  );
}
