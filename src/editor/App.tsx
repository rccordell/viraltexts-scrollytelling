import { useEffect, useRef, useState } from "react";
import { useExhibitState } from "./useExhibitState";
import { AnnotationCanvas, type AnnotationCanvasHandle } from "./AnnotationCanvas";
import { WaypointPanel } from "./WaypointPanel";
import { AnnotationStyleSettings } from "./AnnotationStyleSettings";
import { ExhibitReader } from "../viewer/ExhibitReader";
import { ExhibitPicker } from "./ExhibitPicker";
import { ImageImportForm } from "./ImageImportForm";
import { api } from "./api";
import "./editor.css";

function useSlugFromQuery(): [string | null, (slug: string) => void] {
  const [slug, setSlugState] = useState<string | null>(() =>
    new URLSearchParams(window.location.search).get("slug"),
  );
  function setSlug(next: string) {
    const url = new URL(window.location.href);
    url.searchParams.set("slug", next);
    window.history.pushState({}, "", url);
    setSlugState(next);
  }
  return [slug, setSlug];
}

export function App() {
  const [slug, setSlug] = useSlugFromQuery();

  if (!slug) {
    return (
      <ExhibitPicker
        onChoose={(chosenSlug) => setSlug(chosenSlug)}
        onCreate={async (newSlug) => {
          await api.createExhibit(newSlug);
          setSlug(newSlug);
        }}
      />
    );
  }

  return <ExhibitEditor slug={slug} />;
}

function ExhibitEditor({ slug }: { slug: string }) {
  const {
    exhibit,
    status,
    error,
    dirty,
    saving,
    addWaypoint,
    addEntry,
    updateWaypointRegion,
    updateWaypointBody,
    updateWaypointTitle,
    removeWaypoint,
    reorderWaypoints,
    updateMeta,
    reloadImage,
    updateAnnotationStyle,
    save,
  } = useExhibitState(slug);

  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [previewing, setPreviewing] = useState(false);
  const canvasRef = useRef<AnnotationCanvasHandle>(null);

  // Dragging pans the image by default (so you can navigate around while
  // zoomed in); drawing a new box requires explicitly arming it, either via
  // the toolbar button (sticky until you draw or toggle it off) or by
  // holding Option/Alt (a temporary override while held).
  const [drawArmed, setDrawArmed] = useState(false);
  const [altHeld, setAltHeld] = useState(false);
  const drawingEnabled = drawArmed || altHeld;

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Alt") setAltHeld(true);
    }
    function onKeyUp(e: KeyboardEvent) {
      if (e.key === "Alt") setAltHeld(false);
    }
    function onBlur() {
      setAltHeld(false);
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  useEffect(() => {
    setSelectedId(undefined);
    setPreviewing(false);
    setDrawArmed(false);
  }, [slug]);

  if (status === "loading") return <p className="editor-status">Loading…</p>;
  if (status === "error") return <p className="editor-status">Failed to load: {error}</p>;
  if (!exhibit) return null;

  if (exhibit.image.width === 0) {
    return (
      <ImageImportForm
        slug={slug}
        onImported={(image) => reloadImage(image)}
      />
    );
  }

  const dziUrl = `/exhibits/${slug}/${exhibit.image.dziPath}`;

  return (
    <div className="editor-layout">
      <header className="editor-header">
        <input
          className="editor-header__title"
          value={exhibit.title}
          onChange={(e) => updateMeta({ title: e.target.value })}
          placeholder="Exhibit title"
        />
        <div className="editor-header__actions">
          <button type="button" onClick={() => setPreviewing((p) => !p)}>
            {previewing ? "Back to editor" : "Preview"}
          </button>
          <button type="button" onClick={save} disabled={!dirty || saving}>
            {saving ? "Saving…" : dirty ? "Save" : "Saved"}
          </button>
        </div>
      </header>

      {previewing ? (
        <ExhibitReader exhibit={exhibit} assetBase={`/exhibits/${slug}/`} />
      ) : (
        <div className="editor-body">
          <div className="editor-canvas">
            <AnnotationCanvas
              ref={canvasRef}
              exhibitKey={slug}
              dziUrl={dziUrl}
              waypoints={exhibit.waypoints}
              focusId={selectedId}
              annotationStyle={exhibit.annotationStyle}
              drawingEnabled={drawingEnabled}
              onCreateRegion={(id, region) => {
                addWaypoint(id, region);
                setSelectedId(id);
                setDrawArmed(false);
              }}
              onUpdateRegion={updateWaypointRegion}
              onDeleteRegion={removeWaypoint}
              onSelect={setSelectedId}
            />
          </div>
          <div className="editor-sidebar">
            <AnnotationStyleSettings
              style={exhibit.annotationStyle}
              onChange={updateAnnotationStyle}
            />
            <label className="editor-sidebar__label" htmlFor="exhibit-intro">
              Exhibit introduction
            </label>
            <textarea
              id="exhibit-intro"
              className="editor-sidebar__intro"
              placeholder="Shown above the waypoints, before readers start scrolling (markdown supported)…"
              value={exhibit.intro ?? ""}
              onChange={(e) => updateMeta({ intro: e.target.value })}
              rows={3}
            />
            <WaypointPanel
              waypoints={exhibit.waypoints}
              selectedId={selectedId}
              drawArmed={drawArmed}
              onToggleDraw={() => setDrawArmed((a) => !a)}
              onAddEntry={(kind) => {
                const id = addEntry(kind);
                setSelectedId(id);
              }}
              onSelect={setSelectedId}
              onChangeTitle={updateWaypointTitle}
              onChangeBody={updateWaypointBody}
              onDelete={(id) => {
                canvasRef.current?.removeAnnotation(id);
                removeWaypoint(id);
                if (selectedId === id) setSelectedId(undefined);
              }}
              onReorder={reorderWaypoints}
            />
          </div>
        </div>
      )}
    </div>
  );
}
