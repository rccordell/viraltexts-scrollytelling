"""One-off prep step for the Love Letter exhibit source image.

The original scan from Chronicling America (NDNP) is delivered as JPEG2000
(.jp2). Sharp/libvips' prebuilt binaries cannot read .jp2 (would need a
custom libvips build with OpenJPEG), so this tool's general image-import
pipeline only accepts standard raster formats (PNG/JPEG/TIFF/WebP). This
script does a one-time conversion of the .jp2 source to a TIFF, which is
then what gets imported into the exhibit via the editor's tiling pipeline.

This is NOT part of the app/tool itself -- it's a documented prep step for
this one piece of demo content. Requires Python 3 + Pillow (pip install
pillow) with JPEG2000 support (Pillow bundles openjpeg).

Usage:
    python3 prep-source.py
"""

from pathlib import Path

from PIL import Image

HERE = Path(__file__).parent
SOURCE_JP2 = HERE.parent.parent / "images" / (
    "service-ndnp-pst-batch_pst_lasch_ver01-data-sn85054616-00212477825-1868110401-0071.jp2"
)
DEST_TIFF = HERE / "source.tiff"


def main() -> None:
    if not SOURCE_JP2.exists():
        raise SystemExit(f"Source image not found: {SOURCE_JP2}")

    im = Image.open(SOURCE_JP2)
    print(f"Opened {SOURCE_JP2.name}: {im.format} {im.mode} {im.size}")

    if im.mode not in ("RGB", "L"):
        im = im.convert("RGB")

    im.save(DEST_TIFF, format="TIFF", compression="tiff_lzw")
    print(f"Wrote {DEST_TIFF} ({DEST_TIFF.stat().st_size / 1_000_000:.1f} MB)")


if __name__ == "__main__":
    main()
