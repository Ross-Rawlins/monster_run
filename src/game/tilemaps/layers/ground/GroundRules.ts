import {
  type AutotileTable,
  collectAutotileFrames,
} from '../../rules/Autotiler'
import { resolveLayerRuleFrame } from '../../rules/LayerRulePipeline'
import type { DeclarativeRule, LayerRule } from '../../rules/ruleTypes'
import { toFrameIndex } from '../../utils/frameIndex'
import { isGroundInternalDebugCell } from './GroundInternalDebug'
import { BaseLayerRules } from '../base/BaseLayerRules'
import {
  isTileOfType,
  getTileAt,
  isTopSurface,
  getColumnHeight,
  selectVariantFrame,
} from '../base/tileHelpers'
import type { GroundGenerationConstraints, GroundRuleContext } from './types'

export type { GroundGenerationConstraints, GroundRuleContext }

export {
  GROUND_INTERNAL_DEBUG_OFFSET_TILES,
  isGroundInternalDebugCell,
} from './GroundInternalDebug'

export const GROUND_GENERATION_CONSTRAINTS: GroundGenerationConstraints = {
  tileId: 6,
  minColumnHeightTiles: 2,
  maxColumnHeightTiles: 8,
  maxHeightStepDeltaRows: 2,
  minSegmentLength: 3,
  maxSegmentLength: 6,
  minGapSize: 2,
  maxGapSize: 3,
  gapChancePerSegment: 0.3,
  minimumStartingSolidColumns: 8,
}

const TILE_GROUND = 6
const TILE_EMPTY = 0
const TILE_CAVE = 7
const GROUND_VARIANT_COUNT = 2

// ─── Frame Constants ─────────────────────────────────────────────────

const TOP_STYLE_DIRT_INDEX = 1
const GROUND_INTERNAL_LEFT_FRAMES = [toFrameIndex(134), toFrameIndex(136)]
const GROUND_INTERNAL_TOP_FRAMES = [toFrameIndex(125), toFrameIndex(126)]
const GROUND_INTERNAL_RIGHT_FRAMES = [toFrameIndex(146), toFrameIndex(140)]
const GROUND_INTERNAL_DIAGONAL_FRAME = toFrameIndex(163)
const GROUND_BODY_LEFT_FRAME = toFrameIndex(132)
const GROUND_BODY_MIDDLE_FRAME = toFrameIndex(133)
const GROUND_BODY_RIGHT_FRAME = toFrameIndex(134)
const DIRT_INTERNAL_TOP_LEFT_CORNER_FRAME = toFrameIndex(148)
const DIRT_INTERNAL_TOP_RIGHT_CORNER_FRAME = toFrameIndex(149)
const GRASS_INTERNAL_TOP_LEFT_CORNER_FRAME = toFrameIndex(49)
const GRASS_INTERNAL_TOP_RIGHT_CORNER_FRAME = toFrameIndex(50)

// ─── Bitmask Autotile Table ──────────────────────────────────────────
// Bitmask layout: NW=1  N=2  NE=4  W=8  E=16  SW=32  S=64  SE=128
// mask → [frame variants]  (use toFrameIndex for all entries)

export const GROUND_AUTOTILE: AutotileTable = {}

// ─── Helpers ─────────────────────────────────────────────────────────

function isGroundAt(tiles: number[][], row: number, col: number): boolean {
  return isTileOfType(tiles, row, col, TILE_GROUND)
}

