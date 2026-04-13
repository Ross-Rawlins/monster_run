export type CardinalDirection = 'N' | 'S' | 'W' | 'E'

export interface SeamOptions {
  seamTileId: number
}

export function getTileAt(
  tiles: number[][],
  row: number,
  col: number,
  oobValue = -1
): number {
  if (row < 0 || row >= tiles.length) return oobValue
  const rowData = tiles[row]
  if (col < 0 || col >= rowData.length) return oobValue
  return rowData[col]
}

export function isTileAt(
  tiles: number[][],
  row: number,
  col: number,
  tileType: number
): boolean {
  return getTileAt(tiles, row, col, -1) === tileType
}

export function getCardinalNeighbor(
  tiles: number[][],
  row: number,
  col: number,
  direction: CardinalDirection,
  oobValue = -1,
  seam?: SeamOptions
): number {
  switch (direction) {
    case 'N':
      return getTileAt(tiles, row - 1, col, oobValue)
    case 'S':
      return getTileAt(tiles, row + 1, col, oobValue)
    case 'W': {
      if (seam && col - 1 < 0) return seam.seamTileId
      return getTileAt(tiles, row, col - 1, oobValue)
    }
    case 'E': {
      if (seam && col + 1 >= tiles[row].length) return seam.seamTileId
      return getTileAt(tiles, row, col + 1, oobValue)
    }
  }
}

export function gatherCardinalNeighbors(
  tiles: number[][],
  row: number,
  col: number,
  oobValue = -1,
  seam?: SeamOptions
): Record<CardinalDirection, number> {
  return {
    N: getCardinalNeighbor(tiles, row, col, 'N', oobValue, seam),
    S: getCardinalNeighbor(tiles, row, col, 'S', oobValue, seam),
    W: getCardinalNeighbor(tiles, row, col, 'W', oobValue, seam),
    E: getCardinalNeighbor(tiles, row, col, 'E', oobValue, seam),
  }
}

export function pickDeterministicVariant(
  frames: number[],
  row: number,
  col: number
): number {
  if (frames.length === 0) return -1
  if (frames.length === 1) return frames[0]
  const hash = (row * 73856093 + col * 19349663) >>> 0
  return frames[hash % frames.length]
}
