import sharp from "sharp";
import path from "node:path";

export interface TileResult {
  width: number;
  height: number;
  dziPath: string;
}

const TILE_SIZE = 256;
const OVERLAP = 1;

/**
 * Generates a Deep Zoom Image (DZI) pyramid for `sourcePath` inside
 * `outDir`, named `tiles.dzi` + `tiles_files/`. Sharp's DZI writer matches
 * OpenSeadragon's default DZI tile source convention directly.
 */
export async function generateDziTiles(
  sourcePath: string,
  outDir: string,
): Promise<TileResult> {
  const image = sharp(sourcePath);
  const metadata = await image.metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error(`Could not read dimensions for ${sourcePath}`);
  }

  const outBase = path.join(outDir, "tiles");
  await image
    .tile({ layout: "dz", size: TILE_SIZE, overlap: OVERLAP })
    .toFile(outBase);

  return {
    width: metadata.width,
    height: metadata.height,
    dziPath: "tiles.dzi",
  };
}
