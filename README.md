# Exhibit tool

A small, database-free tool for building "scrollytelling" exhibits over a
deep-zoomable image: scroll (or click) through annotated text and the image
pans/zooms to the region each passage discusses. Built to replace a
Neatline/Omeka exhibit ([loveletter.viraltexts.org](https://loveletter.viraltexts.org))
whose dynamic behavior stopped working after the development of several
Neatline plugins halted.

Each exhibit is a plain folder under `exhibits/<slug>/` — a source image, a
generated Deep Zoom tile pyramid, and an `exhibit.json` config — so exhibits
are just files, versionable in git, with no server or database required to
publish them.

## Status

v1 + v2 complete:

- [x] Deep-zoom viewer (OpenSeadragon) + DZI tiling pipeline (`sharp`)
- [x] Shared `ExhibitReader` component: scroll-synced pan/zoom + click-to-jump
- [x] Visual editor for drawing regions and attaching text (Annotorious)
- [x] Headers and freestanding prose (narrative content with no linked region)
- [x] Notes: a region on the image that highlights on hover and, on click
      (directly or via an inline prose link), shows its text in a fixed
      panel docked to the image, independent of the scrolling text
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

## Annotation types

Every entry in an exhibit's waypoint list is one of four kinds:

| Kind | Region? | In the scroll flow? | What it does |
| --- | --- | --- | --- |
| **Header** | No | Yes | A subhead (title only, no body) that breaks up a long exhibit into sections. Never moves the image. |
| **Prose** | No | Yes | A long-form markdown block. Its body can link a word or phrase mid-paragraph to *another* entry's region — `[the phrase](#some-waypoint-id)` — so clicking or hovering that phrase pans/zooms the image, without the phrase needing its own block. |
| **Waypoint** | Yes | Yes, if given a title/body — otherwise invisible | The main scroll-synced building block. As the reader scrolls a waypoint into view (or clicks it), the image pans/zooms to its region. Leave title and body empty and it becomes **anchor-only**: it never appears as its own block, existing solely as a region for a Prose entry to link to (see above) — this is how a single word inside a longer passage gets tied to a spot on the image. |
| **Note** | Yes | No — never appears as a block | A region that stays invisible on the image until the mouse is over it, then highlights, independent of scroll position. Clicking it — directly, or via an inline Prose link — pans/zooms to the region and shows its text in a panel docked to the image, without disturbing the reader's place in the scrolling text. For an aside that belongs to one spot on the image but isn't part of the main narrative. |

A couple of other per-entry settings, available on any Waypoint or Note:

- **Custom box color** — overrides the exhibit-wide "Box appearance" for just that one region, e.g. to visually set apart a category of content.
- **Zoom floor (`minZoomWidth`)** — for a region drawn tightly around a single word or short phrase, fitting the box exactly would zoom in until that word fills the screen. Setting a minimum width (in image pixels) keeps the fly-to zoomed out enough to show useful surrounding context — the reader's column of the newspaper, say — no matter how small the drawn box is.

## Authoring an exhibit

```bash
npm run edit
```

Opens the visual editor at `http://localhost:5174/editor.html`. From there:

1. Create a new exhibit (gives it a slug).
2. Import a source image by path (see "Adding an image" below) — the tab
   bar above the canvas lets you add more pages, each with its own image.
3. Click "＋ Draw a waypoint" (or hold Option/Alt) to arm the draw tool,
   then drag on the image to create a waypoint. Its card offers a choice:
   **Copy link** (for referencing the region from prose, see point 4) or
   **＋ Add waypoint text**, which reveals a title/body to make it its own
   block in the sidebar (markdown supported). "＋ Header" adds a subhead
   with no linked region; "＋ Prose" adds a long-form text block, also with
   no region of its own (see point 4). Drag cards to reorder.
4. For a word or phrase *inside* a longer passage to pan/zoom the image —
   rather than a whole separate block — draw a waypoint and leave it as a
   region only (skip "Add waypoint text"; it stays invisible in the reader,
   existing only as a jump target), click **Copy link** on that card to
   copy `[](#its-id)`, then add a "＋ Prose" block and paste that into the
   flowing text, filling in the link text between the brackets:
   `[the phrase](#its-id)`. In the reader, hovering a linked phrase pans to
   it too (not just clicking) — the cursor changes to a zoom icon over one
   as a hint, but for exhibits with many closely-linked phrases it can be
   worth adding a line to the intro like "Hover or click an underlined
   phrase to see it on the image" for readers unfamiliar with the pattern.
5. For an aside tied to one spot on the image that shouldn't be part of the
   scrolling text at all, click "＋ Draw a note" and drag on the image.
   A note's region stays invisible until a reader's mouse is over it, then
   highlights; clicking it (or an inline prose link to it) pans/zooms to
   that region and shows the note's text in a panel docked to the bottom
   of the image, independent of the reader's scroll position.
6. Use "Box appearance" and "Reader appearance" in the sidebar to set the
   exhibit-wide drawn-box style and the published reader's font/colors/
   custom CSS. Any single waypoint or note can override this — check
   "Custom box color for this one" on its card — for a box that should
   stand out from the rest (e.g. a different category of content).
7. Click **Preview** at any time to see the live scrollytelling reader.
8. Click **Save** to write `exhibits/<slug>/exhibit.json` to disk.

The editor only runs locally during authoring — it's never part of the
published site (see "Building & deploying" below).

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

The editor's header also has an **Export** button that does the same
thing without leaving the browser — it saves any unsaved changes, then
builds the current exhibit into `export/<slug>/` and shows the output path.