function isOpenInternalCornerDiagonal(tile: number): boolean {
  return tile === -1 || tile === TILE_EMPTY || tile === TILE_CAVE
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

function getGroundColumnHeight(
  tiles: number[][],
  row: number,
  col: number
): number {
  return getColumnHeight(tiles, row, col, TILE_GROUND)
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

// ─── Resolver Functions ──────────────────────────────────────────────

function resolveStepJoinCornerFrame(context: GroundRuleContext): number | null {
  const { tiles, row, col } = context

  if (!isGroundAt(tiles, row, col)) return null
  if (isTopSurfaceGroundTile(tiles, row, col)) return null

  const hasGroundAbove = isGroundAt(tiles, row - 1, col)
  const hasGroundLeft = isGroundAt(tiles, row, col - 1)
  const hasGroundRight = isGroundAt(tiles, row, col + 1)
  const topLeftDiagonal = getTileAt(tiles, row - 1, col - 1)
  const topRightDiagonal = getTileAt(tiles, row - 1, col + 1)
  const canUseLeftInternalCorner =
    isOpenInternalCornerDiagonal(topRightDiagonal)
  const canUseRightInternalCorner =
    isOpenInternalCornerDiagonal(topLeftDiagonal)

  const isDirtStyle = (context.variantSeed ?? 0) === TOP_STYLE_DIRT_INDEX

  const leftInternalCornerFrame = isDirtStyle
    ? DIRT_INTERNAL_TOP_LEFT_CORNER_FRAME
    : GRASS_INTERNAL_TOP_LEFT_CORNER_FRAME
  const rightInternalCornerFrame = isDirtStyle
    ? DIRT_INTERNAL_TOP_RIGHT_CORNER_FRAME
    : GRASS_INTERNAL_TOP_RIGHT_CORNER_FRAME

  if (hasGroundAbove && hasGroundRight && canUseLeftInternalCorner) {
    return leftInternalCornerFrame
  }
  if (hasGroundAbove && hasGroundLeft && canUseRightInternalCorner) {
    return rightInternalCornerFrame
  }

  return null
}

function resolveDeepStructuredRowFrame(
  context: GroundRuleContext
): number | null {
  const { tiles, row, col } = context
  if (!isGroundAt(tiles, row, col)) return null

  const columnHeight = getGroundColumnHeight(tiles, row, col)
  if (columnHeight <= 3) return null

  const isInternal = isGroundInternalDebugCell(tiles, row, col)
  const isAboveGround = isGroundAt(tiles, row - 1, col)
  const isLeftGround = isGroundAt(tiles, row, col - 1)
  const isRightGround = isGroundAt(tiles, row, col + 1)
  const isBelowInternal = isGroundInternalDebugCell(tiles, row + 1, col)
  const isRightInternal = isGroundInternalDebugCell(tiles, row, col + 1)
  const isAboveInternal = isGroundInternalDebugCell(tiles, row - 1, col)
  const isLeftInternal = isGroundInternalDebugCell(tiles, row, col - 1)

  if (
    !isInternal &&
    isBelowInternal &&
    isRightInternal &&
    isAboveGround &&
    isLeftGround &&
    !isAboveInternal &&
    !isLeftInternal
  ) {
    return GROUND_INTERNAL_DIAGONAL_FRAME
  }

  if (!isInternal) return null

  if (isAboveGround && !isAboveInternal && isBelowInternal && isRightInternal) {
    return selectVariantFrame(GROUND_INTERNAL_TOP_FRAMES, row, col, 31)
  }
  if (isLeftGround && !isLeftInternal) {
    return selectVariantFrame(GROUND_INTERNAL_LEFT_FRAMES, row, col, 37)
  }
  if (isRightGround && !isRightInternal) {
    return selectVariantFrame(GROUND_INTERNAL_RIGHT_FRAMES, row, col, 41)
  }

  return null
}

// ─── Rules ───────────────────────────────────────────────────────────
// Compass tokens: 6 = ground, '!6' = not ground (empty/OOB/other)
// variants = per-run style alternatives (selected by variantSeed)

const GROUND_RULES: LayerRule<GroundRuleContext>[] = [
  // ═══ Top surface with ground below ═════════════════════════════════
  {
    matches: [{ N: '!6', S: 6, W: '!6', E: '!6' }],
    variants: [[toFrameIndex(5)], [toFrameIndex(70)]],
  },
  {
    matches: [{ N: '!6', S: 6, W: '!6', E: 6 }],
    variants: [[toFrameIndex(41)], [toFrameIndex(127)]],
  },
  {
    matches: [{ N: '!6', S: 6, W: 6, E: '!6' }],
    variants: [[toFrameIndex(43)], [toFrameIndex(129)]],
  },
  {
    matches: [{ N: '!6', S: 6, W: 6, E: 6 }],
    variants: [[toFrameIndex(42)], [toFrameIndex(128)]],
  },

  // ═══ Step-join internal corners (resolver — diagonal checks) ═══════
  { resolve: (context) => resolveStepJoinCornerFrame(context) },

  // ═══ Deep structured rows (resolver — internal debug cell checks) ══
  { resolve: (context) => resolveDeepStructuredRowFrame(context) },

  // ═══ Single-height top — isolated and right (from far-right) ═══════
  {
    matches: [{ N: '!6', S: '!6', W: '!6', E: '!6' }],
    variants: [[toFrameIndex(5)], [toFrameIndex(70)]],
  },
  {
    matches: [{ N: '!6', S: '!6', W: 6, E: '!6' }],
    variants: [[toFrameIndex(43)], [toFrameIndex(129)]],
  },

  // ═══ Body / remaining edges ════════════════════════════════════════
  { matches: [{ E: '!6' }], frames: [GROUND_BODY_RIGHT_FRAME] },
  { matches: [{ W: '!6' }], frames: [GROUND_BODY_LEFT_FRAME] },
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
  })
}

function collectRuleFrames(
  rules: ReadonlyArray<LayerRule<GroundRuleContext>>
): number[] {
  const frames = new Set<number>()
  for (const rule of rules) {
    const decl = rule as DeclarativeRule
    if (decl.frames) {
      for (const f of decl.frames) frames.add(f)
    }
    if (decl.variants) {
      for (const variant of decl.variants) {
        for (const f of variant) frames.add(f)
      }
    }
  }
  return Array.from(frames)
}

export function getGroundRuleFrameIndices(collisionOnly = false): number[] {
  if (collisionOnly) return []

  return Array.from(
    new Set([
      ...collectRuleFrames(GROUND_RULES),
      ...GROUND_INTERNAL_LEFT_FRAMES,
      ...GROUND_INTERNAL_TOP_FRAMES,
      ...GROUND_INTERNAL_RIGHT_FRAMES,
      GROUND_INTERNAL_DIAGONAL_FRAME,
      GROUND_BODY_MIDDLE_FRAME,
      DIRT_INTERNAL_TOP_LEFT_CORNER_FRAME,
      DIRT_INTERNAL_TOP_RIGHT_CORNER_FRAME,
      GRASS_INTERNAL_TOP_LEFT_CORNER_FRAME,
      GRASS_INTERNAL_TOP_RIGHT_CORNER_FRAME,
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
