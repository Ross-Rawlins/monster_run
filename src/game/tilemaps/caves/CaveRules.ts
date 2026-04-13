// ═══════════════════════════════════════════════════════════════════════════
// NORMALIZATION CHANGES IN THIS FILE:
// ═══════════════════════════════════════════════════════════════════════════
// RULE 1 — Frame Index Helper:
//   • Added import for toFrameIndex() utility
//   • Updated CAVE_AUTOTILE entries to use toFrameIndex(n) with proper comments
//   • Raw integer literals converted: 245 → toFrameIndex(246), etc.
//
// RULE 2 — Normalized Style Property Names:
//   • Cave layer doesn't use named style objects (uses autotiler only)
//   • No style renaming needed for this layer
//
// RULE 3 — Autotile Table Comments:
//   • Standardized comment block at top of CAVE_AUTOTILE
//   • Format: mask: [toFrameIndex(n)],  // DIRECTION_LABEL  atlas tile n
//   • All entries now have proper direction labels and atlas tile numbers
//
// RULE 4 — Constraint Property Names:
//   • Constraint properties: unchanged (alias to SupportGenerationConstraints)

import {
  type AutotileTable,
  collectAutotileFrames,
  computeBitmask,
  maskLabel,
  resolveAutotileFrame,
} from '../rules/Autotiler'
import { toFrameIndex } from '../utils/frameIndex'
import type { ILayerRules } from '../contracts/ILayerRules'

// Import support config but rename exports for cave
import type { SupportGenerationConstraints } from '../../../config/supportGeneration'
import { SUPPORT_GENERATION_CONSTRAINTS } from '../../../config/supportGeneration'

export type CaveGenerationConstraints = SupportGenerationConstraints
export const CAVE_GENERATION_CONSTRAINTS = SUPPORT_GENERATION_CONSTRAINTS

const TILE_CAVE = 7

type CaveSignature =
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
// Bitmask layout: NW=1  N=2  NE=4  W=8  E=16  SW=32  S=64  SE=128
// Diagonal bits are only set when both adjacent cardinal bits are set.
// mask → [frame variants]  (use toFrameIndex for all entries)

export const CAVE_AUTOTILE: AutotileTable = {
  8: [toFrameIndex(246)],   // W only              atlas tile 246
  16: [toFrameIndex(219)],  // E only              atlas tile 219
  24: [toFrameIndex(220)],  // W+E                 atlas tile 220
}

function isCaveAt(tiles: number[][], row: number, col: number): boolean {
  if (row < 0 || row >= tiles.length) {
    return false
  }

  if (col < 0 || col >= tiles[row].length) {
    return false
  }

  return tiles[row][col] === TILE_CAVE
}

function classifyCaveSignature(
  tiles: number[][],
  row: number,
  col: number
): CaveSignature {
  const hasAbove = isCaveAt(tiles, row - 1, col)
  const hasBelow = isCaveAt(tiles, row + 1, col)
  const hasLeft = isCaveAt(tiles, row, col - 1)
  const hasRight = isCaveAt(tiles, row, col + 1)

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

  return `${verticalBand}_${horizontalRole}` as CaveSignature
}

// ─── Inspector helpers (used by GameScene click inspector) ───────────

export function buildCaveRuleSnippet(
  tiles: number[][],
  row: number,
  col: number,
  resolvedFrame: number
): string {
  const mask = computeBitmask(tiles, row, col, TILE_CAVE)
  const currentFrames = CAVE_AUTOTILE[mask]
  const signature = classifyCaveSignature(tiles, row, col)
  const oneBasedFrame = resolvedFrame + 1
  return [
    `// signature: ${signature}`,
    `// bitmask: ${maskLabel(mask)} → [${(currentFrames ?? []).join(', ')}]`,
    `// resolved frame: ${resolvedFrame} (tile ${oneBasedFrame})`,
    `${mask}: [${resolvedFrame}],`,
  ].join('\n')
}

export function formatCaveNeighborhood(
  tiles: number[][],
  row: number,
  col: number
): string {
  const mask = computeBitmask(tiles, row, col, TILE_CAVE)
  const signature = classifyCaveSignature(tiles, row, col)
  return `signature: ${signature}  |  bitmask: ${maskLabel(mask)}`
}

// ─── Frame resolution ────────────────────────────────────────────────

export function resolveCaveTileFrame(
  row: number,
  col: number,
  fallbackFrame: number,
  tiles: number[][]
): number {
  const mask = computeBitmask(tiles, row, col, TILE_CAVE)
  const matchedFrames = CAVE_AUTOTILE[mask]
  if (matchedFrames && matchedFrames.length > 0) {
    return resolveAutotileFrame(CAVE_AUTOTILE, mask, row, col, fallbackFrame)
  }

  // No rule for this mask — return -1 so the debug overlay shows the tile
  // cell and no sprite is drawn.
  return -1
}

export function getCaveRuleFrameIndices(_collisionOnly = false): number[] {
  return collectAutotileFrames(CAVE_AUTOTILE)
}

// ─── ILayerRules Implementation ──────────────────────────────────────

/**
 * Cave layer rules: autotile frame resolution.
 * Implements ILayerRules for the unified tilemap generation system.
 *
 * COLLISION NOTE: Cave tiles (7) are decorative and have no collision by default.
 * If solid cave walls are needed in the future, create a separate layer
 * (e.g., 'cavewalls') rather than adding collision to this layer.
 */
export class CaveRulesImpl implements ILayerRules<CaveGenerationConstraints> {
  readonly constraints = CAVE_GENERATION_CONSTRAINTS

  resolveFrame(
    row: number,
    col: number,
    fallbackFrame: number,
    tiles: ReadonlyArray<ReadonlyArray<number>>
  ): number {
    return resolveCaveTileFrame(row, col, fallbackFrame, tiles as number[][])
  }

  getFrameIndices(collisionOnly?: boolean): number[] {
    return getCaveRuleFrameIndices(collisionOnly)
  }

  getCollisionRows(_tiles: ReadonlyArray<ReadonlyArray<number>>): Set<number> {
    // Cave tiles have no collision. They are purely decorative elements.
    return new Set()
  }
}

export const caveRules = new CaveRulesImpl()
