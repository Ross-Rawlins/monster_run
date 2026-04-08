/**
 * Tile autotiling rules for the chunk world system.
 *
 * The autotiler uses a 4-bit bitmask where each bit records whether a
 * neighbouring cell is solid (1) or empty (0):
 *
 *   Bit 1 (N = 1)  → tile directly above
 *   Bit 2 (E = 2)  → tile directly to the right
 *   Bit 4 (S = 4)  → tile directly below
 *   Bit 8 (W = 8)  → tile directly to the left
 *
 * Possible bitmask values 0–15:
 *
 *   0  isolated              8  right-cap (only W solid)
 *   1  bottom-cap (N only)   9  bottom-right corner (N+W)
 *   2  left-cap  (E only)   10  horizontal strip (E+W)
 *   3  bottom-left (N+E)    11  bottom-edge (N+E+W)
 *   4  top-cap   (S only)   12  top-right corner (S+W)
 *   5  vertical-strip (N+S) 13  right-wall (N+S+W)
 *   6  top-left  (E+S)      14  top-edge / surface (E+S+W)
 *   7  left-wall (N+E+S)    15  center-fill (all sides solid)
 *
 * The top-edge case (bitmask 14) is the most common ground surface: solid
 * below, solid left, solid right, empty above.  We render a grass/surface
 * tile there and a fill tile everywhere else.
 *
 * Two separate resolve functions exist:
 *   resolveSurfaceTileRole  →  the grass/top layer (returns null for non-surface cells)
 *   resolveGroundTileRole   →  the fill/bulk layer
 */

import type { TileNeighbours, TileRole } from './types'

// ── 4-bit bitmask helper ──────────────────────────────────────────────────

/**
 * Computes the 4-bit neighbour bitmask for a cell given its neighbours.
 *
 *   bit 0 (N=1) set if above is solid
 *   bit 1 (E=2) set if right is solid
 *   bit 2 (S=4) set if below is solid
 *   bit 3 (W=8) set if left is solid
 */
export function computeBitmask(n: TileNeighbours): number {
  let mask = 0
  if (n.above) mask |= 1
  if (n.right) mask |= 2
  if (n.below) mask |= 4
  if (n.left) mask |= 8
  return mask
}

// ── Surface (grass) layer ─────────────────────────────────────────────────

/**
 * Returns the TileRole for the surface/grass layer, or null if this cell
 * should not have a surface tile.
 *
 * A surface tile is rendered only when:
 *   – the cell itself is solid
 *   – the cell above is empty (the top is exposed)
 */
export function resolveSurfaceTileRole(
  n: TileNeighbours
): TileRole | null {
  if (!n.self || n.above) return null

  const hasLeft = n.left
  const hasRight = n.right

  if (!hasLeft && !hasRight) return 'surface_isolated'
  if (!hasLeft) return 'surface_left'
  if (!hasRight) return 'surface_right'

  // Alternate center tile for visual variety (caller may use noise/random)
  return 'surface_center'
}

/**
 * Returns a surface platform TileRole for elevated platform tiles.
 * Used when building the visual platform strip above the main ground.
 */
export function resolvePlatformSurfaceRole(
  colIndex: number,
  platformWidthTiles: number
): TileRole {
  if (colIndex === 0) return 'surface_platform_left'
  if (colIndex === platformWidthTiles - 1) return 'surface_platform_right'
  return 'surface_platform_center'
}

// ── Ground (fill) layer ───────────────────────────────────────────────────

/**
 * Maps a 4-bit bitmask to the appropriate ground fill TileRole.
 *
 * The mapping follows standard 2.5-D platformer conventions:
 *
 *   15 (NSEW all solid)  → center fill
 *   14 (E+S+W, top open) → fill_top (just below the surface)
 *    7 (N+E+S, left open) → right-wall
 *   13 (N+S+W, right open) → left-wall
 *   11 (N+E+W, bottom open) → bottom edge
 *    6 (E+S, NW open)    → top-left corner
 *   12 (S+W, NE open)    → top-right corner
 *    3 (N+E, SW open)    → bottom-left corner
 *    9 (N+W, SE open)    → bottom-right corner
 *   all other            → fill_center fallback
 */
const BITMASK_TO_GROUND_ROLE: Readonly<Record<number, TileRole>> = {
  15: 'fill_center',
  14: 'fill_top',        // top edge – cell above is air
  7:  'fill_left_wall',  // left wall – cell to left is air
  13: 'fill_right_wall', // right wall – cell to right is air
  11: 'fill_bottom',     // bottom edge – cell below is air
  6:  'fill_corner_top_left',
  12: 'fill_corner_top_right',
  3:  'fill_bottom_left',
  9:  'fill_bottom_right',
  5:  'fill_center',     // vertical strip
  10: 'fill_center',     // horizontal strip
  0:  'fill_isolated',
  1:  'fill_center',
  2:  'fill_center',
  4:  'fill_top',
  8:  'fill_center',
}

/**
 * Returns the TileRole for the ground/fill layer based on the neighbour
 * bitmask.  Only call this for cells where `n.self === true`.
 *
 * Pass `altVariant = true` to get the _alt version for checkerboard variety.
 */
export function resolveGroundTileRole(
  n: TileNeighbours,
  altVariant = false
): TileRole {
  const mask = computeBitmask(n)
  const role = BITMASK_TO_GROUND_ROLE[mask] ?? 'fill_center'

  // Swap center tile for alternate to break up visual repetition
  if (altVariant && role === 'fill_center') return 'fill_center_alt'

  return role
}
