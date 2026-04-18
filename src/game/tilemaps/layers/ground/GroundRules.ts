import {
  type AutotileTable,
  collectAutotileFrames,
} from '../../rules/Autotiler'
import { resolveLayerRuleFrame } from '../../rules/LayerRulePipeline'
import {
  collectDeclarativeRuleFrames,
  type LayerRule,
} from '../../rules/ruleTypes'
import {
  COMPASS_DIRECTION_DELTAS,
  type CompassDirection,
} from '../../utils/CompassRuleEngine'
import { toFrameIndex } from '../../utils/frameIndex'
import { isGroundInternalDebugCell } from './GroundInternalDebug'
import { GROUND_GENERATION_CONSTRAINTS, TILE_GROUND } from './GroundConfig'
import { BaseLayerRules } from '../base/BaseLayerRules'
import { isTileOfType, isTopSurface } from '../base/tileHelpers'
import type { GroundGenerationConstraints, GroundRuleContext } from './types'

export type { GroundGenerationConstraints, GroundRuleContext } from './types'
export { GROUND_GENERATION_CONSTRAINTS } from './GroundConfig'

export {
  GROUND_INTERNAL_DEBUG_OFFSET_TILES,
  isGroundInternalDebugCell,
} from './GroundInternalDebug'
const GROUND_VARIANT_COUNT = 2
const GROUND_SURFACE_VALUE = 6
const GROUND_INTERNAL_VALUE = 8
const GROUND_SEPARATOR_VALUE = 1

// ─── Bitmask Autotile Table ──────────────────────────────────────────
// Bitmask layout: NW=1  N=2  NE=4  W=8  E=16  SW=32  S=64  SE=128
// mask → [frame variants]  (use toFrameIndex for all entries)

export const GROUND_AUTOTILE: AutotileTable = {}

// ─── Helpers ─────────────────────────────────────────────────────────

function isGroundAt(tiles: number[][], row: number, col: number): boolean {
  return isTileOfType(tiles, row, col, TILE_GROUND)
}

function isTopSurfaceGroundTile(
  tiles: number[][],
  row: number,
  col: number
): boolean {
  return isTopSurface(tiles, row, col, TILE_GROUND)
}

function columnHasGround(tiles: number[][], col: number): boolean {
  if (col < 0 || col >= tiles[0].length) return false
  for (let row = 0; row < tiles.length; row += 1) {
    if (isGroundAt(tiles, row, col)) return true
  }
  return false
}

function findGroundSectionLeftWithinBounds(
  tiles: number[][],
  col: number,
  minCol: number
): number {
  let left = col
  while (left - 1 >= minCol && columnHasGround(tiles, left - 1)) left -= 1
  return left
}

function findGroundSectionRightWithinBounds(
  tiles: number[][],
  col: number,
  maxCol: number
): number {
  let right = col
  while (right + 1 <= maxCol && columnHasGround(tiles, right + 1)) right += 1
  return right
}

function findColumnTopSurfaceRow(tiles: number[][], col: number): number {
  if (col < 0 || col >= tiles[0].length) return -1
  for (let row = 0; row < tiles.length; row += 1) {
    if (isGroundAt(tiles, row, col)) return row
  }
  return -1
}

// ── Pre-computed ground classification grid ──────────────────────────
// Built once per tiles array (per chunk) via WeakMap cache.  Replaces
// repeated isGroundInternalDebugCell + isGroundInGapRing calls with a
// single O(1) array lookup per neighbor.

const classificationCache = new WeakMap<number[][], number[][]>()

function buildGroundClassificationGrid(tiles: number[][]): number[][] {
  const rows = tiles.length
  const cols = tiles[0].length
  const grid: number[][] = Array.from(
    { length: rows },
    () => new Array<number>(cols)
  )

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const tile = tiles[row][col]
      if (tile !== TILE_GROUND) {
        grid[row][col] = tile
        continue
      }
      if (isGroundInternalDebugCell(tiles, row, col)) {
        grid[row][col] = GROUND_INTERNAL_VALUE
        continue
      }
      grid[row][col] = GROUND_SURFACE_VALUE
    }
  }

  // Second pass: identify gap-ring cells (surface ground adjacent to internal)
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      if (grid[row][col] !== GROUND_SURFACE_VALUE) continue

      for (let di = 0; di < 8; di += 1) {
        const nr = row + GAP_RING_OFFSETS_R[di]
        const nc = col + GAP_RING_OFFSETS_C[di]
        if (
          nr >= 0 &&
          nr < rows &&
          nc >= 0 &&
          nc < cols &&
          grid[nr][nc] === GROUND_INTERNAL_VALUE
        ) {
          grid[row][col] = GROUND_SEPARATOR_VALUE
          break
        }
      }
    }
  }

  return grid
}

