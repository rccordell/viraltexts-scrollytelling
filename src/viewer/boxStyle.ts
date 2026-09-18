import type { AnnotationStyle } from "./schema";

function hexToRgb(hex: string): [number, number, number] {
  const cleaned = hex.replace("#", "");
  const full = cleaned.length === 3 ? cleaned.split("").map((c) => c + c).join("") : cleaned;
  const n = parseInt(full, 16);
  if (Number.isNaN(n)) return [184, 134, 43];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * Sets CSS custom properties on a region overlay element so its highlight
 * (border/fill) reflects a specific AnnotationStyle — either the exhibit's
 * configured "Box appearance", or an individual waypoint/note's own
 * override — rather than a fixed, one-size-fits-all color.
 */
export function applyBoxStyleVars(el: HTMLElement, style: AnnotationStyle): void {
  el.style.setProperty("--box-border-width", style.showBorder ? `${style.borderWidth}px` : "0px");
  el.style.setProperty("--box-border-color", style.borderColor);
  if (style.showFill) {
    const [r, g, b] = hexToRgb(style.fillColor);
    el.style.setProperty("--box-fill", `rgba(${r}, ${g}, ${b}, ${style.fillOpacity})`);
  } else {
    el.style.setProperty("--box-fill", "transparent");
  }
}
