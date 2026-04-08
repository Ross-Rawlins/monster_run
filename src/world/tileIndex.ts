/**
 * Tile integer indices for the graveyard tileset.
 *
 * Each constant maps to a frame in tiles.png when loaded as a spritesheet
 * with frameWidth=16, frameHeight=16 (key: RUNNER_ASSET_KEYS.TILES_SHEET).
 *
 * Index formula:  filename_number − 1
 *   e.g. "Tiles_Ground_Seperated_17.png"  →  index 16
 *
 * The spritesheet is 4 tiles wide:
 *   col  =  index % 4        →  source x = col  * 16
 *   row  =  Math.floor(i/4)  →  source y = row * 16
 *
 * ── Graveyard tile layout (tiles.png) ────────────────────────────────────
 *   Sheet row 4  (y= 64): tiles 17-20  → SURFACE_LEFT / MID_A / MID_B / RIGHT
 *   Sheet row 5  (y= 80): tiles 21-24  → SURFACE_SINGLE / MID_C / MID_D / RIGHT_B
 *   Sheet row 6  (y= 96): tiles 25-28  → WALL_LEFT_A .. WALL_RIGHT_A
 *   Sheet row 7  (y=112): tiles 29-32  → FILL_A .. FILL_D  (also doubles as WALL)
 *   Sheet row 8  (y=128): tiles 33-36  → FILL_E .. FILL_H
 *   Sheet row 18 (y=288): tiles 73-76  → UNDERSIDE variants
 *   Sheet row 19 (y=304): tiles 77-80  → UNDERSIDE variants
 *   Sheet row 20 (y=320): tiles 81-84  → UNDERSIDE variants
 */

// ── Core tile constants ───────────────────────────────────────────────────

export const TILE = {
  /** -1 = empty cell — Phaser treats negative indices as empty in tilemap data. */
  EMPTY: -1,

  // ── Surface (green/grass edge row) ─────────────────────────────────────
  // These appear at the TOP of any solid column (nothing solid above them).

  /** Left edge of a surface run — right neighbour is solid, left is empty. */
  SURFACE_LEFT: 16,     // Tiles_Ground_Seperated_17.png

  /** Surface middle variant A — both neighbours are solid. */
  SURFACE_MID_A: 17,    // Tiles_Ground_Seperated_18.png

  /** Surface middle variant B — both neighbours are solid. */
  SURFACE_MID_B: 18,    // Tiles_Ground_Seperated_19.png

  /** Right edge of a surface run — left neighbour is solid, right is empty. */
  SURFACE_RIGHT: 19,    // Tiles_Ground_Seperated_20.png

  /** Isolated single-tile surface — nothing to the left or right. */
  SURFACE_SINGLE: 20,   // Tiles_Ground_Seperated_21.png

  /** Surface middle variant C. */
  SURFACE_MID_C: 21,    // Tiles_Ground_Seperated_22.png

  /** Surface middle variant D. */
  SURFACE_MID_D: 22,    // Tiles_Ground_Seperated_23.png

  /** Right edge variant B. */
  SURFACE_RIGHT_B: 23,  // Tiles_Ground_Seperated_24.png

  // ── Wall / side-face tiles ──────────────────────────────────────────────
  // These appear on fill cells whose left or right neighbour is empty
  // (exposed vertical face of the terrain mass).

  /** Left wall face — A variant. */
  WALL_LEFT_A: 24,      // Tiles_Ground_Seperated_25.png

  /** Right wall face — A variant. */
  WALL_RIGHT_A: 27,     // Tiles_Ground_Seperated_28.png

  /** Left wall face — B variant (lower section). */
  WALL_LEFT_B: 28,      // Tiles_Ground_Seperated_29.png

  /** Right wall face — B variant (lower section). */
  WALL_RIGHT_B: 31,     // Tiles_Ground_Seperated_32.png

  // ── Interior fill tiles ─────────────────────────────────────────────────
  // Used for solid cells that are fully enclosed (solid on all 4 sides).

  FILL_A: 28,   // Tiles_Ground_Seperated_29.png
  FILL_B: 29,   // Tiles_Ground_Seperated_30.png
  FILL_C: 30,   // Tiles_Ground_Seperated_31.png
  FILL_D: 31,   // Tiles_Ground_Seperated_32.png
  FILL_E: 32,   // Tiles_Ground_Seperated_33.png
  FILL_F: 33,   // Tiles_Ground_Seperated_34.png
  FILL_G: 34,   // Tiles_Ground_Seperated_35.png
  FILL_H: 35,   // Tiles_Ground_Seperated_36.png

  // ── Platform underside tiles ────────────────────────────────────────────
  // Used for the BOTTOM row of a floating platform (solid above, empty below).

  UNDERSIDE_LEFT_A:  73,  // Tiles_Ground_Seperated_74.png
  UNDERSIDE_MID_A:   78,  // Tiles_Ground_Seperated_79.png
  UNDERSIDE_MID_B:   79,  // Tiles_Ground_Seperated_80.png
  UNDERSIDE_RIGHT_A: 80,  // Tiles_Ground_Seperated_81.png
  UNDERSIDE_RIGHT_B: 77,  // Tiles_Ground_Seperated_78.png
  UNDERSIDE_LEFT_B:  76,  // Tiles_Ground_Seperated_77.png
} as const

