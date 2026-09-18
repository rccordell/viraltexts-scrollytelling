import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import {
  Annotorious,
  OpenSeadragonAnnotator,
  OpenSeadragonViewer,
  useAnnotator,
  useViewer,
} from "@annotorious/react";
import {
  parseFragmentSelector,
  type ImageAnnotation,
  type AnnotoriousOpenSeadragonAnnotator,
  type RectangleGeometry,
  type DrawingStyle,
} from "@annotorious/react";
import "@annotorious/react/annotorious-react.css";
import type { AnnotationStyle, Region, Waypoint } from "../viewer/schema";
import { defaultAnnotationStyle } from "../viewer/schema";
import { flyToWaypoint } from "../viewer/flyToWaypoint";

export interface AnnotationCanvasHandle {
  /** Removes a shape from the canvas and clears selection (used when a
   * waypoint is deleted from the sidebar, so the drawn box doesn't linger
   * and the draw tool isn't left in a stuck "editing a selection" state). */
  removeAnnotation: (id: string) => void;
}

interface AnnotationCanvasProps {
  exhibitKey: string; // changes when a different exhibit is loaded, to reset sync
  dziUrl: string;
  waypoints: Waypoint[];
  focusId?: string;
  annotationStyle?: AnnotationStyle;
  /** When false, dragging pans the image as usual (OpenSeadragon's default);
   * when true, dragging draws a new box instead. */
  drawingEnabled: boolean;
  onCreateRegion: (id: string, region: Region) => void;
  onUpdateRegion: (id: string, region: Region) => void;
  onDeleteRegion: (id: string) => void;
  onSelect: (id: string) => void;
}

function shapeToRegion(annotation: ImageAnnotation): Region | null {
  const selector = annotation.target?.selector;
  if (!selector || Array.isArray(selector) || selector.type !== "RECTANGLE") {
    return null;
  }
  const g = selector.geometry as RectangleGeometry;
  return { type: "rect", x: g.x, y: g.y, width: g.w, height: g.h };
}

function toDrawingStyle(style: AnnotationStyle): DrawingStyle {
  // strokeWidth/fillOpacity of 0 make the border/fill invisible regardless
  // of color, so hiding either one doesn't need a special "transparent"
  // color value.
  return {
    stroke: style.borderColor as DrawingStyle["stroke"],
    strokeWidth: style.showBorder ? style.borderWidth : 0,
    fill: style.fillColor as DrawingStyle["fill"],
    fillOpacity: style.showFill ? style.fillOpacity : 0,
  };
}

export const AnnotationCanvas = forwardRef<AnnotationCanvasHandle, AnnotationCanvasProps>(
  function AnnotationCanvas(props, ref) {
    const options = useMemo(
      () => ({
        tileSources: props.dziUrl,
        prefixUrl: `${import.meta.env.BASE_URL}openseadragon-images/`,
        gestureSettingsMouse: { clickToZoom: false },
      }),
      [props.dziUrl],
    );
    // A function (rather than a static style) so each drawn box can reflect
    // its own waypoint's style override, falling back to the exhibit-wide
    // "Box appearance" for boxes that don't have one.
    const drawingStyle = useMemo(() => {
      const fallback = toDrawingStyle(props.annotationStyle ?? defaultAnnotationStyle);
      return (annotation: ImageAnnotation): DrawingStyle => {
        const waypoint = props.waypoints.find((w) => w.id === annotation.id);
        return waypoint?.style ? toDrawingStyle(waypoint.style) : fallback;
      };
    }, [props.annotationStyle, props.waypoints]);
    const annoHandleRef = useRef<AnnotoriousOpenSeadragonAnnotator | null>(null);

    useImperativeHandle(ref, () => ({
      removeAnnotation: (id: string) => {
        annoHandleRef.current?.removeAnnotation(id);
        annoHandleRef.current?.cancelSelected();
      },
    }));

    return (
      <Annotorious>
        <OpenSeadragonAnnotator
          tool="rectangle"
          drawingEnabled={props.drawingEnabled}
          drawingMode="drag"
          style={drawingStyle}
        >
          <OpenSeadragonViewer
            className={`annotation-canvas__viewer${props.drawingEnabled ? " annotation-canvas__viewer--drawing" : ""}`}
            options={options}
          />
          <AnnotationBridge {...props} annoHandleRef={annoHandleRef} />
        </OpenSeadragonAnnotator>
      </Annotorious>
    );
  },
);

function AnnotationBridge({
  exhibitKey,
  waypoints,
  focusId,
  onCreateRegion,
  onUpdateRegion,
  onDeleteRegion,
  onSelect,
  annoHandleRef,
}: AnnotationCanvasProps & {
  annoHandleRef: React.MutableRefObject<AnnotoriousOpenSeadragonAnnotator | null>;
}) {
  const anno = useAnnotator<AnnotoriousOpenSeadragonAnnotator>();
  const viewer = useViewer();
  const syncedForKey = useRef<string | null>(null);

  useEffect(() => {
    annoHandleRef.current = anno ?? null;
  }, [anno, annoHandleRef]);

  // Wire annotation lifecycle events -> our React state (the source of truth
  // going forward; this is one-directional except for the initial load sync
  // below).
  useEffect(() => {
    if (!anno) return;

    const handleCreate = (annotation: ImageAnnotation) => {
      const region = shapeToRegion(annotation);
      if (region) onCreateRegion(annotation.id, region);
    };
    const handleUpdate = (annotation: ImageAnnotation) => {
      const region = shapeToRegion(annotation);
      if (region) onUpdateRegion(annotation.id, region);
    };
    const handleDelete = (annotation: ImageAnnotation) => {
      onDeleteRegion(annotation.id);
    };
    const handleSelectionChanged = (selected: ImageAnnotation[]) => {
      if (selected[0]) onSelect(selected[0].id);
    };

    anno.on("createAnnotation", handleCreate);
    anno.on("updateAnnotation", handleUpdate);
    anno.on("deleteAnnotation", handleDelete);
    anno.on("selectionChanged", handleSelectionChanged);
    return () => {
      anno.off("createAnnotation", handleCreate);
      anno.off("updateAnnotation", handleUpdate);
      anno.off("deleteAnnotation", handleDelete);
      anno.off("selectionChanged", handleSelectionChanged);
    };
  }, [anno, onCreateRegion, onUpdateRegion, onDeleteRegion, onSelect]);

  // One-time sync: load previously-saved waypoints as editable annotations
  // when a (new) exhibit first becomes available. Deliberately does not
  // re-run on every waypoints change (e.g. text edits), so it never clobbers
  // shapes the user is actively editing.
  useEffect(() => {
    if (!anno || syncedForKey.current === exhibitKey) return;
    syncedForKey.current = exhibitKey;
    anno.setAnnotations(
      waypoints
        .filter((w) => w.region)
        .map((w) => ({
          id: w.id,
          bodies: [],
          target: {
            annotation: w.id,
            selector: parseFragmentSelector(
              `xywh=pixel:${w.region!.x},${w.region!.y},${w.region!.width},${w.region!.height}`,
            ),
          },
        })),
      true,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anno, exhibitKey]);

  useEffect(() => {
    if (!viewer || !focusId) return;
    const waypoint = waypoints.find((w) => w.id === focusId);
    if (!waypoint || !waypoint.region) return;
    flyToWaypoint(viewer, waypoint as Waypoint & { region: Region });
  }, [viewer, focusId, waypoints]);

  return null;
}
