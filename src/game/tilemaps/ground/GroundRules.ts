import { type AutotileTable, collectAutotileFrames } from '../rules/Autotiler'

export interface GroundGenerationConstraints {
  tileId: number
  minColumnHeightTiles: number
  maxColumnHeightTiles: number
  maxHeightStepDeltaRows: number
  minSegmentLength: number
  maxSegmentLength: number
  minGapSize: number
  maxGapSize: number
  gapChancePerSegment: number
  minimumStartingSolidColumns: number
}

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
const TILE_SUPPORT = 7
const TOP_STYLE_DIRT_INDEX = 1
const GROUND_BODY_LEFT_FRAME = 132 - 1
const GROUND_BODY_MIDDLE_FRAME = 133 - 1
const GROUND_BODY_RIGHT_FRAME = 134 - 1
const DIRT_INTERNAL_TOP_LEFT_CORNER_FRAME = 148 - 1
const DIRT_INTERNAL_TOP_RIGHT_CORNER_FRAME = 149 - 1
const GRASS_INTERNAL_TOP_LEFT_CORNER_FRAME = 49 - 1
const GRASS_INTERNAL_TOP_RIGHT_CORNER_FRAME = 50 - 1

interface GroundTopStyle {
  isolatedSingleFrame: number
  topLeftCornerFrame: number
  topMiddleFrames: number[]
  topRightCornerFrame: number
}

const GROUND_TOP_STYLES: GroundTopStyle[] = [
  {
    isolatedSingleFrame: 5 - 1,
    topLeftCornerFrame: 41 - 1,
    topMiddleFrames: [42 - 1],
    topRightCornerFrame: 43 - 1,
  },
  {
    isolatedSingleFrame: 70 - 1,
    topLeftCornerFrame: 127 - 1,
    topMiddleFrames: [128 - 1],
    topRightCornerFrame: 129 - 1,
  },
]

// ─── Bitmask Autotile Table ──────────────────────────────────────────
// 8-directional same-type sampling with corner stripping.
// Bit layout: NW=1 N=2 NE=4  W=8 E=16  SW=32 S=64 SE=128
// Empty table — populate entries from atlas tile images.

export const GROUND_AUTOTILE: AutotileTable = {
  // mask → [variant frame indices]
  // Populate from atlas images.
}

function isGroundAt(tiles: number[][], row: number, col: number): boolean {
  if (row < 0 || row >= tiles.length) {
    return false
  }

  if (col < 0 || col >= tiles[row].length) {
    return false
  }

  return tiles[row][col] === TILE_GROUND
}

function getTileAt(tiles: number[][], row: number, col: number): number {
  if (row < 0 || row >= tiles.length) {
    return -1
  }

  if (col < 0 || col >= tiles[row].length) {
    return -1
  }

  return tiles[row][col]
}

function isOpenInternalCornerDiagonal(tile: number): boolean {
  return tile === -1 || tile === TILE_EMPTY || tile === TILE_SUPPORT
}

function classifyGroundEdge(
  tiles: number[][],
  row: number,
  col: number
): 'left_edge' | 'right_edge' | 'none' {
  if (!isGroundAt(tiles, row, col)) {
    return 'none'
  }

  const hasGroundLeft = isGroundAt(tiles, row, col - 1)
  const hasGroundRight = isGroundAt(tiles, row, col + 1)

  // Rule: far-right wall applies whenever there is no ground tile to the right.
  if (!hasGroundRight) {
    return 'right_edge'
  }

  if (!hasGroundLeft && hasGroundRight) {
    return 'left_edge'
  }

  return 'none'
}

function isTopSurfaceGroundTile(
  tiles: number[][],
  row: number,
  col: number
): boolean {
  return isGroundAt(tiles, row, col) && !isGroundAt(tiles, row - 1, col)
}

function findColumnSurfaceRow(
  tiles: number[][],
  row: number,
  col: number
): number {
  let surfaceRow = row

  while (isGroundAt(tiles, surfaceRow - 1, col)) {
    surfaceRow -= 1
  }

  return surfaceRow
}

function columnHasGround(tiles: number[][], col: number): boolean {
  if (col < 0 || col >= tiles[0].length) {
    return false
  }

  for (let row = 0; row < tiles.length; row += 1) {
    if (isGroundAt(tiles, row, col)) {
      return true
    }
  }

  return false
}

function findGroundSectionLeft(tiles: number[][], col: number): number {
  let left = col
  while (columnHasGround(tiles, left - 1)) {
    left -= 1
  }
  return left
}

function getGroundColumnHeight(
  tiles: number[][],
  row: number,
  col: number
): number {
  if (!isGroundAt(tiles, row, col)) {
    return 0
  }

  const surfaceRow = findColumnSurfaceRow(tiles, row, col)
  return tiles.length - surfaceRow
}

