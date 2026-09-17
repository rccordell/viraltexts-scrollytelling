import { useCallback, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import type { Exhibit, Region, Waypoint } from "./schema";
import { useOpenSeadragonViewer } from "./useOpenSeadragonViewer";
import { flyToWaypoint } from "./flyToWaypoint";
import { useScrollSync } from "./scrollSync";
import { WaypointBlock } from "./WaypointBlock";
import "./ExhibitReader.css";

interface ExhibitReaderProps {
  exhibit: Exhibit;
  /** Base URL the image's dziPath is relative to, e.g. "/exhibits/love-letter/". */
  assetBase: string;
}

export function ExhibitReader({ exhibit, assetBase }: ExhibitReaderProps) {
  const dziUrl = `${assetBase}${exhibit.image.dziPath}`;
  const { containerRef, viewer } = useOpenSeadragonViewer(dziUrl);
  const [activeId, setActiveId] = useState<string | undefined>(
    exhibit.waypoints[0]?.id,
  );

  const onActivate = useCallback((id: string) => setActiveId(id), []);
  const { registerBlock, jumpTo } = useScrollSync({ onActivate });

  useEffect(() => {
    if (!viewer || !activeId) return;
    const waypoint = exhibit.waypoints.find((w) => w.id === activeId);
    // Headers/notes have no region — leave the image wherever it was at
    // the last real waypoint rather than moving it.
    if (!waypoint || !waypoint.region) return;
    flyToWaypoint(viewer, waypoint as Waypoint & { region: Region });
  }, [viewer, activeId, exhibit.waypoints]);

  return (
    <div className="exhibit-reader">
      <div className="exhibit-reader__viewer" ref={containerRef} />
      <div className="exhibit-reader__text">
        {exhibit.intro && (
          <div className="exhibit-reader__intro">
            <h1>{exhibit.title}</h1>
            {exhibit.subtitle && <p className="subtitle">{exhibit.subtitle}</p>}
            <ReactMarkdown>{exhibit.intro}</ReactMarkdown>
          </div>
        )}
        {exhibit.waypoints.map((waypoint) => (
          <WaypointBlock
            key={waypoint.id}
            waypoint={waypoint}
            active={waypoint.id === activeId}
            registerRef={registerBlock(waypoint.id)}
            onClick={() => jumpTo(waypoint.id)}
          />
        ))}
        {exhibit.credits && (
          <div className="exhibit-reader__credits">
            <ReactMarkdown>{exhibit.credits}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
