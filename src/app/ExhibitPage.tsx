import { useEffect, useState } from "react";
import { ExhibitReader } from "../viewer/ExhibitReader";
import { exhibitSchema, migrateExhibitRaw, type Exhibit } from "../viewer/schema";

interface ExhibitPageProps {
  slug: string;
}

export function ExhibitPage({ slug }: ExhibitPageProps) {
  const [exhibit, setExhibit] = useState<Exhibit | null>(null);
  const [error, setError] = useState<string | null>(null);
  const assetBase = `${import.meta.env.BASE_URL}exhibits/${slug}/`;

  useEffect(() => {
    setExhibit(null);
    setError(null);
    fetch(`${assetBase}exhibit.json`)
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        return res.json();
      })
      .then((json) => setExhibit(exhibitSchema.parse(migrateExhibitRaw(json))))
      .catch((err) => setError(String(err)));
  }, [slug, assetBase]);

  if (error) return <p style={{ padding: "2rem" }}>Failed to load exhibit: {error}</p>;
  if (!exhibit) return <p style={{ padding: "2rem" }}>Loading…</p>;

  return <ExhibitReader exhibit={exhibit} assetBase={assetBase} />;
}
