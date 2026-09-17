// <input type="color"> requires a 6-digit hex value; fall back when a
// non-hex color (a named color, rgba(), etc.) was stored.
export function normalizeHex(color: string, fallback: string): string {
  return /^#[0-9a-f]{6}$/i.test(color) ? color : fallback;
}
