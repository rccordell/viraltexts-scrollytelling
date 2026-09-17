import { useEffect, useRef, useState } from "react";
import OpenSeadragon from "openseadragon";

/**
 * Creates a single OpenSeadragon viewer instance bound to `containerRef`,
 * pointed at `dziUrl`. Recreated only if `dziUrl` changes.
 */
export function useOpenSeadragonViewer(dziUrl: string | undefined) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewer, setViewer] = useState<OpenSeadragon.Viewer | null>(null);

  useEffect(() => {
    if (!containerRef.current || !dziUrl) return;

    const instance = OpenSeadragon({
      element: containerRef.current,
      prefixUrl: `${import.meta.env.BASE_URL}openseadragon-images/`,
      tileSources: dziUrl,
      showNavigationControl: true,
      gestureSettingsMouse: { clickToZoom: false },
    });
    setViewer(instance);

    return () => {
      instance.destroy();
      setViewer(null);
    };
  }, [dziUrl]);

  return { containerRef, viewer };
}
