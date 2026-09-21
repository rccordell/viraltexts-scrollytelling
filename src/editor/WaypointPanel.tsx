import { useEffect, useRef, useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { AnnotationStyle, Waypoint } from "../viewer/schema";
import { defaultAnnotationStyle } from "../viewer/schema";
import { AnnotationStyleFields } from "./AnnotationStyleSettings";

interface WaypointPanelProps {
  waypoints: Waypoint[];
  selectedId?: string;
  drawMode: "waypoint" | "note" | null;
  /** The exhibit-wide "Box appearance" — the starting point offered when an
   * author turns on a custom style for one box. */
  exhibitDefaultStyle: AnnotationStyle | undefined;
  onToggleDraw: (mode: "waypoint" | "note") => void;
  onAddEntry: (kind: "header" | "prose") => void;
  onSelect: (id: string) => void;
  onChangeTitle: (id: string, title: string) => void;
  onChangeBody: (id: string, body: string) => void;
  onChangeStyle: (id: string, style: AnnotationStyle | undefined) => void;
  onChangeMinZoomWidth: (id: string, minZoomWidth: number | undefined) => void;
  onDelete: (id: string) => void;
  onReorder: (orderedIds: string[]) => void;
}

// Offered as the starting point when an author first turns on a zoom floor
// — wide enough to keep a single-word/phrase region from filling the
// screen, without being a guess pulled from nowhere for every image size.
const DEFAULT_MIN_ZOOM_WIDTH = 1500;

const KIND_FILTERS: { value: Waypoint["kind"] | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "header", label: "Headers" },
  { value: "prose", label: "Prose" },
  { value: "waypoint", label: "Waypoints" },
  { value: "note", label: "Notes" },
];