// Pre-computed offset arrays for gap-ring 8-neighbor check
const GAP_RING_OFFSETS_R = [-1, -1, -1, 0, 0, 1, 1, 1]
const GAP_RING_OFFSETS_C = [-1, 0, 1, -1, 1, -1, 0, 1]

function getGroundClassificationGrid(tiles: number[][]): number[][] {
  let grid = classificationCache.get(tiles)
  if (!grid) {
    grid = buildGroundClassificationGrid(tiles)
    classificationCache.set(tiles, grid)
  }
  return grid
}

function getGroundRuleNeighborValue(
  tiles: number[][],
  row: number,
  col: number,
  direction: CompassDirection
): number {
  const grid = getGroundClassificationGrid(tiles)
  const delta = COMPASS_DIRECTION_DELTAS[direction]
  const r = row + delta.dr
  const c = col + delta.dc
  if (r < 0 || r >= grid.length || c < 0 || c >= grid[0].length) return -1
  return grid[r][c]
}

export function isGroundSeparatorCell(
  tiles: number[][],
  row: number,
  col: number
): boolean {
  const grid = getGroundClassificationGrid(tiles)
  return grid[row]?.[col] === GROUND_SEPARATOR_VALUE
}

function selectGroundTopStyleIndex(
  tiles: number[][],
  _row: number,
  col: number,
  styleMinCol: number,
  styleMaxCol: number,
  forcedStyleByColumn?: number[]
): number {
  const forcedStyle = forcedStyleByColumn?.[col]
  if (forcedStyle !== undefined && forcedStyle >= 0) return forcedStyle

  const clampedCol = Math.max(styleMinCol, Math.min(col, styleMaxCol))
  const sectionLeftCol = findGroundSectionLeftWithinBounds(
    tiles,
    clampedCol,
    styleMinCol
  )
  const sectionRightCol = findGroundSectionRightWithinBounds(
    tiles,
    clampedCol,
    styleMaxCol
  )
  const anchorSurfaceRow = findColumnTopSurfaceRow(tiles, sectionLeftCol)
  const normalizedSectionLeft = sectionLeftCol - styleMinCol
  const normalizedSectionRight = sectionRightCol - styleMinCol

  const hash =
    (normalizedSectionLeft * 73856093) ^
    (normalizedSectionRight * 19349663) ^
    (anchorSurfaceRow * 83492791)
  return Math.abs(hash) % GROUND_VARIANT_COUNT
}

// ─── Declarative Rules ───────────────────────────────────────────────

// ─── Rules ───────────────────────────────────────────────────────────
// Compass tokens: 6 = ground, '!6' = not ground (empty/OOB/other)
// variants = per-run style alternatives (selected by variantSeed)

const GROUND_RULES: LayerRule<GroundRuleContext>[] = [
  // ═══ Top surface with ground below ═════════════════════════════════

  // Top-left edge cap: ground continues to the right.
  {
    matches: [{ N: '!6', S: 6, W: '!6', E: 6 }],
    variants: [[toFrameIndex(41)], [toFrameIndex(127)]],
  },
  // Top-center cap: ground on both sides.
  {
    matches: [{ N: '!6', S: 6, W: 6, E: '!6' }],
    variants: [[toFrameIndex(43)], [toFrameIndex(129)]],
  },
  // Top-right edge cap: ground continues from the left.
  {
    matches: [{ N: '!6', S: 6, W: 6, E: 6 }],
    variants: [[toFrameIndex(42)], [toFrameIndex(128)]],
  },
  {
    matches: [{ N: 6, E: 6, NE: [-1, 0, 7] }],
    variants: [[toFrameIndex(49)], [toFrameIndex(148)]],
  },
  // Step-join inner corner opening on NW diagonal.
  {
    matches: [{ N: 6, W: 6, NW: [-1, 0, 7] }],
    variants: [[toFrameIndex(50)], [toFrameIndex(149)]],
  },

  // ─── Internal (8) zone boundary rules ────────────────────────────────
  // With the 1 gap ring in place, no 8-centre cell will ever see a direct
  // 6 neighbour — the gap ring cells always report 1 instead.

  // Top-left inner corner of the 8 zone: gap ring above and to the left.
  {
    matches: [{ C: 8, N: 1, S: 8, W: 1, E: 8 }],
    frames: [toFrameIndex(142)],
  },
  // Top-right inner corner of the 8 zone: gap ring above and to the right.
  {
    matches: [{ C: 8, N: 1, S: 8, W: 8, E: 1 }],
    frames: [toFrameIndex(143)],
  },
  // Gap-ring cell on the left edge: 8 to the east, surface ground to all other sides.
  {
    matches: [{ C: 1, N: 6, S: 6, W: 6, E: 8 }],
    frames: [toFrameIndex(142), toFrameIndex(137)],
  },
  // Gap-ring cell surrounded by 8 on all cardinal sides: NW is also in gap ring.
  {
    matches: [{ C: 1, N: 8, S: 8, W: 8, E: 8, NW: 1 }],
    frames: [toFrameIndex(137)],
  },
  {
    matches: [{ N: '0', S: 6, W: 0, E: 6 }],
    variants: [[toFrameIndex(129)]],
  },
  // Gap-ring cell surrounded by 8 on all cardinal sides: NE is also in gap ring.
  {
    matches: [{ N: 8, W: 8, E: 8, S: 8, C: 1, NE: 1 }],
    variants: [[toFrameIndex(139)]],
  },
  // Left-edge ground column (E is empty/air or internal gap ring).
  {
    matches: [
      { E: 0, W: 6, S: 6, N: 6 },
      { E: 0, W: 6, S: -1, N: 6 },
      { E: 1, W: 6, S: 1, N: 8 },
      { E: 1, W: 6, S: 8, N: 8 },
    ],
    frames: [toFrameIndex(134)],
  },
  // Right-edge ground column (W is empty/air or internal gap ring).
  {
    matches: [
      { E: 6, W: 0, S: 6, N: 6 },
      { E: 6, W: 0, S: -1, N: 6 },
      { E: 6, W: 1, S: 1, N: 8 },
      { E: 6, W: 1, S: 8, N: 8 },
    ],
    frames: [toFrameIndex(132)],
  },
  // Top gap-ring row: 8 to east/west/south, gap ring (1) to north.
  {
    matches: [{ C: 1, E: 8, W: 8, S: 8, N: 1 }],
    frames: [toFrameIndex(125)],
  },
]

