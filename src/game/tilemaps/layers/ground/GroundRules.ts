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
      } else if (isGroundInternalDebugCell(tiles, row, col)) {
        // Internal ground cells report 8 for compass matching.
        grid[row][col] = GROUND_INTERNAL_VALUE
      } else {
        grid[row][col] = GROUND_SURFACE_VALUE
      }
    }
  }

  return grid
}

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
    matches: [{ N: 0, S: 6, W: 0, E: 6 }],
    variants: [[toFrameIndex(6)], [toFrameIndex(71)]],
  },
  // Top-center cap: ground on both sides.
  {
    matches: [{ N: 0, S: 6, W: 6, E: 0 }],
    variants: [[toFrameIndex(8)], [toFrameIndex(73)]],
  },
  // Top-right edge cap: ground continues from the left.
  {
    matches: [{ N: 0, S: 6, W: 6, E: 6 }],
    variants: [[toFrameIndex(7)], [toFrameIndex(72)]],
  },
  // Isolated top cap: no ground on either side (e.g. adjacent to platform or
  // empty on both sides). Use left-edge frames as a safe fallback so the cell
  // is never transparent.
  {
    matches: [{ N: 0, S: 6, W: 0, E: 0 }],
    variants: [[toFrameIndex(6)], [toFrameIndex(71)]],
  },
  {
    matches: [{ N: 6, E: 6, NE: [-1, 0, 5] }],
    variants: [[toFrameIndex(20)], [toFrameIndex(97)]],
  },
  // Step-join inner corner opening on NW diagonal.
  {
    matches: [{ N: 6, W: 6, NW: [-1, 0, 5] }],
    variants: [[toFrameIndex(21)], [toFrameIndex(98)]],
  },

  // Left-edge ground column: air/OOB to the east, ground to the west, above, and below.
  {
    matches: [
      { E: 0, W: 6, S: 6, N: 6 },
      { E: 0, W: 6, S: -1, N: 6 },
      { E: 0, W: 6, S: 0, N: 6 },
      { E: 8, W: 6, S: 6, N: 6 },
      { E: 8, W: 6, S: -1, N: 6 },
    ],
    frames: [toFrameIndex(80)],
  },
  {
    matches: [{ E: 6, W: 8, S: 8, N: 6, C: 6 }],
    frames: [toFrameIndex(85)],
  },
  {
    matches: [{ E: 6, W: 6, S: 8, N: 6 }],
    frames: [toFrameIndex(86)],
  },
  {
    matches: [{ E: 8, W: 6, S: 8, N: 6, C: 6 }],
    frames: [toFrameIndex(87)],
  },
  {
    matches: [{ E: 6, W: 6, S: 6, N: 6, SE: 8 }],
    frames: [toFrameIndex(91)],
  },
  {
    matches: [{ E: 6, W: 6, S: 6, N: 6, SW: 8 }],
    frames: [toFrameIndex(92)],
  },
  // Right-edge ground column: air/OOB to the west, ground to the east, above, and below.
  {
    matches: [
      { E: 6, W: 0, S: 6, N: 6 },
      { E: 6, W: 0, S: -1, N: 6 },
      { E: 6, W: 0, S: 0, N: 6 },
      { E: 6, W: -1, S: 6, N: 6 },
      { E: 6, W: -1, S: 0, N: 6 },
      { E: 6, W: -1, S: -1, N: 6 },
      { E: 6, W: 8, S: 6, N: 6 },
      { E: 6, W: 8, S: -1, N: 6 },
    ],
    frames: [toFrameIndex(78)],
  },
  // Internal ground section: hide inset cells by emitting -1 (empty tile).
  // Returning null for non-internal cells lets unmatched surface cells reach
  // the unresolvedFrame fallback (tile 79) below.
  {
    resolve: (ctx) =>
      isGroundInternalDebugCell(ctx.tiles, ctx.row, ctx.col) ? -1 : null,
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

  // Unmatched surface ground cells fall back to tile 79 (solid fill).
  // Internal cells are caught by the resolver above and resolve to -1 (empty).
  return resolveLayerRuleFrame(GROUND_RULES, context, {
    getNeighborValue: getGroundRuleNeighborValue,
    unresolvedFrame: toFrameIndex(79),
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
    // Use -1 for unresolved ground so unmatched cells are transparent rather
    // than rendering the placeholder frame 0. Cave backdrop bleed-through is
    // no longer a risk: buildSupportBackdropTiles only fills actual cave cells.
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
