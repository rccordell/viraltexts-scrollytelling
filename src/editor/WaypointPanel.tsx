import { useEffect, useRef } from "react";
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
import type { Waypoint } from "../viewer/schema";

interface WaypointPanelProps {
  waypoints: Waypoint[];
  selectedId?: string;
  drawArmed: boolean;
  onToggleDraw: () => void;
  onAddEntry: (kind: "header" | "note") => void;
  onSelect: (id: string) => void;
  onChangeTitle: (id: string, title: string) => void;
  onChangeBody: (id: string, body: string) => void;
  onDelete: (id: string) => void;
  onReorder: (orderedIds: string[]) => void;
}

export function WaypointPanel({
  waypoints,
  selectedId,
  drawArmed,
  onToggleDraw,
  onAddEntry,
  onSelect,
  onChangeTitle,
  onChangeBody,
  onDelete,
  onReorder,
}: WaypointPanelProps) {
  const sensors = useSensors(useSensor(PointerSensor));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = waypoints.findIndex((w) => w.id === active.id);
    const newIndex = waypoints.findIndex((w) => w.id === over.id);
    onReorder(arrayMove(waypoints, oldIndex, newIndex).map((w) => w.id));
  }

  return (
    <div className="waypoint-panel">
      <div className="waypoint-panel__toolbar">
        <button
          type="button"
          className={`waypoint-panel__draw-toggle${drawArmed ? " waypoint-panel__draw-toggle--active" : ""}`}
          onClick={onToggleDraw}
          title="Or hold Option/Alt to draw temporarily"
        >
          {drawArmed ? "✛ Drawing… drag on the image" : "＋ Draw a box"}
        </button>
        <div className="waypoint-panel__toolbar-secondary">
          <button type="button" onClick={() => onAddEntry("header")}>
            ＋ Header
          </button>
          <button type="button" onClick={() => onAddEntry("note")}>
            ＋ Note
          </button>
        </div>
      </div>

      {waypoints.length === 0 ? (
        <p className="waypoint-panel__empty">
          Nothing here yet. Draw a box on the image, or add a header or note
          for text that isn't tied to a specific spot.
        </p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={waypoints.map((w) => w.id)} strategy={verticalListSortingStrategy}>
            <ul className="waypoint-panel__list">
              {waypoints.map((w) => (
                <SortableWaypointCard
                  key={w.id}
                  waypoint={w}
                  selected={w.id === selectedId}
                  onSelect={() => onSelect(w.id)}
                  onChangeTitle={(title) => onChangeTitle(w.id, title)}
                  onChangeBody={(body) => onChangeBody(w.id, body)}
                  onDelete={() => onDelete(w.id)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

interface CardProps {
  waypoint: Waypoint;
  selected: boolean;
  onSelect: () => void;
  onChangeTitle: (title: string) => void;
  onChangeBody: (body: string) => void;
  onDelete: () => void;
}

const KIND_LABEL: Record<Waypoint["kind"], string | null> = {
  waypoint: null,
  header: "Header",
  note: "Note",
};

const TITLE_PLACEHOLDER: Record<Waypoint["kind"], string> = {
  waypoint: "Waypoint title (optional)",
  header: "Header text",
  note: "Note title (optional)",
};

const UNTITLED_LABEL: Record<Waypoint["kind"], string> = {
  waypoint: "Untitled waypoint",
  header: "Untitled header",
  note: "Untitled note",
};

function SortableWaypointCard({ waypoint, selected, onSelect, onChangeTitle, onChangeBody, onDelete }: CardProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: waypoint.id,
  });
  const elRef = useRef<HTMLLIElement | null>(null);
  const kindLabel = KIND_LABEL[waypoint.kind];

  useEffect(() => {
    if (selected) elRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selected]);

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
        {selected ? (
          <input
            className="waypoint-card__title"
            placeholder={TITLE_PLACEHOLDER[waypoint.kind]}
            value={waypoint.title ?? ""}
            onChange={(e) => onChangeTitle(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            autoFocus
          />
        ) : (
          <span className="waypoint-card__title-display">
            {waypoint.title?.trim() || UNTITLED_LABEL[waypoint.kind]}
          </span>
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
      {selected && waypoint.kind !== "header" && (
        <textarea
          className="waypoint-card__body"
          placeholder="Write the text for this passage (markdown supported)…"
          value={waypoint.body}
          onChange={(e) => onChangeBody(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          rows={4}
        />
      )}
    </li>
  );
}
