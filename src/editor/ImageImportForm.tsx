import { useState } from "react";
import { api } from "./api";
import type { Exhibit } from "../viewer/schema";
import "./editor.css";

interface ImageImportFormProps {
  slug: string;
  onImported: (image: Exhibit["image"]) => void;
}

export function ImageImportForm({ slug, onImported }: ImageImportFormProps) {
  const [sourcePath, setSourcePath] = useState("");
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleImport() {
    setError(null);
    setImporting(true);
    try {
      const result = await api.importImage(slug, sourcePath);
      onImported({
        dziPath: result.dziPath,
        width: result.width,
        height: result.height,
        tileSize: 256,
        overlap: 1,
      });
    } catch (err) {
      setError(String(err));
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="image-import-form">
      <h1>Import an image for "{slug}"</h1>
      <p>
        Path to a source image (PNG/JPEG/TIFF/WebP), relative to the project
        root — e.g. <code>exhibits/{slug}/source.tiff</code>.
      </p>
      <input
        value={sourcePath}
        onChange={(e) => setSourcePath(e.target.value)}
        placeholder={`exhibits/${slug}/source.tiff`}
      />
      <button type="button" onClick={handleImport} disabled={importing || !sourcePath}>
        {importing ? "Tiling…" : "Import & tile"}
      </button>
      {error && <p className="image-import-form__error">{error}</p>}
    </div>
  );
}