// ─── Frame resolution ────────────────────────────────────────────────

export function resolveGroundTileFrame(
  row: number,
  col: number,
  fallbackFrame: number,
  tiles: number[][],
  styleOptions?: {
    minCol?: number
    maxCol?: number
    styleByColumn?: number[]
  }
): number {
  const styleMinCol = styleOptions?.minCol ?? 0
  const styleMaxCol = styleOptions?.maxCol ?? tiles[0].length - 1
  const forcedStyleByColumn = styleOptions?.styleByColumn
  const variantSeed = selectGroundTopStyleIndex(
    tiles,
    row,
    col,
    styleMinCol,
    styleMaxCol,
    forcedStyleByColumn
  )
  const context: GroundRuleContext = {
    tiles,
    row,
    col,
    fallbackFrame,
    variantSeed,
  }

  return resolveLayerRuleFrame(GROUND_RULES, context, {
    unresolvedFrame: -1,
    getNeighborValue: getGroundRuleNeighborValue,
  })
}

export function getGroundRuleFrameIndices(collisionOnly = false): number[] {
  if (collisionOnly) return []

  return Array.from(
    new Set([
      ...collectDeclarativeRuleFrames(GROUND_RULES),
      toFrameIndex(134),
      toFrameIndex(136),
      toFrameIndex(125),
      toFrameIndex(126),
      toFrameIndex(146),
      toFrameIndex(140),
      toFrameIndex(163),
      toFrameIndex(133),
      toFrameIndex(148),
      toFrameIndex(149),
      toFrameIndex(49),
      toFrameIndex(50),
      ...collectAutotileFrames(GROUND_AUTOTILE),
    ])
  )
}

// ─── BaseLayerRules Implementation ───────────────────────────────────

export class GroundRulesImpl extends BaseLayerRules<
  GroundGenerationConstraints,
  GroundRuleContext
> {
  readonly constraints = GROUND_GENERATION_CONSTRAINTS
  readonly tileId = TILE_GROUND

  protected readonly rules = GROUND_RULES

  protected get resolveOptions() {
    return { unresolvedFrame: -1 }
  }

  protected buildContext(
    row: number,
    col: number,
    fallbackFrame: number,
    tiles: number[][]
  ): GroundRuleContext {
    const variantSeed = selectGroundTopStyleIndex(
      tiles,
      row,
      col,
      0,
      tiles[0].length - 1
    )
    return {
      tiles,
      row,
      col,
      fallbackFrame,
      variantSeed,
    }
  }

  getFrameIndices(collisionOnly?: boolean): number[] {
    return getGroundRuleFrameIndices(collisionOnly)
  }

  getCollisionRows(tiles: ReadonlyArray<ReadonlyArray<number>>): Set<number> {
    const collisionRows = new Set<number>()
    for (let row = 0; row < tiles.length; row += 1) {
      for (let col = 0; col < tiles[row].length; col += 1) {
        if (isTopSurfaceGroundTile(tiles as number[][], row, col)) {
          collisionRows.add(row)
          break
        }
      }
    }
    return collisionRows
  }
}

export const groundRules = new GroundRulesImpl()