export function WaypointPanel({
  waypoints,
  selectedId,
  drawMode,
  exhibitDefaultStyle,
  onToggleDraw,
  onAddEntry,
  onSelect,
  onChangeTitle,
  onChangeBody,
  onChangeStyle,
  onChangeMinZoomWidth,
  onDelete,
  onReorder,
}: WaypointPanelProps) {
  const sensors = useSensors(useSensor(PointerSensor));
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<Waypoint["kind"] | "all">("all");

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = waypoints.findIndex((w) => w.id === active.id);
    const newIndex = waypoints.findIndex((w) => w.id === over.id);
    onReorder(arrayMove(waypoints, oldIndex, newIndex).map((w) => w.id));
  }

  const normalizedQuery = query.trim().toLowerCase();
  const isFiltering = normalizedQuery !== "" || kindFilter !== "all";
  const visibleWaypoints = waypoints.filter((w) => {
    if (kindFilter !== "all" && w.kind !== kindFilter) return false;
    if (!normalizedQuery) return true;
    return (
      (w.title ?? "").toLowerCase().includes(normalizedQuery) ||
      (w.body ?? "").toLowerCase().includes(normalizedQuery)
    );
  });

  return (
    <div className="waypoint-panel">
      <div className="waypoint-panel__toolbar">
        <div className="waypoint-panel__draw-buttons">
          <button
            type="button"
            className={`waypoint-panel__draw-toggle${drawMode === "waypoint" ? " waypoint-panel__draw-toggle--active" : ""}`}
            onClick={() => onToggleDraw("waypoint")}
            title="Or hold Option/Alt to draw temporarily"
          >
            {drawMode === "waypoint" ? "✛ Drawing… drag on the image" : "＋ Draw a waypoint"}
          </button>
          <button
            type="button"
            className={`waypoint-panel__draw-toggle${drawMode === "note" ? " waypoint-panel__draw-toggle--active" : ""}`}
            onClick={() => onToggleDraw("note")}
            title="A small popup marker on the image, not part of the scrolling text"
          >
            {drawMode === "note" ? "✛ Drawing… drag on the image" : "＋ Draw a note"}
          </button>
        </div>
        <div className="waypoint-panel__toolbar-secondary">
          <button type="button" onClick={() => onAddEntry("header")}>
            ＋ Header
          </button>
          <button type="button" onClick={() => onAddEntry("prose")}>
            ＋ Prose
          </button>
        </div>
      </div>

      {waypoints.length > 0 && (
        <div className="waypoint-panel__filters">
          <input
            type="search"
            className="waypoint-panel__search"
            placeholder="Filter by title or text…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="waypoint-panel__kind-chips">
            {KIND_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                className={`waypoint-panel__kind-chip${kindFilter === f.value ? " waypoint-panel__kind-chip--active" : ""}`}
                onClick={() => setKindFilter(f.value)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {waypoints.length === 0 ? (
        <p className="waypoint-panel__empty">
          Nothing here yet. Draw a waypoint to link an image region from the
          scrolling text, draw a note for a click-to-reveal popup on the
          image, or add a header or prose block for text that isn't tied to
          a specific spot.
        </p>
      ) : visibleWaypoints.length === 0 ? (
        <p className="waypoint-panel__empty">
          {normalizedQuery
            ? `No entries match "${query}"${kindFilter !== "all" ? ` in ${kindFilter}s` : ""}.`
            : `No ${kindFilter}s yet.`}
        </p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={visibleWaypoints.map((w) => w.id)} strategy={verticalListSortingStrategy}>
            <ul className="waypoint-panel__list">
              {visibleWaypoints.map((w) => (
                <SortableWaypointCard
                  key={w.id}
                  waypoint={w}
                  selected={w.id === selectedId}
                  exhibitDefaultStyle={exhibitDefaultStyle}
                  onSelect={() => onSelect(w.id)}
                  onChangeTitle={(title) => onChangeTitle(w.id, title)}
                  onChangeBody={(body) => onChangeBody(w.id, body)}
                  onChangeStyle={(style) => onChangeStyle(w.id, style)}
                  onChangeMinZoomWidth={(minZoomWidth) => onChangeMinZoomWidth(w.id, minZoomWidth)}
                  onDelete={() => onDelete(w.id)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
      {isFiltering && visibleWaypoints.length > 0 && (
        <p className="waypoint-panel__filter-count">
          Showing {visibleWaypoints.length} of {waypoints.length}
        </p>
      )}
    </div>
  );
}

interface CardProps {
  waypoint: Waypoint;
  selected: boolean;
  exhibitDefaultStyle: AnnotationStyle | undefined;
  onSelect: () => void;
  onChangeTitle: (title: string) => void;
  onChangeBody: (body: string) => void;
  onChangeStyle: (style: AnnotationStyle | undefined) => void;
  onChangeMinZoomWidth: (minZoomWidth: number | undefined) => void;
  onDelete: () => void;
}

const KIND_LABEL: Record<Waypoint["kind"], string | null> = {
  waypoint: null,
  header: "Header",
  note: "Note (popup)",
  prose: "Prose",
};

const TITLE_PLACEHOLDER: Record<Waypoint["kind"], string> = {
  waypoint: "Waypoint title (optional)",
  header: "Header text",
  note: "Note title (optional)",
  prose: "Prose title (optional)",
};

const UNTITLED_LABEL: Record<Waypoint["kind"], string> = {
  waypoint: "Untitled waypoint",
  header: "Untitled header",
  note: "Untitled note",
  prose: "Untitled prose",
};

const BODY_PLACEHOLDER: Record<Waypoint["kind"], string> = {
  waypoint: "Write the text for this passage (markdown supported)…",
  header: "",
  note: "Text shown in the popup when this spot on the image is clicked (markdown supported)…",
  prose:
    "Write a long passage of text here. Link a word or phrase to a region " +
    "with [phrase](#region-id) — click \"Copy link\" on a waypoint card " +
    "above to get its id, then paste and fill in the link text.",
};

function SortableWaypointCard({
  waypoint,
  selected,
  exhibitDefaultStyle,
  onSelect,
  onChangeTitle,
  onChangeBody,
  onChangeStyle,
  onChangeMinZoomWidth,
  onDelete,
}: CardProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: waypoint.id,
  });
  const elRef = useRef<HTMLLIElement | null>(null);
  const kindLabel = KIND_LABEL[waypoint.kind];
  const [justCopied, setJustCopied] = useState(false);

  // A freshly-drawn waypoint might only ever be referenced from inline
  // prose (via its "Copy link"), never given its own title/body — so its
  // text fields stay collapsed behind a choice until the author explicitly
  // asks for them, or it already has content (e.g. loaded from disk).
  const hasContent = Boolean(waypoint.title?.trim()) || Boolean(waypoint.body?.trim());
  const [wantsText, setWantsText] = useState(hasContent);
  const showTextFields = waypoint.kind !== "waypoint" || wantsText || hasContent;

  useEffect(() => {
    if (selected) elRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selected]);

  function copyAnchorLink(e: React.MouseEvent) {
    e.stopPropagation();
    navigator.clipboard.writeText(`[](#${waypoint.id})`).then(() => {
      setJustCopied(true);
      setTimeout(() => setJustCopied(false), 1500);
    });
  }

  return (
    <li
      ref={(el) => {
        setNodeRef(el);
        elRef.current = el;
      }}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`waypoint-card${selected ? " waypoint-card--selected" : ""}${
        waypoint.kind !== "waypoint" ? ` waypoint-card--${waypoint.kind}` : ""
      }`}
      onClick={onSelect}
    >
      <div className="waypoint-card__header">
        <span className="waypoint-card__handle" {...attributes} {...listeners}>
          ⠿
        </span>
        {kindLabel && <span className="waypoint-card__kind-badge">{kindLabel}</span>}
        {selected && showTextFields ? (
          <input
            className="waypoint-card__title"
            placeholder={TITLE_PLACEHOLDER[waypoint.kind]}
            value={waypoint.title ?? ""}
            onChange={(e) => onChangeTitle(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            autoFocus
          />
        ) : selected ? (
          <span className="waypoint-card__title-display waypoint-card__title-display--muted">
            Region only — not linked to any text yet
          </span>
        ) : (
          <span className="waypoint-card__title-display">
            {waypoint.title?.trim() || UNTITLED_LABEL[waypoint.kind]}
          </span>
        )}
        {selected && (waypoint.kind === "waypoint" || waypoint.kind === "note") && (
          <button
            type="button"
            className="waypoint-card__copy-link"
            onClick={copyAnchorLink}
            title="Copy a markdown link to this region, to paste into a Prose block"
          >
            {justCopied ? "Copied!" : "Copy link"}
          </button>
        )}
        <button
          type="button"
          className="waypoint-card__delete"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          aria-label="Delete"
        >
          ✕
        </button>
      </div>
      {selected && waypoint.kind !== "header" && showTextFields && (
        <textarea
          className="waypoint-card__body"
          placeholder={BODY_PLACEHOLDER[waypoint.kind]}
          value={waypoint.body}
          onChange={(e) => onChangeBody(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          rows={waypoint.kind === "prose" ? 10 : 4}
        />
      )}
      {selected && waypoint.kind === "waypoint" && !showTextFields && (
        <div className="waypoint-card__choice">
          <p className="waypoint-card__choice-hint">
            Link this region from a word or phrase in a Prose block above (use
            "Copy link"), or give this waypoint its own text.
          </p>
          <button
            type="button"
            className="waypoint-card__choice-button"
            onClick={(e) => {
              e.stopPropagation();
              setWantsText(true);
            }}
          >
            ＋ Add waypoint text
          </button>
        </div>
      )}
      {selected && (waypoint.kind === "waypoint" || waypoint.kind === "note") && (
        <div className="waypoint-card__style-override" onClick={(e) => e.stopPropagation()}>
          <label className="waypoint-card__style-override-toggle">
            <input
              type="checkbox"
              checked={!!waypoint.style}
              onChange={(e) =>
                onChangeStyle(e.target.checked ? (exhibitDefaultStyle ?? defaultAnnotationStyle) : undefined)
              }
            />
            Custom box color for this one
          </label>
          {waypoint.style && (
            <AnnotationStyleFields style={waypoint.style} onChange={onChangeStyle} />
          )}
        </div>
      )}
      {selected && (waypoint.kind === "waypoint" || waypoint.kind === "note") && (
        <div className="waypoint-card__zoom-override" onClick={(e) => e.stopPropagation()}>
          <label className="waypoint-card__zoom-override-toggle">
            <input
              type="checkbox"
              checked={waypoint.minZoomWidth != null}
              onChange={(e) =>
                onChangeMinZoomWidth(e.target.checked ? DEFAULT_MIN_ZOOM_WIDTH : undefined)
              }
            />
            Limit how close this zooms
          </label>
          {waypoint.minZoomWidth != null && (
            <label className="waypoint-card__zoom-override-field">
              Show at least
              <input
                type="number"
                min={1}
                value={waypoint.minZoomWidth}
                onChange={(e) => onChangeMinZoomWidth(Number(e.target.value) || 1)}
                onClick={(e) => e.stopPropagation()}
              />
              image pixels wide — good for a region drawn tightly around a
              single word or short phrase.
            </label>
          )}
        </div>
      )}
    </li>
  );
}