export type TileIndex = (typeof TILE)[keyof typeof TILE]

// ── Variant pools ─────────────────────────────────────────────────────────

/** All mid-surface variants — randomly drawn for natural-looking runs. */
export const SURFACE_MID_POOL = [
  TILE.SURFACE_MID_A,
  TILE.SURFACE_MID_B,
  TILE.SURFACE_MID_C,
  TILE.SURFACE_MID_D,
] as const

/** All interior fill variants — randomly drawn for visual variety. */
export const FILL_POOL = [
  TILE.FILL_A,
  TILE.FILL_B,
  TILE.FILL_C,
  TILE.FILL_D,
  TILE.FILL_E,
  TILE.FILL_F,
  TILE.FILL_G,
  TILE.FILL_H,
] as const

// ── Autotiler ─────────────────────────────────────────────────────────────

/**
 * Resolves the correct tile index for a solid cell based on its 4-directional
 * neighbours.  Used by TilemapChunk.buildData() when constructing the 2-D
 * tile-index array.
 *
 * Logic (for cells where `self === true`):
 *
 *   Surface row  (above empty, below solid):
 *     no left, no right  → SURFACE_SINGLE
 *     no left, has right → SURFACE_LEFT
 *     has left, no right → SURFACE_RIGHT
 *     has left & right   → random SURFACE_MID variant
 *
 *   Fill / interior  (above solid):
 *     no left            → WALL_LEFT_A  (exposed left face)
 *     no right           → WALL_RIGHT_A (exposed right face)
 *     both sides solid   → random FILL variant
 *
 * @param above       Is the cell directly above solid?
 * @param below       Is the cell directly below solid?
 * @param left        Is the cell to the left solid?
 * @param right       Is the cell to the right solid?
 * @param variantSeed Integer used to deterministically pick a variant.
 *                    Recommended: col * 7 + row * 13 + chunkIndex * 101
 */
export function resolveTileIndex(
  above: boolean,
  below: boolean,
  left: boolean,
  right: boolean,
  variantSeed: number
): number {
  if (!above) {
    // ── Surface row ──────────────────────────────────────────────────────
    if (!left && !right) return TILE.SURFACE_SINGLE
    if (!left) return TILE.SURFACE_LEFT
    if (!right) return TILE.SURFACE_RIGHT
    return SURFACE_MID_POOL[Math.abs(variantSeed) % SURFACE_MID_POOL.length]
  }

  // ── Fill row (has solid above) ─────────────────────────────────────────
  if (!left) {
    // Alternate wall variants by row to add slight texture
    return Math.abs(variantSeed) % 2 === 0 ? TILE.WALL_LEFT_A : TILE.WALL_LEFT_B
  }
  if (!right) {
    return Math.abs(variantSeed) % 2 === 0 ? TILE.WALL_RIGHT_A : TILE.WALL_RIGHT_B
  }

  return FILL_POOL[Math.abs(variantSeed) % FILL_POOL.length]
}
