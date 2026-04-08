/**
 * Tile frame name constants for all atlases used in the world system.
 *
 * Each entry maps a semantic TileRole to the exact frame name string used
 * in the corresponding Phaser texture atlas.  To remap a tile, change the
 * frame name here — the rest of the system picks it up automatically.
 *
 * ── Atlas sources ─────────────────────────────────────────────────────────
 *   GRASS_ATLAS  →  public/assets/tiles/Tilles_Platforms_Grass.png  (65 tiles, 1 row)
 *   GROUND_ATLAS →  public/assets/tiles/Tilles_Platforms_Ground.png (149 tiles, 2 cols)
 *
 * ── Grass atlas layout (16 × 16 px tiles, all on row y = 0) ──────────────
 *   Original source sheet is 7 cols wide. Tiles are numbered left-to-right
 *   within each row, then row by row:
 *
 *   Row 0  → tiles  1– 7   primary surface / top layer
 *   Row 1  → tiles  8–14   thin platform / sub-surface band
 *   Row 2  → tiles 15–21   ledge underside / transition
 *   Row 3  → tiles 22–28   platform with root details
 *   Row 4  → tiles 29–35   platform mid section
 *   Row 5  → tiles 36–42   platform lower section
 *   Row 6  → tiles 43–49   corner / edge variants
 *   Row 7  → tiles 50–56   alternative surface variants
 *   Row 8  → tiles 57–63   misc / animated
 *   Row 9  → tiles 64–65   remainder
 *
 * ── Ground atlas layout (16 × 16 px tiles, 2 cols, x = 0 or 16) ─────────
 *   Each pair of consecutive tiles (odd = col A, even = col B) forms one
 *   visual row of fill material:
 *
 *   Pair  1– 2  (y=0)   top transition / near-surface row
 *   Pair  3– 4  (y=16)  sub-surface
 *   Pair  5– 6  (y=32)  main fill A
 *   Pair  7– 8  (y=48)  main fill B (alternate)
 *   Pair  9–10  (y=64)  mid fill
 *   …                   continuing for 75 pairs (149 tiles total)
 *   Pair 73–74  (y=1152) near-bottom
 *   Tile 149    (y=1168) remainder
 *
 * To verify a mapping visually: launch the dev server, open the tile atlas
 * in the browser devtools Network tab and compare tile numbers to the PNG.
 * ─────────────────────────────────────────────────────────────────────────
 */

import type { Biome, TileRole } from './types'

// ── Grass atlas frame names ───────────────────────────────────────────────

/** Surface / top-layer tile frames (from the grass atlas). */
export const GRASS_FRAMES = {
  // Row 0 — primary top-surface tiles
  surfaceLeft: 'Tiles_Platforms_Grass_1.png',
  surfaceCenter: 'Tiles_Platforms_Grass_2.png',
  surfaceCenterAlt: 'Tiles_Platforms_Grass_3.png',
  surfaceCenterAlt2: 'Tiles_Platforms_Grass_4.png',
  surfaceRight: 'Tiles_Platforms_Grass_6.png',
  surfaceIsolated: 'Tiles_Platforms_Grass_7.png',

  // Row 1 — thin platform surface tiles
  platformLeft: 'Tiles_Platforms_Grass_8.png',
  platformCenter: 'Tiles_Platforms_Grass_9.png',
  platformRight: 'Tiles_Platforms_Grass_13.png',

  // Row 2 — ledge / underside transition
  ledgeLeft: 'Tiles_Platforms_Grass_15.png',
  ledgeCenter: 'Tiles_Platforms_Grass_16.png',
  ledgeRight: 'Tiles_Platforms_Grass_21.png',

  // Corner / inner-edge variants (row 6)
  cornerTopLeft: 'Tiles_Platforms_Grass_43.png',
  cornerTopRight: 'Tiles_Platforms_Grass_49.png',
} as const

// ── Ground atlas frame names ──────────────────────────────────────────────

/** Ground fill / bulk tile frames (from the ground atlas). */
export const GROUND_FRAMES = {
  // Pair 1-2: top transition (just beneath the surface layer)
  topA: 'Tiles_Platforms_Ground_1.png',
  topB: 'Tiles_Platforms_Ground_2.png',

  // Pair 3-4: sub-surface
  subA: 'Tiles_Platforms_Ground_3.png',
  subB: 'Tiles_Platforms_Ground_4.png',

  // Pair 5-6: main fill (most frequently used)
  fillA: 'Tiles_Platforms_Ground_5.png',
  fillB: 'Tiles_Platforms_Ground_6.png',

  // Pair 7-8: alternate fill
  fillAltA: 'Tiles_Platforms_Ground_7.png',
  fillAltB: 'Tiles_Platforms_Ground_8.png',

  // Pair 9-10: mid fill
  midA: 'Tiles_Platforms_Ground_9.png',
  midB: 'Tiles_Platforms_Ground_10.png',

  // Left / right wall edge tiles
  wallLeftA: 'Tiles_Platforms_Ground_11.png',
  wallLeftB: 'Tiles_Platforms_Ground_12.png',
  wallRightA: 'Tiles_Platforms_Ground_13.png',
  wallRightB: 'Tiles_Platforms_Ground_14.png',

  // Bottom edge tiles
  bottomA: 'Tiles_Platforms_Ground_15.png',
  bottomB: 'Tiles_Platforms_Ground_16.png',
} as const

// ── Biome → role → frame lookup ───────────────────────────────────────────

/**
 * Maps every TileRole to an atlas frame name for a given biome.
 * Add a new biome by extending this record.
 */
export const BIOME_TILE_FRAMES: Record<Biome, Record<TileRole, string>> = {
  graveyard: {
    surface_left: GRASS_FRAMES.surfaceLeft,
    surface_center: GRASS_FRAMES.surfaceCenter,
    surface_center_alt: GRASS_FRAMES.surfaceCenterAlt,
    surface_right: GRASS_FRAMES.surfaceRight,
    surface_isolated: GRASS_FRAMES.surfaceIsolated,

    surface_platform_left: GRASS_FRAMES.platformLeft,
    surface_platform_center: GRASS_FRAMES.platformCenter,
    surface_platform_right: GRASS_FRAMES.platformRight,

    fill_top: GROUND_FRAMES.topA,
    fill_center: GROUND_FRAMES.fillA,
    fill_center_alt: GROUND_FRAMES.fillB,
    fill_left_wall: GROUND_FRAMES.wallLeftA,
    fill_right_wall: GROUND_FRAMES.wallRightA,
    fill_bottom: GROUND_FRAMES.bottomA,
    fill_bottom_left: GROUND_FRAMES.bottomA,
    fill_bottom_right: GROUND_FRAMES.bottomB,
    fill_corner_top_left: GRASS_FRAMES.cornerTopLeft,
    fill_corner_top_right: GRASS_FRAMES.cornerTopRight,
    fill_isolated: GROUND_FRAMES.fillA,
  },
}

/**
 * Returns the atlas frame name for a given tile role and biome.
 * Falls back to the fill_center frame if the role is not explicitly mapped.
 */
export function getFrame(role: TileRole, biome: Biome): string {
  return BIOME_TILE_FRAMES[biome][role] ?? GROUND_FRAMES.fillA
}
