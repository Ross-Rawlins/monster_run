import {
  type AutotileTable,
  collectAutotileFrames,
  computeBitmask,
  maskLabel,
  resolveAutotileFrame,
} from '../rules/Autotiler'

const TILE_SUPPORT = 7

// ─── Bitmask Autotile Table ──────────────────────────────────────────
// 8-directional same-type sampling with corner stripping.
// Bit layout: NW=1 N=2 NE=4  W=8 E=16  SW=32 S=64 SE=128
// Diagonal bits are only set when both adjacent cardinals are present.
// Empty table — populate entries from atlas tile images.

export const SUPPORT_AUTOTILE: AutotileTable = {
  // mask → [variant frame indices]
  // Populate from atlas images. Example:
  // 66: [225],   // N+S only (vertical shaft) → frame 226 (index 225)
}

// ─── Inspector helpers (used by GameScene click inspector) ───────────

export function buildSupportRuleSnippet(
  tiles: number[][],
  row: number,
  col: number,
  resolvedFrame: number
): string {
  const mask = computeBitmask(tiles, row, col, TILE_SUPPORT)
  const currentFrames = SUPPORT_AUTOTILE[mask]
  const oneBasedFrame = resolvedFrame + 1
  return [
    `// bitmask: ${maskLabel(mask)} → [${(currentFrames ?? []).join(', ')}]`,
    `// resolved frame: ${resolvedFrame} (tile ${oneBasedFrame})`,
    `${mask}: [${resolvedFrame}],`,
  ].join('\n')
}

export function formatSupportNeighborhood(
  tiles: number[][],
  row: number,
  col: number
): string {
  const mask = computeBitmask(tiles, row, col, TILE_SUPPORT)
  return `bitmask: ${maskLabel(mask)}`
}

// ─── Frame resolution ────────────────────────────────────────────────

export function resolveSupportTileFrame(
  row: number,
  col: number,
  fallbackFrame: number,
  tiles: number[][]
): number {
  const mask = computeBitmask(tiles, row, col, TILE_SUPPORT)
  const matchedFrames = SUPPORT_AUTOTILE[mask]

  // During rule authoring, keep supports visually unresolved until an explicit
  // mask entry exists so missing mappings are obvious in the debug overlay.
  if (!matchedFrames || matchedFrames.length === 0) {
    return -1
  }

  return resolveAutotileFrame(SUPPORT_AUTOTILE, mask, row, col, fallbackFrame)
}

export function getSupportRuleFrameIndices(_collisionOnly = false): number[] {
  return collectAutotileFrames(SUPPORT_AUTOTILE)
}
