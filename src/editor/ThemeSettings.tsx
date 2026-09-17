import { useState } from "react";
import type { Theme } from "../viewer/schema";
import { FONT_STACKS, defaultTheme } from "../viewer/schema";
import { normalizeHex } from "./colorUtils";

interface ThemeSettingsProps {
  theme: Theme | undefined;
  onChange: (theme: Theme) => void;
}

const FONT_LABELS: Record<keyof typeof FONT_STACKS, string> = {
  georgia: "Georgia",
  times: "Times New Roman",
  palatino: "Palatino",
  helvetica: "Helvetica",
  verdana: "Verdana",
  courier: "Courier New",
};

export function ThemeSettings({ theme, onChange }: ThemeSettingsProps) {
  const [open, setOpen] = useState(false);
  const current = theme ?? defaultTheme;

  function set<K extends keyof Theme>(key: K, value: Theme[K]) {
    onChange({ ...current, [key]: value });
  }

  return (
    <div className="style-settings">
      <button type="button" className="style-settings__toggle" onClick={() => setOpen((o) => !o)}>
        {open ? "▾" : "▸"} Reader appearance
      </button>
      {open && (
        <div className="style-settings__body">
          <label className="style-settings__row">
            Font
            <select value={current.fontFamily} onChange={(e) => set("fontFamily", e.target.value as Theme["fontFamily"])}>
              {Object.keys(FONT_STACKS).map((key) => (
                <option key={key} value={key}>
                  {FONT_LABELS[key as keyof typeof FONT_STACKS]}
                </option>
              ))}
            </select>
          </label>

          <label className="style-settings__row">
            <input
              type="color"
              value={normalizeHex(current.backgroundColor, defaultTheme.backgroundColor)}
              onChange={(e) => set("backgroundColor", e.target.value)}
            />
            Background
          </label>

          <label className="style-settings__row">
            <input
              type="color"
              value={normalizeHex(current.textColor, defaultTheme.textColor)}
              onChange={(e) => set("textColor", e.target.value)}
            />
            Text
          </label>

          <label className="style-settings__row">
            <input
              type="color"
              value={normalizeHex(current.accentColor, defaultTheme.accentColor)}
              onChange={(e) => set("accentColor", e.target.value)}
            />
            Accent (active waypoint highlight)
          </label>

          <label className="style-settings__row style-settings__row--column">
            Custom CSS — advanced, applied as-is to the published exhibit
            <textarea
              className="style-settings__css"
              value={current.customCss ?? ""}
              onChange={(e) => set("customCss", e.target.value)}
              rows={4}
              placeholder=".exhibit-reader__intro h1 { letter-spacing: 0.02em; }"
            />
          </label>
        </div>
      )}
    </div>
  );
}
