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

v1 complete:

- [x] Deep-zoom viewer (OpenSeadragon) + DZI tiling pipeline (`sharp`)
- [x] Shared `ExhibitReader` component: scroll-synced pan/zoom + click-to-jump
- [x] Visual editor for drawing regions and attaching text (Annotorious)
- [x] Love Letter exhibit content authored
- [x] Static build + deploy docs

v1 deliberately leaves out: accounts/multi-user editing, polygon regions
(rectangles only — the schema is polygon-ready), drag-and-drop image upload
(path-based import only), and a mobile-specific redesign.

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
2. Import a source image by path (see "Adding an image" below).
3. Drag a rectangle on the image to create a waypoint; write its text in the
   sidebar (markdown supported). Drag waypoint cards to reorder them.
4. Click **Preview** at any time to see the live scrollytelling reader.
5. Click **Save** to write `exhibits/<slug>/exhibit.json` to disk.

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
