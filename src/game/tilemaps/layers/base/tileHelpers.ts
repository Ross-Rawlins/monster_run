import {
  isTileAt,
  getTileAt as getTileAtRaw,
  hashTileCoordinates,
} from '../../rules/neighbors'

// ─── Generic tile predicates ─────────────────────────────────────────

export function isTileOfType(
  tiles: number[][],
  row: number,
  col: number,
  tileId: number
): boolean {
  return isTileAt(tiles, row, col, tileId)
}

export function getTileAt(
  tiles: number[][],
  row: number,
  col: number,
  oobValue = -1
): number {
  return getTileAtRaw(tiles, row, col, oobValue)
}

// ─── Cardinal neighbor state ─────────────────────────────────────────
// Compute once per tile, pass into resolvers that need it.

export interface CardinalNeighborState {
  above: boolean
  below: boolean
  left: boolean
  right: boolean
  aboveLeft: boolean
  aboveRight: boolean
  belowLeft: boolean
  belowRight: boolean
}

export function getCardinalNeighborState(
  tiles: number[][],
  row: number,
  col: number,
  tileId: number
): CardinalNeighborState {
  return {
    above: isTileAt(tiles, row - 1, col, tileId),
    below: isTileAt(tiles, row + 1, col, tileId),
    left: isTileAt(tiles, row, col - 1, tileId),
    right: isTileAt(tiles, row, col + 1, tileId),
    aboveLeft: isTileAt(tiles, row - 1, col - 1, tileId),
    aboveRight: isTileAt(tiles, row - 1, col + 1, tileId),
    belowLeft: isTileAt(tiles, row + 1, col - 1, tileId),
    belowRight: isTileAt(tiles, row + 1, col + 1, tileId),
  }
}

// ─── Run bounds (generic connected-run detection) ────────────────────
// Replaces platform-specific getPlatformRunBounds / findPlatformRunBoundary.

export interface RunBounds {
  top: number
  bottom: number
  left: number
  right: number
  height: number
  localRow: number
}

export function findRunBoundary(
  tiles: number[][],
  row: number,
  col: number,
  rowStep: number,
  colStep: number,
  tileId: number
): number {
  let boundaryRow = row
  let boundaryCol = col

  while (
    isTileAt(tiles, boundaryRow + rowStep, boundaryCol + colStep, tileId)
  ) {
    boundaryRow += rowStep
    boundaryCol += colStep
  }

  return rowStep === 0 ? boundaryCol : boundaryRow
}

export function getRunBounds(
  tiles: number[][],
  row: number,
  col: number,
  tileId: number
): RunBounds {
  const top = findRunBoundary(tiles, row, col, -1, 0, tileId)
  const bottom = findRunBoundary(tiles, row, col, 1, 0, tileId)
  const left = findRunBoundary(tiles, top, col, 0, -1, tileId)
  const right = findRunBoundary(tiles, top, col, 0, 1, tileId)

  return {
    top,
    bottom,
    left,
    right,
    height: bottom - top + 1,
    localRow: row - top,
  }
}

// ─── Surface detection ───────────────────────────────────────────────

export function isTopSurface(
  tiles: number[][],
  row: number,
  col: number,
  tileId: number
): boolean {
  return (
    isTileAt(tiles, row, col, tileId) && !isTileAt(tiles, row - 1, col, tileId)
  )
}

export function findColumnSurfaceRow(
  tiles: number[][],
  row: number,
  col: number,
  tileId: number
): number {
  let surfaceRow = row
  while (isTileAt(tiles, surfaceRow - 1, col, tileId)) {
    surfaceRow -= 1
  }
  return surfaceRow
}

export function getColumnHeight(
  tiles: number[][],
  row: number,
  col: number,
  tileId: number
): number {
  if (!isTileAt(tiles, row, col, tileId)) return 0
  const surfaceRow = findColumnSurfaceRow(tiles, row, col, tileId)
  return tiles.length - surfaceRow
}

// ─── Variant frame selection ─────────────────────────────────────────

export function selectVariantFrame(
  frames: number[],
  row: number,
  col: number,
  salt: number
): number {
  if (frames.length === 0) return -1
  const hash = hashTileCoordinates(row, col, salt)
  const index = hash % frames.length
  return frames[index]
}
