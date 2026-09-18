import { useEffect, useRef, useState } from "react";
import { useExhibitState } from "./useExhibitState";
import { AnnotationCanvas, type AnnotationCanvasHandle } from "./AnnotationCanvas";
import { WaypointPanel } from "./WaypointPanel";
import { AnnotationStyleSettings } from "./AnnotationStyleSettings";
import { ThemeSettings } from "./ThemeSettings";
import { ExhibitReader } from "../viewer/ExhibitReader";
import { ExhibitPicker } from "./ExhibitPicker";
import { ImageImportForm } from "./ImageImportForm";
import { api } from "./api";
import "./editor.css";

function useSlugFromQuery(): [string | null, (slug: string) => void, () => void] {
  const [slug, setSlugState] = useState<string | null>(() =>
    new URLSearchParams(window.location.search).get("slug"),
  );
  function setSlug(next: string) {
    const url = new URL(window.location.href);
    url.searchParams.set("slug", next);
    window.history.pushState({}, "", url);
    setSlugState(next);
  }
  function clearSlug() {
    const url = new URL(window.location.href);
    url.searchParams.delete("slug");
    window.history.pushState({}, "", url);
    setSlugState(null);
  }
  return [slug, setSlug, clearSlug];
}

export function App() {
  const [slug, setSlug, clearSlug] = useSlugFromQuery();

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

  return <ExhibitEditor slug={slug} onBack={clearSlug} />;
}

function ExhibitEditor({ slug, onBack }: { slug: string; onBack: () => void }) {
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
    updateWaypointStyle,
    removeWaypoint,
    reorderWaypoints,
    reloadPageImage,
    updatePageTitle,
    addPage,
    removePage,
    movePage,
    updateMeta,
    updateAnnotationStyle,
    updateTheme,
    save,
  } = useExhibitState(slug);

  const [currentPageId, setCurrentPageId] = useState<string | undefined>();
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [previewing, setPreviewing] = useState(false);
  const canvasRef = useRef<AnnotationCanvasHandle>(null);

  // Dragging pans the image by default (so you can navigate around while
  // zoomed in); drawing a new box requires explicitly arming it, either via
  // a toolbar button (sticky until you draw or toggle it off, and picks
  // which kind of entry the box becomes) or by holding Option/Alt (a
  // temporary override while held, which always draws a waypoint).
  const [drawMode, setDrawMode] = useState<"waypoint" | "note" | null>(null);
  const [altHeld, setAltHeld] = useState(false);
  const drawingEnabled = drawMode !== null || altHeld;

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
    setDrawMode(null);
    setCurrentPageId(undefined);
  }, [slug]);

  if (status === "loading") return <p className="editor-status">Loading…</p>;
  if (status === "error") return <p className="editor-status">Failed to load: {error}</p>;
  if (!exhibit) return null;

  const currentPage = exhibit.pages.find((p) => p.id === currentPageId) ?? exhibit.pages[0];
  const pageIndex = exhibit.pages.findIndex((p) => p.id === currentPage.id);

  function handleBack() {
    if (dirty && !window.confirm("You have unsaved changes. Leave without saving?")) {
      return;
    }
    onBack();
  }

  return (
    <div className="editor-layout">
      <header className="editor-header">
        <button type="button" className="editor-header__back" onClick={handleBack}>
          ← Exhibits
        </button>
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

      {!previewing && (
        <div className="page-tabs">
          {exhibit.pages.map((page, i) => (
            <div
              key={page.id}
              className={`page-tabs__tab${page.id === currentPage.id ? " page-tabs__tab--active" : ""}`}
              onClick={() => setCurrentPageId(page.id)}
            >
              <input
                className="page-tabs__label"
                value={page.title ?? ""}
                placeholder={`Page ${i + 1}`}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => updatePageTitle(page.id, e.target.value)}
              />
              <button
                type="button"
                className="page-tabs__move"
                disabled={i === 0}
                onClick={(e) => {
                  e.stopPropagation();
                  movePage(page.id, -1);
                }}
                aria-label="Move page earlier"
              >
                ◀
              </button>
              <button
                type="button"
                className="page-tabs__move"
                disabled={i === exhibit.pages.length - 1}
                onClick={(e) => {
                  e.stopPropagation();
                  movePage(page.id, 1);
                }}
                aria-label="Move page later"
              >
                ▶
              </button>
              <button
                type="button"
                className="page-tabs__delete"
                disabled={exhibit.pages.length <= 1}
                onClick={(e) => {
                  e.stopPropagation();
                  removePage(page.id);
                  if (currentPage.id === page.id) setCurrentPageId(undefined);
                }}
                aria-label="Delete page"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            className="page-tabs__add"
            onClick={async () => setCurrentPageId(await addPage())}
          >
            ＋ Add page
          </button>
        </div>
      )}

      {previewing ? (
        <ExhibitReader exhibit={exhibit} assetBase={`/exhibits/${slug}/`} />
      ) : currentPage.image.width === 0 ? (
        <ImageImportForm
          slug={slug}
          pageId={currentPage.id}
          pageLabel={currentPage.title || `Page ${pageIndex + 1}`}
          onImported={(image) => reloadPageImage(currentPage.id, image)}
        />
      ) : (
        <div className="editor-body">
          <div className="editor-canvas">
            <AnnotationCanvas
              key={currentPage.id}
              ref={canvasRef}
              exhibitKey={`${slug}:${currentPage.id}`}
              dziUrl={`/exhibits/${slug}/${currentPage.image.dziPath}`}
              waypoints={currentPage.waypoints}
              focusId={selectedId}
              annotationStyle={exhibit.annotationStyle}
              drawingEnabled={drawingEnabled}
              onCreateRegion={(id, region) => {
                addWaypoint(currentPage.id, id, region, drawMode ?? "waypoint");
                setSelectedId(id);
                setDrawMode(null);
              }}
              onUpdateRegion={(id, region) => updateWaypointRegion(currentPage.id, id, region)}
              onDeleteRegion={(id) => removeWaypoint(currentPage.id, id)}
              onSelect={setSelectedId}
            />
          </div>
          <div className="editor-sidebar">
            <div className="editor-sidebar__sticky-settings">
              <ThemeSettings theme={exhibit.theme} onChange={updateTheme} />
              <AnnotationStyleSettings
                style={exhibit.annotationStyle}
                onChange={updateAnnotationStyle}
              />
            </div>
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
              waypoints={currentPage.waypoints}
              selectedId={selectedId}
              drawMode={drawMode}
              exhibitDefaultStyle={exhibit.annotationStyle}
              onToggleDraw={(mode) => setDrawMode((m) => (m === mode ? null : mode))}
              onAddEntry={(kind) => {
                const id = addEntry(currentPage.id, kind);
                setSelectedId(id);
              }}
              onSelect={setSelectedId}
              onChangeTitle={(id, title) => updateWaypointTitle(currentPage.id, id, title)}
              onChangeBody={(id, body) => updateWaypointBody(currentPage.id, id, body)}
              onChangeStyle={(id, style) => updateWaypointStyle(currentPage.id, id, style)}
              onDelete={(id) => {
                canvasRef.current?.removeAnnotation(id);
                removeWaypoint(currentPage.id, id);
                if (selectedId === id) setSelectedId(undefined);
              }}
              onReorder={(orderedIds) => reorderWaypoints(currentPage.id, orderedIds)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
