export type CardinalDirection = 'N' | 'S' | 'W' | 'E'

export interface HorizontalNeighborState {
  hasLeft: boolean
  hasRight: boolean
}

export type HorizontalRole = 'left_edge' | 'center' | 'right_edge' | 'isolated'

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

export function getHorizontalNeighborState(
  tiles: number[][],
  row: number,
  col: number,
  tileType: number
): HorizontalNeighborState {
  return {
    hasLeft: isTileAt(tiles, row, col - 1, tileType),
    hasRight: isTileAt(tiles, row, col + 1, tileType),
  }
}

export function classifyHorizontalRole(
  state: HorizontalNeighborState
): HorizontalRole {
  if (state.hasLeft && state.hasRight) {
    return 'center'
  }

  if (!state.hasLeft && !state.hasRight) {
    return 'isolated'
  }

  return state.hasLeft ? 'right_edge' : 'left_edge'
}

export function hashTileCoordinates(
  row: number,
  col: number,
  salt = 0
): number {
  let hash = Math.imul(row ^ 0x9e3779b1, 0x85ebca6b) >>> 0
  hash = (hash + Math.imul(col ^ 0xc2b2ae35, 0x27d4eb2d)) >>> 0
  hash = (hash + Math.imul(salt ^ 0x165667b1, 0x1b873593)) >>> 0
  hash ^= hash >>> 15
  hash = Math.imul(hash, 0x85ebca6b) >>> 0
  hash ^= hash >>> 13
  hash = Math.imul(hash, 0xc2b2ae35) >>> 0
  hash ^= hash >>> 16
  return hash >>> 0
}

export function pickDeterministicVariant(
  frames: number[],
  row: number,
  col: number
): number {
  if (frames.length === 0) return -1
  if (frames.length === 1) return frames[0]
  const hash = hashTileCoordinates(row, col)
  return frames[hash % frames.length]
}