function selectVariantFrame(
  frames: number[],
  row: number,
  col: number,
  salt: number
): number {
  if (frames.length === 0) {
    return -1
  }

  const hash = (row * 10007) ^ (col * 30011) ^ (salt * 70001)
  const index = Math.abs(hash) % frames.length
  return frames[index]
}

function selectGroundTopStyleIndex(
  tiles: number[][],
  _row: number,
  col: number
): number {
  const sectionLeftCol = findGroundSectionLeft(tiles, col)

  // One style decision per full horizontal ground section (between gaps).
  const hash = sectionLeftCol * 68917
  return Math.abs(hash) % GROUND_TOP_STYLES.length
}

function resolveGroundTopLayerFrame(
  tiles: number[][],
  row: number,
  col: number
): number | null {
  if (!isTopSurfaceGroundTile(tiles, row, col)) {
    return null
  }

  const isBottomOfColumn = !isGroundAt(tiles, row + 1, col)
  if (isBottomOfColumn) {
    return null
  }

  const hasLeft = isGroundAt(tiles, row, col - 1)
  const hasRight = isGroundAt(tiles, row, col + 1)
  const hasBottom = isGroundAt(tiles, row + 1, col)
  const hasBottomLeft = isGroundAt(tiles, row + 1, col - 1)
  const hasBottomRight = isGroundAt(tiles, row + 1, col + 1)

  const styleIndex = selectGroundTopStyleIndex(tiles, row, col)
  const style = GROUND_TOP_STYLES[styleIndex]

  // Any top tile with no horizontal neighbors is a single-width cap.
  // This includes floating singles and stacked 1-tile-wide columns.
  if (!hasLeft && !hasRight) {
    return style.isolatedSingleFrame
  }

  // Top-left outer corner for current selected top style.
  if ((!hasLeft && hasRight) || (!hasLeft && hasBottom && hasBottomRight)) {
    return style.topLeftCornerFrame
  }

  // Top-right outer corner for current selected top style.
  if ((hasLeft && !hasRight) || (!hasRight && hasBottom && hasBottomLeft)) {
    return style.topRightCornerFrame
  }

  // Top middle filler variants for current selected top style.
  if (hasLeft && hasRight) {
    return selectVariantFrame(style.topMiddleFrames, row, col, styleIndex + 1)
  }

  return null
}

function resolveStepJoinCornerFrame(
  tiles: number[][],
  row: number,
  col: number
): number | null {
  if (!isGroundAt(tiles, row, col)) {
    return null
  }

  // This frame belongs on the join tile one row below the top corner,
  // not on the top cap itself.
  if (isTopSurfaceGroundTile(tiles, row, col)) {
    return null
  }

  const hasGroundAbove = isGroundAt(tiles, row - 1, col)
  const hasGroundLeft = isGroundAt(tiles, row, col - 1)
  const hasGroundRight = isGroundAt(tiles, row, col + 1)
  const topLeftDiagonal = getTileAt(tiles, row - 1, col - 1)
  const topRightDiagonal = getTileAt(tiles, row - 1, col + 1)
  const canUseLeftInternalCorner =
    isOpenInternalCornerDiagonal(topRightDiagonal)
  const canUseRightInternalCorner =
    isOpenInternalCornerDiagonal(topLeftDiagonal)

  const styleIndex = selectGroundTopStyleIndex(tiles, row - 1, col)
  const isDirtStyle = styleIndex === TOP_STYLE_DIRT_INDEX

  const leftInternalCornerFrame = isDirtStyle
    ? DIRT_INTERNAL_TOP_LEFT_CORNER_FRAME
    : GRASS_INTERNAL_TOP_LEFT_CORNER_FRAME
  const rightInternalCornerFrame = isDirtStyle
    ? DIRT_INTERNAL_TOP_RIGHT_CORNER_FRAME
    : GRASS_INTERNAL_TOP_RIGHT_CORNER_FRAME

  // Internal corner rule:
  // 6 above + 6 on one side + (empty, out-of-bounds, or 7) on that same-side diagonal above.
  if (hasGroundAbove && hasGroundRight && canUseLeftInternalCorner) {
    return leftInternalCornerFrame
  }

  if (hasGroundAbove && hasGroundLeft && canUseRightInternalCorner) {
    return rightInternalCornerFrame
  }

  return null
}

function resolveGroundSideFrame(
  tiles: number[][],
  row: number,
  col: number
): number | null {
  const edgeRole = classifyGroundEdge(tiles, row, col)
  if (edgeRole === 'none') {
    return null
  }

  if (edgeRole === 'left_edge') {
    return GROUND_BODY_LEFT_FRAME
  }

  return GROUND_BODY_RIGHT_FRAME
}

