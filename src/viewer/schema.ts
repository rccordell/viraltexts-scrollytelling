import { z } from "zod";

export const rectRegionSchema = z.object({
  type: z.literal("rect"),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
});

export const regionSchema = rectRegionSchema;

// "waypoint" is tied to a drawn region and pans/zooms the image when active.
// "header" and "note" are narrative entries with no region — they sit
// between waypoints in reading order but never move the image; a "header"
// is a short subhead (title only), a "note" is a block of prose (body only,
// title optional).
export const entryKindSchema = z.enum(["waypoint", "header", "note"]);

export const waypointSchema = z.object({
  id: z.string(),
  kind: entryKindSchema.default("waypoint"),
  region: regionSchema.optional(),
  zoomPadding: z.number().default(0.15),
  title: z.string().optional(),
  body: z.string().default(""),
});

export const annotationStyleSchema = z.object({
  showBorder: z.boolean().default(true),
  borderColor: z.string().default("#fbbf24"),
  borderWidth: z.number().min(0).default(2),
  showFill: z.boolean().default(true),
  fillColor: z.string().default("#fbbf24"),
  fillOpacity: z.number().min(0).max(1).default(0.15),
});

export const defaultAnnotationStyle: AnnotationStyle = annotationStyleSchema.parse({});

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
 * (`pages: [{ id: "page-1", image, waypoints }]`). Called on every raw
 * exhibit.json before validation, so old files on disk keep working
 * unchanged until the next Save rewrites them in the new shape.
 */
export function migrateExhibitRaw(raw: unknown): unknown {
  if (raw && typeof raw === "object" && (raw as Record<string, unknown>).schemaVersion === 1) {
    const { image, waypoints, ...rest } = raw as Record<string, unknown>;
    return {
      ...rest,
      schemaVersion: 2,
      pages: [{ id: "page-1", image, waypoints }],
    };
  }
  return raw;
}

export type Region = z.infer<typeof regionSchema>;
export type EntryKind = z.infer<typeof entryKindSchema>;
export type Waypoint = z.infer<typeof waypointSchema>;
export type AnnotationStyle = z.infer<typeof annotationStyleSchema>;
export type Theme = z.infer<typeof themeSchema>;
export type ExhibitImage = z.infer<typeof imageSchema>;
export type Page = z.infer<typeof pageSchema>;
export type Exhibit = z.infer<typeof exhibitSchema>;
