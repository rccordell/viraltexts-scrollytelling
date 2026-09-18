import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import type { Exhibit, Region, Waypoint } from "./schema";
import { FONT_STACKS, defaultAnnotationStyle, defaultTheme } from "./schema";
import { useOpenSeadragonViewer } from "./useOpenSeadragonViewer";
import { flyToWaypoint } from "./flyToWaypoint";
import { useScrollSync } from "./scrollSync";
import { WaypointBlock } from "./WaypointBlock";
import { ProseBlock } from "./ProseBlock";
import { NoteHotspots } from "./NoteHotspots";
import { ActiveRegionHighlight } from "./ActiveRegionHighlight";
import "./ExhibitReader.css";

interface ExhibitReaderProps {
  exhibit: Exhibit;
  /** Base URL the image's dziPath is relative to, e.g. "/exhibits/love-letter/". */
  assetBase: string;
}

export function ExhibitReader({ exhibit, assetBase }: ExhibitReaderProps) {
  const [pageIndex, setPageIndex] = useState(0);
  const page = exhibit.pages[Math.min(pageIndex, exhibit.pages.length - 1)];
  const dziUrl = `${assetBase}${page.image.dziPath}`;
  const { containerRef, viewer } = useOpenSeadragonViewer(dziUrl);
  const [activeId, setActiveId] = useState<string | undefined>(page.waypoints[0]?.id);
  // Bumped on every explicit click (not on scroll-driven activation), so
  // clicking the same already-active link again still re-flies the view —
  // otherwise activeId wouldn't change and the effect below would never
  // re-run, leaving a manual pan/zoom-away un-corrected.
  const [flightNonce, setFlightNonce] = useState(0);
  const textRef = useRef<HTMLDivElement>(null);

  const onActivate = useCallback((id: string) => setActiveId(id), []);
  const { registerBlock, jumpTo: rawJumpTo } = useScrollSync({ onActivate });
  const jumpTo = useCallback(
    (id: string) => {
      setFlightNonce((n) => n + 1);
      rawJumpTo(id);
    },
    [rawJumpTo],
  );

  useEffect(() => {
    setActiveId(page.waypoints[0]?.id);
    textRef.current?.scrollTo({ top: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageIndex]);

  useEffect(() => {
    if (!viewer || !activeId) return;
    const waypoint = page.waypoints.find((w) => w.id === activeId);
    // Headers/notes have no region — leave the image wherever it was at
    // the last real waypoint rather than moving it.
    if (!waypoint || !waypoint.region) return;
    flyToWaypoint(viewer, waypoint as Waypoint & { region: Region });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewer, activeId, flightNonce, page.waypoints]);

  const theme = exhibit.theme ?? defaultTheme;
  const themeVars = {
    "--exhibit-font": FONT_STACKS[theme.fontFamily],
    "--exhibit-bg": theme.backgroundColor,
    "--exhibit-text": theme.textColor,
    "--exhibit-accent": theme.accentColor,
  } as React.CSSProperties;

  const isLastPage = pageIndex === exhibit.pages.length - 1;
  const notes = page.waypoints.filter(
    (w): w is Waypoint & { region: Region } => w.kind === "note" && !!w.region,
  );
  const boxDefaultStyle = exhibit.annotationStyle ?? defaultAnnotationStyle;
  const activeWaypoint = page.waypoints.find((w) => w.id === activeId);
  const activeRegion = activeWaypoint?.region ?? null;
  const activeStyle = activeWaypoint?.style ?? boxDefaultStyle;

  return (
    <div className="exhibit-reader" style={themeVars}>
      {theme.customCss && <style>{theme.customCss}</style>}
      <div className="exhibit-reader__viewer" ref={containerRef} />
      <ActiveRegionHighlight viewer={viewer} region={activeRegion} style={activeStyle} />
      <NoteHotspots viewer={viewer} notes={notes} defaultStyle={boxDefaultStyle} />
      <div className="exhibit-reader__text" ref={textRef}>
        {pageIndex === 0 && exhibit.intro && (
          <div className="exhibit-reader__intro">
            <h1>{exhibit.title}</h1>
            {exhibit.subtitle && <p className="subtitle">{exhibit.subtitle}</p>}
            <ReactMarkdown>{exhibit.intro}</ReactMarkdown>
          </div>
        )}
        {page.waypoints.map((waypoint) => {
          if (waypoint.kind === "note") return null;
          if (waypoint.kind === "prose") {
            return (
              <ProseBlock
                key={waypoint.id}
                waypoint={waypoint}
                activeId={activeId}
                registerBlock={registerBlock}
                onJumpTo={jumpTo}
              />
            );
          }
          // A waypoint with no title and no body exists only to be
          // referenced from inline prose elsewhere (via `[text](#its-id)`)
          // — it never gets its own block in the reading flow.
          const isAnchorOnly =
            waypoint.kind === "waypoint" && !waypoint.title?.trim() && !waypoint.body?.trim();
          if (isAnchorOnly) return null;
          return (
            <WaypointBlock
              key={waypoint.id}
              waypoint={waypoint}
              active={waypoint.id === activeId}
              registerRef={registerBlock(waypoint.id)}
              onClick={() => jumpTo(waypoint.id)}
            />
          );
        })}
        {exhibit.pages.length > 1 && (
          <div className="exhibit-reader__page-nav">
            <button
              type="button"
              disabled={pageIndex === 0}
              onClick={() => setPageIndex((i) => Math.max(0, i - 1))}
            >
              ← Previous page
            </button>
            <span>
              Page {pageIndex + 1} of {exhibit.pages.length}
            </span>
            <button
              type="button"
              disabled={isLastPage}
              onClick={() => setPageIndex((i) => Math.min(exhibit.pages.length - 1, i + 1))}
            >
              Next page →
            </button>
          </div>
        )}
        {isLastPage && exhibit.credits && (
          <div className="exhibit-reader__credits">
            <ReactMarkdown>{exhibit.credits}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
