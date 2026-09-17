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

export const exhibitSchema = z.object({
  schemaVersion: z.literal(1),
  slug: z.string(),
  title: z.string(),
  subtitle: z.string().optional(),
  intro: z.string().optional(),
  credits: z.string().optional(),
  image: z.object({
    dziPath: z.string(),
    width: z.number(),
    height: z.number(),
    tileSize: z.number().default(256),
    overlap: z.number().default(1),
  }),
  waypoints: z.array(waypointSchema),
  annotationStyle: annotationStyleSchema.optional(),
});

export type Region = z.infer<typeof regionSchema>;
export type EntryKind = z.infer<typeof entryKindSchema>;
export type Waypoint = z.infer<typeof waypointSchema>;
export type AnnotationStyle = z.infer<typeof annotationStyleSchema>;
export type Exhibit = z.infer<typeof exhibitSchema>;
