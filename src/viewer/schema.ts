import { z } from "zod";

export const rectRegionSchema = z.object({
  type: z.literal("rect"),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
});

export const regionSchema = rectRegionSchema;

// "waypoint" is tied to a drawn region and pans/zooms the image when it
// becomes active in the scrolling text. "header" is a narrative entry with
// no region (a short subhead, title only) that sits between waypoints in
// reading order but never moves the image. "prose" is also a region-free
// block of long-form text, but its body can contain inline links like
// `[phrase](#some-waypoint-id)` that reference a *different* waypoint's
// region — clicking or scrolling to that phrase pans/zooms to it, same as a
// full waypoint block would. A waypoint referenced only this way (never
// given its own title or body) is left out of the reader's block-by-block
// flow entirely — it exists solely as a region for inline prose to point
// at. "note" is also tied to a drawn region, like "waypoint", but instead
// of taking part in the scrolling text its region stays invisible on the
// image until the mouse is over it, then highlights; clicking it pans/zooms
// to the region (like a waypoint) and reveals its text in a popup beside
// it, independent of the scroll flow — for an aside that belongs to one
// spot on the image but isn't part of the main narrative.
export const entryKindSchema = z.enum(["waypoint", "header", "note", "prose"]);

export const annotationStyleSchema = z.object({
  showBorder: z.boolean().default(true),
  borderColor: z.string().default("#fbbf24"),
  borderWidth: z.number().min(0).default(2),
  showFill: z.boolean().default(true),
  fillColor: z.string().default("#fbbf24"),
  fillOpacity: z.number().min(0).max(1).default(0.15),
});

export const defaultAnnotationStyle: AnnotationStyle = annotationStyleSchema.parse({});

export const waypointSchema = z
  .object({
    id: z.string(),
    kind: entryKindSchema.default("waypoint"),
    region: regionSchema.optional(),
    zoomPadding: z.number().default(0.15),
    title: z.string().optional(),
    body: z.string().default(""),
    // Overrides the exhibit-wide "Box appearance" for just this box, so an
    // author can make individual waypoints/notes look different from one
    // another (e.g. to visually distinguish a category of content).
    style: annotationStyleSchema.optional(),
  })
  .refine((w) => (w.kind !== "waypoint" && w.kind !== "note") || !!w.region, {
    message: "waypoint and note entries must have a region",
    path: ["region"],
  });

export const FONT_STACKS = {
  georgia: 'Georgia, "Times New Roman", serif',
  times: '"Times New Roman", Times, serif',
  palatino: '"Palatino Linotype", Palatino, "Book Antiqua", serif',
  helvetica: "Helvetica, Arial, sans-serif",
  verdana: "Verdana, Geneva, sans-serif",
  courier: '"Courier New", Courier, monospace',
} as const;

export const themeSchema = z.object({
  fontFamily: z
    .enum(["georgia", "times", "palatino", "helvetica", "verdana", "courier"])
    .default("georgia"),
  backgroundColor: z.string().default("#ffffff"),
  textColor: z.string().default("#222222"),
  accentColor: z.string().default("#b8862b"),
  customCss: z.string().optional(),
});

export const defaultTheme: Theme = themeSchema.parse({});

export const imageSchema = z.object({
  dziPath: z.string(),
  width: z.number(),
  height: z.number(),
  tileSize: z.number().default(256),
  overlap: z.number().default(1),
});

export const pageSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  image: imageSchema,
  waypoints: z.array(waypointSchema),
});

export const exhibitSchema = z.object({
  schemaVersion: z.literal(2),
  slug: z.string(),
  title: z.string(),
  subtitle: z.string().optional(),
  intro: z.string().optional(),
  credits: z.string().optional(),
  pages: z.array(pageSchema).min(1),
  annotationStyle: annotationStyleSchema.optional(),
  theme: themeSchema.optional(),
});

/**
 * Lifts a v1 exhibit (top-level `image`/`waypoints`) into the v2 shape
 * (`pages: [{ id: "page-1", image, waypoints }]`), and rewrites any
 * old-style "note" entry (region-free text block, from before "note" meant
 * an image popup) into a "prose" entry, which renders identically. Called
 * on every raw exhibit.json before validation, so old files on disk keep
 * working unchanged until the next Save rewrites them in the new shape.
 */
export function migrateExhibitRaw(raw: unknown): unknown {
  let migrated = raw;
  if (migrated && typeof migrated === "object" && (migrated as Record<string, unknown>).schemaVersion === 1) {
    const { image, waypoints, ...rest } = migrated as Record<string, unknown>;
    migrated = {
      ...rest,
      schemaVersion: 2,
      pages: [{ id: "page-1", image, waypoints }],
    };
  }
  if (migrated && typeof migrated === "object" && Array.isArray((migrated as Record<string, unknown>).pages)) {
    const m = migrated as Record<string, unknown>;
    migrated = {
      ...m,
      pages: (m.pages as Record<string, unknown>[]).map((p) =>
        Array.isArray(p.waypoints)
          ? {
              ...p,
              waypoints: (p.waypoints as Record<string, unknown>[]).map((w) =>
                w && w.kind === "note" && !w.region ? { ...w, kind: "prose" } : w,
              ),
            }
          : p,
      ),
    };
  }
  return migrated;
}

export type Region = z.infer<typeof regionSchema>;
export type EntryKind = z.infer<typeof entryKindSchema>;
export type Waypoint = z.infer<typeof waypointSchema>;
export type AnnotationStyle = z.infer<typeof annotationStyleSchema>;
export type Theme = z.infer<typeof themeSchema>;
export type ExhibitImage = z.infer<typeof imageSchema>;
export type Page = z.infer<typeof pageSchema>;
export type Exhibit = z.infer<typeof exhibitSchema>;
