import {
  type AutotileTable,
  collectAutotileFrames,
  computeBitmask,
  maskLabel,
  resolveAutotileFrame,
} from '../rules/Autotiler'

const TILE_SUPPORT = 7

type SupportSignature =
  | 'single'
  | 'top_left'
  | 'top_center'
  | 'top_right'
  | 'middle_left'
  | 'middle_center'
  | 'middle_right'
  | 'bottom_left'
  | 'bottom_center'
  | 'bottom_right'

// ─── Bitmask Autotile Table ──────────────────────────────────────────
// 8-directional same-type sampling with corner stripping.
// Bit layout: NW=1 N=2 NE=4  W=8 E=16  SW=32 S=64 SE=128
// Diagonal bits are only set when both adjacent cardinals are present.
// Empty table — populate entries from atlas tile images.

export const SUPPORT_AUTOTILE: AutotileTable = {
  // mask → [variant frame indices]
  // Bit layout: NW=1 N=2 NE=4  W=8 E=16  SW=32 S=64 SE=128
  // Diagonals only set when both adjacent cardinals are present.
  8: [245], // W only    (n:-1, w:7,  e:-1) → frame 246 (index 245)
  16: [218], // E only    (n:-1, w:-1, e:7)  → frame 219 (index 218)
  24: [219], // W+E       (n:-1, w:7,  e:7)  → frame 220 (index 219)
}

function isSupportAt(tiles: number[][], row: number, col: number): boolean {
  if (row < 0 || row >= tiles.length) {
    return false
  }

  if (col < 0 || col >= tiles[row].length) {
    return false
  }

  return tiles[row][col] === TILE_SUPPORT
}

function classifySupportSignature(
  tiles: number[][],
  row: number,
  col: number
): SupportSignature {
  const hasAbove = isSupportAt(tiles, row - 1, col)
  const hasBelow = isSupportAt(tiles, row + 1, col)
  const hasLeft = isSupportAt(tiles, row, col - 1)
  const hasRight = isSupportAt(tiles, row, col + 1)

  let verticalBand: 'single' | 'top' | 'middle' | 'bottom'
  if (!hasAbove && !hasBelow) {
    verticalBand = 'single'
  } else if (!hasAbove && hasBelow) {
    verticalBand = 'top'
  } else if (hasAbove && hasBelow) {
    verticalBand = 'middle'
  } else {
    verticalBand = 'bottom'
  }

  if (verticalBand === 'single') {
    return 'single'
  }

  let horizontalRole: 'left' | 'center' | 'right'
  if (!hasLeft && hasRight) {
    horizontalRole = 'left'
  } else if (hasLeft && !hasRight) {
    horizontalRole = 'right'
  } else {
    horizontalRole = 'center'
  }

  return `${verticalBand}_${horizontalRole}` as SupportSignature
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
  const signature = classifySupportSignature(tiles, row, col)
  const oneBasedFrame = resolvedFrame + 1
  return [
    `// signature: ${signature}`,
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
  const signature = classifySupportSignature(tiles, row, col)
  return `signature: ${signature}  |  bitmask: ${maskLabel(mask)}`
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
  if (matchedFrames && matchedFrames.length > 0) {
    return resolveAutotileFrame(SUPPORT_AUTOTILE, mask, row, col, fallbackFrame)
  }

  // No rule for this mask — return -1 so the debug overlay shows the blue "7"
  // cell and no sprite tile is drawn.
  return -1
}

export function getSupportRuleFrameIndices(_collisionOnly = false): number[] {
  return collectAutotileFrames(SUPPORT_AUTOTILE)
}
