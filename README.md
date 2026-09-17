# Exhibit tool

A small, database-free tool for building "scrollytelling" exhibits over a
deep-zoomable image: scroll (or click) through annotated text and the image
pans/zooms to the region each passage discusses. Built to replace a
Neatline/Omeka exhibit ([loveletter.viraltexts.org](https://loveletter.viraltexts.org))
whose dynamic behavior stopped working after Neatline went unmaintained.

Each exhibit is a plain folder under `exhibits/<slug>/` — a source image, a
generated Deep Zoom tile pyramid, and an `exhibit.json` config — so exhibits
are just files, versionable in git, with no server or database required to
publish them.

## Status

v1 + v2 complete:

- [x] Deep-zoom viewer (OpenSeadragon) + DZI tiling pipeline (`sharp`)
- [x] Shared `ExhibitReader` component: scroll-synced pan/zoom + click-to-jump
- [x] Visual editor for drawing regions and attaching text (Annotorious)
- [x] Headers and freestanding notes (narrative content with no linked region)
- [x] Per-exhibit reader theme: font, colors, custom CSS
- [x] Multi-page exhibits (each page its own image + waypoint list, with
      Prev/Next navigation between them)
- [x] Love Letter exhibit content authored (8 annotations across the page)
- [x] Static build + deploy docs
- [x] Standalone single-exhibit export (`npm run export`) for uploading one
      exhibit to any host, independent of the multi-exhibit app
- [x] Inline text-linked regions: a word or phrase mid-paragraph — not just
      a whole block — can pan/zoom to a region, via a "Prose" entry whose
      markdown contains `[phrase](#some-waypoint-id)`

Deliberately left out: accounts/multi-user editing, polygon regions
(rectangles only — the schema is polygon-ready), drag-and-drop image upload
(path-based import only), a mobile-specific redesign, per-page URL
deep-linking, drag-reorder of pages, per-page theme/style overrides, and any
external font loading (the font picker is a curated system-font list, kept
offline-friendly like the rest of the tool).

## Development

```bash
npm install
npm run dev
```

Opens the reader app at `http://localhost:5173`, listing exhibits under
`exhibits/`. A `_fixture` exhibit exists for testing the viewer against
known regions; it's excluded from the public exhibit list and from builds
(any `exhibits/` folder starting with `_` is treated as dev-only).

## Authoring an exhibit

```bash
npm run edit
```

Opens the visual editor at `http://localhost:5174/editor.html`. From there:

1. Create a new exhibit (gives it a slug).
2. Import a source image by path (see "Adding an image" below) — the tab
   bar above the canvas lets you add more pages, each with its own image.
3. Click "＋ Draw a box" (or hold Option/Alt) to arm the draw tool, then
   drag on the image to create a waypoint; write its text in the sidebar
   (markdown supported). "＋ Header"/"＋ Note" add text entries with no
   linked region. Drag cards to reorder.
4. For a word or phrase *inside* a longer passage to pan/zoom the image —
   rather than a whole separate block — draw the region as a waypoint but
   leave its title and body empty (it becomes invisible in the reader,
   existing only as a jump target), click **Copy link** on that card to
   copy `[](#its-id)`, then add a "＋ Prose" block and paste that into the
   flowing text, filling in the link text between the brackets:
   `[the phrase](#its-id)`.
5. Use "Box appearance" and "Reader appearance" in the sidebar to set the
   drawn-box style and the published reader's font/colors/custom CSS.
6. Click **Preview** at any time to see the live scrollytelling reader.
7. Click **Save** to write `exhibits/<slug>/exhibit.json` to disk.

The editor only runs locally during authoring — it's never part of the
published site (see "How it's built" below).

## Adding an image

The tool's image-import pipeline (via `sharp`) accepts standard raster
formats: PNG, JPEG, TIFF, WebP. It does **not** read JPEG2000 (`.jp2`) —
that needs a custom libvips build. If your source is `.jp2` (e.g. a
Chronicling America newspaper scan), convert it to TIFF first — see
[`exhibits/love-letter/prep-source.py`](exhibits/love-letter/prep-source.py)
for an example using Python + Pillow.

## Building & deploying

```bash
npm run build
```

Produces a fully static `dist/` folder — the built reader app plus each
published exhibit's `exhibit.json` and tile pyramid (raw source images are
excluded). No server or database is needed to host it: `dist/` can be
deployed as-is to GitHub Pages, Netlify, or any static file host.

Routing is hash-based (`#/`, `#/e/<slug>`), so no server rewrite rules are
required. If deploying to a GitHub Pages *project* page (e.g.
`username.github.io/repo-name/`, not a custom domain at the root), set
`base: '/repo-name/'` in `vite.config.ts` before building.

`npm run preview` serves the built `dist/` folder locally, useful for
verifying the production build before deploying.

### Exporting a single exhibit

```bash
npm run export -- love-letter
```

Produces `export/love-letter/` — a completely standalone, self-contained
build of *just that exhibit*: its own `index.html`, JS/CSS, and tiles, all
referenced with relative paths. Unlike `npm run build` (which bundles every
exhibit into one multi-exhibit app with hash routing), this folder has no
dependency on a landing page or any other exhibit, and works when uploaded
to any subdirectory of any static host — FTP, cPanel, Netlify's drop-zone,
S3, etc. Just upload the contents of `export/<slug>/` and visit that URL.

Use `npm run build` when you want one site hosting a collection of
exhibits; use `npm run export` when you want to hand a single exhibit to a
domain you don't control the whole deploy pipeline for.
