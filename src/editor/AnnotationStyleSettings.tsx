import { useState } from "react";
import type { AnnotationStyle } from "../viewer/schema";
import { defaultAnnotationStyle } from "../viewer/schema";

interface AnnotationStyleSettingsProps {
  style: AnnotationStyle | undefined;
  onChange: (style: AnnotationStyle) => void;
}

export function AnnotationStyleSettings({ style, onChange }: AnnotationStyleSettingsProps) {
  const [open, setOpen] = useState(false);
  const current = style ?? defaultAnnotationStyle;

  function set<K extends keyof AnnotationStyle>(key: K, value: AnnotationStyle[K]) {
    onChange({ ...current, [key]: value });
  }

  return (
    <div className="style-settings">
      <button
        type="button"
        className="style-settings__toggle"
        onClick={() => setOpen((o) => !o)}
      >
        {open ? "▾" : "▸"} Box appearance
      </button>
      {open && (
        <div className="style-settings__body">
          <label className="style-settings__row">
            <input
              type="checkbox"
              checked={current.showBorder}
              onChange={(e) => set("showBorder", e.target.checked)}
            />
            Border
          </label>
          {current.showBorder && (
            <div className="style-settings__row style-settings__row--indent">
              <input
                type="color"
                value={normalizeHex(current.borderColor)}
                onChange={(e) => set("borderColor", e.target.value)}
              />
              <label>
                width
                <input
                  type="number"
                  min={0}
                  max={20}
                  value={current.borderWidth}
                  onChange={(e) => set("borderWidth", Number(e.target.value))}
                />
              </label>
            </div>
          )}

          <label className="style-settings__row">
            <input
              type="checkbox"
              checked={current.showFill}
              onChange={(e) => set("showFill", e.target.checked)}
            />
            Shaded fill
          </label>
          {current.showFill && (
            <div className="style-settings__row style-settings__row--indent">
              <input
                type="color"
                value={normalizeHex(current.fillColor)}
                onChange={(e) => set("fillColor", e.target.value)}
              />
              <label>
                opacity
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={current.fillOpacity}
                  onChange={(e) => set("fillOpacity", Number(e.target.value))}
                />
              </label>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// <input type="color"> requires a 6-digit hex value; fall back to the
// default if a non-hex color (e.g. a named color or rgba()) was stored.
function normalizeHex(color: string): string {
  return /^#[0-9a-f]{6}$/i.test(color) ? color : defaultAnnotationStyle.borderColor;
}
