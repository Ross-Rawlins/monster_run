import {
  type AutotileTable,
  computeBitmask,
  maskLabel,
} from '../../rules/Autotiler'
import {
  collectDeclarativeRuleFrames,
  type LayerRule,
} from '../../rules/ruleTypes'
import {
  classifyHorizontalRole,
  getHorizontalNeighborState,
} from '../../rules/neighbors'
import { toFrameIndex } from '../../utils/frameIndex'
import { BaseLayerRules } from '../base/BaseLayerRules'
import { CAVE_GENERATION_CONSTRAINTS, TILE_CAVE } from './CaveConfig'
import type {
  CaveGenerationConstraints,
  CaveRuleContext,
  CaveSignature,
} from './types'

export type {
  CaveGenerationConstraints,
  CaveRuleContext,
  CaveSignature,
} from './types'
export { CAVE_GENERATION_CONSTRAINTS } from './CaveConfig'

// ─── Bitmask Autotile Table ──────────────────────────────────────────
// Bitmask layout: NW=1  N=2  NE=4  W=8  E=16  SW=32  S=64  SE=128
// Diagonal bits are only set when both adjacent cardinal bits are set.
// mask → [frame variants]  (use toFrameIndex for all entries)

export const CAVE_AUTOTILE: AutotileTable = {}

// ─── Helpers ─────────────────────────────────────────────────────────

function isCaveAt(tiles: number[][], row: number, col: number): boolean {
  if (row < 0 || row >= tiles.length) return false
  if (col < 0 || col >= tiles[row].length) return false
  return tiles[row][col] === TILE_CAVE
}

function classifyCaveSignature(
  tiles: number[][],
  row: number,
  col: number
): CaveSignature {
  const hasAbove = isCaveAt(tiles, row - 1, col)
  const hasBelow = isCaveAt(tiles, row + 1, col)

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

  if (verticalBand === 'single') return 'single'

  const horizontalState = getHorizontalNeighborState(tiles, row, col, TILE_CAVE)
  const horizontalRoleMap: Record<
    ReturnType<typeof classifyHorizontalRole>,
    'left' | 'center' | 'right'
  > = {
    left_edge: 'left',
    center: 'center',
    right_edge: 'right',
    isolated: 'center',
  }
  const horizontalRole =
    horizontalRoleMap[classifyHorizontalRole(horizontalState)]

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

// ─── Foreground cap frame resolution ─────────────────────────────────
// Cave foreground caps render at depth 2 on top of ground-surface tiles.
// The CaveGenerator extends cave tiles ABOVE the ground row (the passage
// continues upward through empty-terrain rows to the platform above), so
// at a cap position the caveLayer always has cave in the N cell.
// The standard top-edge rules all require N:'!7' and therefore never fire.
// This helper bypasses N entirely and picks the correct top-edge frame
// based solely on the W/E neighbours.
export function resolveCaveCapTopEdgeFrame(
  caveLayer: number[][],
  row: number,
  col: number
): number {
  const hasW = isCaveAt(caveLayer, row, col - 1)
  const hasE = isCaveAt(caveLayer, row, col + 1)

  if (!hasW && hasE) return toFrameIndex(218) // left end of top edge
  if (hasW && hasE) return toFrameIndex(219) // centre of top edge
  if (hasW && !hasE) return toFrameIndex(220) // right end of top edge
  return toFrameIndex(218) // isolated single cap – use left-end frame
}

// ─── Rules ───────────────────────────────────────────────────────────
// Compass tokens: 7 = cave, '!7' = not cave (empty/OOB/other)
// frames = deterministic per-tile variation (stable row/col hash)
// variants = grouped style sets (selected by variantSeed, then hashed within set)

const CAVE_RULES: LayerRule<CaveRuleContext>[] = [
  // // ═══ Single-row (1-tall) ═══════════════════════════════════════════

  {
    // Treat OOB above the chunk as open ceiling so row-0 cave tops still resolve.
    matches: [{ N: ['!7', 'OOB'], S: '7', W: '!7', E: 7 }],
    frames: [toFrameIndex(218)],
  },
  {
    // Required for row-0 top-center caps (frame 219).
    matches: [
      { N: ['!7', 'OOB'], S: 7, W: 7, E: 7 },
      { N: ['!7', 'OOB'], S: 7, W: '!7', E: 7 },
    ],
    frames: [toFrameIndex(219)],
  },
  {
    matches: [{ N: ['!7', 'OOB'], S: '7', W: '7', E: '!7' }],
    frames: [toFrameIndex(220)],
  },
  {
    matches: [
      { N: '7', S: '7', W: '!7', E: '7' },
      { N: '7', S: '-1', W: '!7', E: '7' },
    ],
    frames: [toFrameIndex(225)],
  },
  {
    matches: [{ N: '7', S: '7', W: '7', E: '!7' }],
    frames: [toFrameIndex(227)],
  },
  {
    matches: [{ N: '7', S: '!7', W: '!7', E: 7 }],
    frames: [toFrameIndex(232)],
  },
  {
    matches: [{ N: '7', S: '!7', W: '7', E: 7 }],
    frames: [toFrameIndex(233)],
  },
  {
    matches: [{ N: '7', S: '!7', W: 7, E: '!7' }],
    frames: [toFrameIndex(234)],
  },
  {
    matches: [{ N: 7, S: 7, W: 7, E: 7, NE: '!7' }],
    frames: [toFrameIndex(244)],
  },
  {
    matches: [{ N: 7, S: 7, W: 7, E: 7, NW: '!7' }],
    frames: [toFrameIndex(245)],
  },
  {
    matches: [{ N: 7, S: 7, W: 7, E: 7, SE: '!7' }],
    frames: [toFrameIndex(238)],
  },
  {
    matches: [{ N: 7, S: 7, W: 7, E: 7, SW: '!7', NW: 7 }],
    frames: [toFrameIndex(239)],
  },

  // ═══ Fully enclosed interior ═══════════════════════════════════════
  {
    matches: [{ N: 7, S: 7, W: 7, E: 7, NW: 7, NE: 7, SW: 7, SE: 7 }],
    frames: [toFrameIndex(226), toFrameIndex(284), toFrameIndex(290)],
  },
]

// ─── Frame resolution ────────────────────────────────────────────────

export function getCaveRuleFrameIndices(_collisionOnly = false): number[] {
  return collectDeclarativeRuleFrames(CAVE_RULES)
}

// ─── BaseLayerRules Implementation ───────────────────────────────────

export class CaveRulesImpl extends BaseLayerRules<
  CaveGenerationConstraints,
  CaveRuleContext
> {
  readonly constraints = CAVE_GENERATION_CONSTRAINTS
  readonly tileId = TILE_CAVE

  protected readonly rules = CAVE_RULES

  protected get resolveOptions() {
    return { unresolvedFrame: -1 }
  }

  protected buildContext(
    row: number,
    col: number,
    fallbackFrame: number,
    tiles: number[][]
  ): CaveRuleContext {
    return {
      tiles,
      row,
      col,
      fallbackFrame,
      variantSeed: row * 73856093 + col * 19349663,
    }
  }

  getFrameIndices(collisionOnly?: boolean): number[] {
    return getCaveRuleFrameIndices(collisionOnly)
  }

  getCollisionRows(_tiles: ReadonlyArray<ReadonlyArray<number>>): Set<number> {
    return new Set()
  }
}

export const caveRules = new CaveRulesImpl()