function resolveBottomBoundaryGroundFrame(
  tiles: number[][],
  row: number,
  col: number
): number | null {
  if (!isGroundAt(tiles, row, col)) {
    return null
  }

  const isBottomOfColumn = !isGroundAt(tiles, row + 1, col)
  if (!isBottomOfColumn) {
    return null
  }

  const hasLeft = isGroundAt(tiles, row, col - 1)
  const hasRight = isGroundAt(tiles, row, col + 1)

  if (!hasLeft && hasRight) {
    return GROUND_BODY_LEFT_FRAME
  }

  if (hasLeft && !hasRight) {
    return GROUND_BODY_RIGHT_FRAME
  }

  return GROUND_BODY_MIDDLE_FRAME
}

function resolveDeepStructuredRowFrame(
  tiles: number[][],
  row: number,
  col: number
): number | null {
  if (!isGroundAt(tiles, row, col)) {
    return null
  }

  const columnHeight = getGroundColumnHeight(tiles, row, col)
  if (columnHeight <= 2) {
    return null
  }

  const hasLeft = isGroundAt(tiles, row, col - 1)
  const hasRight = isGroundAt(tiles, row, col + 1)

  if (!hasLeft && hasRight) {
    return GROUND_BODY_LEFT_FRAME
  }

  if (hasLeft && !hasRight) {
    return GROUND_BODY_RIGHT_FRAME
  }

  return GROUND_BODY_MIDDLE_FRAME
}

function resolveFarRightPerRowFrame(
  tiles: number[][],
  row: number,
  col: number
): number | null {
  if (!isGroundAt(tiles, row, col)) {
    return null
  }

  const hasRight = isGroundAt(tiles, row, col + 1)
  if (hasRight) {
    return null
  }

  const surfaceRow = findColumnSurfaceRow(tiles, row, col)
  const styleIndex = selectGroundTopStyleIndex(tiles, surfaceRow, col)
  const style = GROUND_TOP_STYLES[styleIndex]

  const hasLeft = isGroundAt(tiles, row, col - 1)
  const isTop = isTopSurfaceGroundTile(tiles, row, col)

  // Preserve single-width top behavior for stacked/floating 1-wide columns.
  if (isTop && !hasLeft) {
    return style.isolatedSingleFrame
  }

  if (isTop) {
    return style.topRightCornerFrame
  }

  return GROUND_BODY_RIGHT_FRAME
}

// ─── Frame resolution ────────────────────────────────────────────────

export function resolveGroundTileFrame(
  row: number,
  col: number,
  _fallbackFrame: number,
  tiles: number[][]
): number {
  const topLayerFrame = resolveGroundTopLayerFrame(tiles, row, col)
  if (topLayerFrame !== null) {
    return topLayerFrame
  }

  const stepJoinCornerFrame = resolveStepJoinCornerFrame(tiles, row, col)
  if (stepJoinCornerFrame !== null) {
    return stepJoinCornerFrame
  }

  const bottomBoundaryFrame = resolveBottomBoundaryGroundFrame(tiles, row, col)
  if (bottomBoundaryFrame !== null) {
    return bottomBoundaryFrame
  }

  const deepStructuredRowFrame = resolveDeepStructuredRowFrame(tiles, row, col)
  if (deepStructuredRowFrame !== null) {
    return deepStructuredRowFrame
  }

  const forcedFarRightFrame = resolveFarRightPerRowFrame(tiles, row, col)
  if (forcedFarRightFrame !== null) {
    return forcedFarRightFrame
  }

  const sideFrame = resolveGroundSideFrame(tiles, row, col)
  if (sideFrame !== null) {
    return sideFrame
  }

  // Keep unresolved until explicit ground mappings are authored.
  return -1
}

export function getGroundRuleFrameIndices(collisionOnly = false): number[] {
  if (collisionOnly) return []

  const topStyleFrames = GROUND_TOP_STYLES.flatMap((style) => [
    style.isolatedSingleFrame,
    style.topLeftCornerFrame,
    ...style.topMiddleFrames,
    style.topRightCornerFrame,
  ])

  return Array.from(
    new Set([
      ...topStyleFrames,
      GROUND_BODY_LEFT_FRAME,
      GROUND_BODY_MIDDLE_FRAME,
      GROUND_BODY_RIGHT_FRAME,
      DIRT_INTERNAL_TOP_LEFT_CORNER_FRAME,
      DIRT_INTERNAL_TOP_RIGHT_CORNER_FRAME,
      GRASS_INTERNAL_TOP_LEFT_CORNER_FRAME,
      GRASS_INTERNAL_TOP_RIGHT_CORNER_FRAME,
      ...collectAutotileFrames(GROUND_AUTOTILE),
    ])
  )
}
