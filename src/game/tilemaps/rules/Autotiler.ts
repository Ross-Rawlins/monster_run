// ─── 8-directional bitmask autotiler with corner stripping ───
//
// Bit layout (8 neighbours):
//   NW=1  N=2   NE=4
//   W=8   .     E=16
//   SW=32 S=64  SE=128
//
// Corner stripping rule: a diagonal bit is only kept when BOTH adjacent
// cardinal neighbours are also set. For example NW only counts when both
// N and W are present. This collapses 256 raw combos down to ~47
// meaningful visual configurations — the standard Wang tileset.
//
// Same-type-only sampling: only neighbours matching the target tileType
// set a bit. Out-of-bounds cells are treated as non-matching.

import { hashTileCoordinates } from './neighbors'

export const MASK_NW = 1
export const MASK_N = 2
export const MASK_NE = 4
export const MASK_W = 8
export const MASK_E = 16
export const MASK_SW = 32
export const MASK_S = 64
export const MASK_SE = 128

/** Map from stripped bitmask → array of variant frame indices. */
export type AutotileTable = Partial<Record<number, number[]>>

/**
 * Compute an 8-directional bitmask with corner stripping.
 * Returns a value 0–255 where diagonal bits are zeroed unless both
 * adjacent cardinals are also set.
 */
export function computeBitmask(
  tiles: number[][],
  row: number,
  col: number,
  tileType: number
): number {
  const n = tileAt(tiles, row - 1, col) === tileType
  const e = tileAt(tiles, row, col + 1) === tileType
  const s = tileAt(tiles, row + 1, col) === tileType
  const w = tileAt(tiles, row, col - 1) === tileType

  let mask = 0
  if (n) mask |= MASK_N
  if (e) mask |= MASK_E
  if (s) mask |= MASK_S
  if (w) mask |= MASK_W

  // Diagonals only count when both adjacent cardinals are present.
  if (n && w && tileAt(tiles, row - 1, col - 1) === tileType) mask |= MASK_NW
  if (n && e && tileAt(tiles, row - 1, col + 1) === tileType) mask |= MASK_NE
  if (s && w && tileAt(tiles, row + 1, col - 1) === tileType) mask |= MASK_SW
  if (s && e && tileAt(tiles, row + 1, col + 1) === tileType) mask |= MASK_SE

  return mask
}

/**
 * Look up a frame from an autotile table.
 * When the mask entry has multiple variants, picks one deterministically
 * using a stable (row, col) hash so re-renders are consistent.
 */
export function resolveAutotileFrame(
  table: AutotileTable,
  mask: number,
  row: number,
  col: number,
  fallbackFrame: number
): number {
  const frames = table[mask]
  if (!frames || frames.length === 0) return fallbackFrame
  if (frames.length === 1) return frames[0]
  const hash = hashTileCoordinates(row, col, mask)
  return frames[hash % frames.length]
}

/**
 * Collect every unique frame index referenced in an autotile table.
 */
export function collectAutotileFrames(table: AutotileTable): number[] {
  const frameSet = new Set<number>()
  for (const frames of Object.values(table)) {
    if (frames) {
      for (const f of frames) frameSet.add(f)
    }
  }
  return Array.from(frameSet)
}

/**
 * Build a human-readable label for an 8-bit stripped bitmask.
 * Shows which compass directions are set.
 * Example: maskLabel(2 | 16 | 64) → "N E S (82)"
 */
export function maskLabel(mask: number): string {
  const parts: string[] = []
  if (mask & MASK_NW) parts.push('NW')
  if (mask & MASK_N) parts.push('N')
  if (mask & MASK_NE) parts.push('NE')
  if (mask & MASK_W) parts.push('W')
  if (mask & MASK_E) parts.push('E')
  if (mask & MASK_SW) parts.push('SW')
  if (mask & MASK_S) parts.push('S')
  if (mask & MASK_SE) parts.push('SE')
  return `${parts.join(' ') || 'none'} (${mask})`
}

function tileAt(tiles: number[][], row: number, col: number): number {
  if (row < 0 || col < 0 || row >= tiles.length || col >= tiles[0].length) {
    return -1
  }
  return tiles[row][col]
}
