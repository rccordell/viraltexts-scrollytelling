import { useState } from "react";
import type { AnnotationStyle } from "../viewer/schema";
import { defaultAnnotationStyle } from "../viewer/schema";
import { normalizeHex } from "./colorUtils";

interface AnnotationStyleSettingsProps {
  style: AnnotationStyle | undefined;
  onChange: (style: AnnotationStyle) => void;
}

interface AnnotationStyleFieldsProps {
  style: AnnotationStyle;
  onChange: (style: AnnotationStyle) => void;
}

/** The border/fill controls alone, with no collapsible wrapper — reused by
 * the exhibit-wide "Box appearance" panel and by a single waypoint/note's
 * own style override. */
export function AnnotationStyleFields({ style, onChange }: AnnotationStyleFieldsProps) {
  function set<K extends keyof AnnotationStyle>(key: K, value: AnnotationStyle[K]) {
    onChange({ ...style, [key]: value });
  }

  return (
    <div className="style-settings__body">
      <label className="style-settings__row">
        <input
          type="checkbox"
          checked={style.showBorder}
          onChange={(e) => set("showBorder", e.target.checked)}
        />
        Border
      </label>
      {style.showBorder && (
        <div className="style-settings__row style-settings__row--indent">
          <input
            type="color"
            value={normalizeHex(style.borderColor, defaultAnnotationStyle.borderColor)}
            onChange={(e) => set("borderColor", e.target.value)}
          />
          <label>
            width
            <input
              type="number"
              min={0}
              max={20}
              value={style.borderWidth}
              onChange={(e) => set("borderWidth", Number(e.target.value))}
            />
          </label>
        </div>
      )}

      <label className="style-settings__row">
        <input
          type="checkbox"
          checked={style.showFill}
          onChange={(e) => set("showFill", e.target.checked)}
        />
        Shaded fill
      </label>
      {style.showFill && (
        <div className="style-settings__row style-settings__row--indent">
          <input
            type="color"
            value={normalizeHex(style.fillColor, defaultAnnotationStyle.fillColor)}
            onChange={(e) => set("fillColor", e.target.value)}
          />
          <label>
            opacity
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={style.fillOpacity}
              onChange={(e) => set("fillOpacity", Number(e.target.value))}
            />
          </label>
        </div>
      )}
    </div>
  );
}

export function AnnotationStyleSettings({ style, onChange }: AnnotationStyleSettingsProps) {
  const [open, setOpen] = useState(false);
  const current = style ?? defaultAnnotationStyle;

  return (
    <div className="style-settings">
      <button
        type="button"
        className="style-settings__toggle"
        onClick={() => setOpen((o) => !o)}
      >
        {open ? "▾" : "▸"} Box appearance
      </button>
      {open && <AnnotationStyleFields style={current} onChange={onChange} />}
    </div>
  );
}
