import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "../index.css";
import { ExhibitReader } from "../viewer/ExhibitReader";
import { exhibitSchema, migrateExhibitRaw, type Exhibit } from "../viewer/schema";

// Standalone single-exhibit build (see scripts/exportExhibit.mjs): unlike
// the main app, this always fetches exhibit.json relative to itself and
// never depends on the landing page, hash routing, or other exhibits — the
// built output is meant to be dropped into any directory on any static
// host and just work.
function ExportedExhibit() {
  const [exhibit, setExhibit] = useState<Exhibit | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("./exhibit.json")
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        return res.json();
      })
      .then((json) => {
        const parsed = exhibitSchema.parse(migrateExhibitRaw(json));
        document.title = parsed.title;
        setExhibit(parsed);
      })
      .catch((err) => setError(String(err)));
  }, []);

  if (error) return <p style={{ padding: "2rem" }}>Failed to load exhibit: {error}</p>;
  if (!exhibit) return <p style={{ padding: "2rem" }}>Loading…</p>;

  return <ExhibitReader exhibit={exhibit} assetBase="./" />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ExportedExhibit />
  </StrictMode>,
);
