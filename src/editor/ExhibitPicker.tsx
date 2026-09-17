import { useEffect, useState } from "react";
import { api } from "./api";
import "./editor.css";

interface ExhibitPickerProps {
  onChoose: (slug: string) => void;
  onCreate: (slug: string) => Promise<void>;
}

export function ExhibitPicker({ onChoose, onCreate }: ExhibitPickerProps) {
  const [exhibits, setExhibits] = useState<{ slug: string; title: string }[]>([]);
  const [newSlug, setNewSlug] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.listExhibits().then(setExhibits).catch((err) => setError(String(err)));
  }, []);

  async function handleCreate() {
    setError(null);
    if (!/^[a-z0-9][a-z0-9_-]*$/i.test(newSlug)) {
      setError("Slug must be alphanumeric (dashes/underscores OK), e.g. 'love-letter'.");
      return;
    }
    setCreating(true);
    try {
      await onCreate(newSlug);
    } catch (err) {
      setError(String(err));
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="exhibit-picker">
      <h1>Exhibits</h1>
      {exhibits.length > 0 && (
        <ul>
          {exhibits.map((e) => (
            <li key={e.slug}>
              <button type="button" onClick={() => onChoose(e.slug)}>
                {e.title}
              </button>
            </li>
          ))}
        </ul>
      )}
      <h2>New exhibit</h2>
      <input
        value={newSlug}
        onChange={(e) => setNewSlug(e.target.value)}
        placeholder="slug, e.g. love-letter"
      />
      <button type="button" onClick={handleCreate} disabled={creating || !newSlug}>
        {creating ? "Creating…" : "Create"}
      </button>
      {error && <p className="exhibit-picker__error">{error}</p>}
    </div>
  );
}
