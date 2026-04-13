const TILE_GROUND = 6
export const GROUND_INTERNAL_DEBUG_OFFSET_TILES = 2

const MIN_INTERNAL_WIDTH_TILES = 4
const MIN_INTERNAL_HEIGHT_TILES = 3
const NON_GROUND_DISTANCE = -1

interface GroundInternalCacheEntry {
  distanceField: number[][]
  qualifiedMasksByOffset: Map<number, boolean[][]>
}

const groundInternalCache = new WeakMap<number[][], GroundInternalCacheEntry>()

function isGroundAt(tiles: number[][], row: number, col: number): boolean {
  if (row < 0 || row >= tiles.length) {
    return false
  }

  if (col < 0 || col >= tiles[row].length) {
    return false
  }

  return tiles[row][col] === TILE_GROUND
}

function getEightNeighbors(row: number, col: number): Array<[number, number]> {
  return [
    [row - 1, col - 1],
    [row - 1, col],
    [row - 1, col + 1],
    [row, col - 1],
    [row, col + 1],
    [row + 1, col - 1],
    [row + 1, col],
    [row + 1, col + 1],
  ]
}

function isGroundBoundaryCell(
  tiles: number[][],
  row: number,
  col: number
): boolean {
  if (!isGroundAt(tiles, row, col)) {
    return false
  }

  // Inset offset is driven by top/left/right boundaries and top diagonals.
  // Bottom-facing boundaries are intentionally excluded.
  const insetSeedNeighbors: Array<[number, number]> = [
    [row - 1, col - 1],
    [row - 1, col],
    [row - 1, col + 1],
    [row, col - 1],
    [row, col + 1],
  ]

  for (const [neighborRow, neighborCol] of insetSeedNeighbors) {
    if (!isGroundAt(tiles, neighborRow, neighborCol)) {
      return true
    }
  }

  return false
}

function buildGroundDistanceField(tiles: number[][]): number[][] {
  const rows = tiles.length
  const cols = tiles[0].length
  const distanceField = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => NON_GROUND_DISTANCE)
  )

  const queue: Array<[number, number]> = []
  let queueIndex = 0

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      if (!isGroundBoundaryCell(tiles, row, col)) {
        continue
      }

      distanceField[row][col] = 0
      queue.push([row, col])
    }
  }

  while (queueIndex < queue.length) {
    const [row, col] = queue[queueIndex]
    queueIndex += 1
    const nextDistance = distanceField[row][col] + 1

    for (const [neighborRow, neighborCol] of getEightNeighbors(row, col)) {
      if (!isGroundAt(tiles, neighborRow, neighborCol)) {
        continue
      }

      if (distanceField[neighborRow][neighborCol] !== NON_GROUND_DISTANCE) {
        continue
      }

      distanceField[neighborRow][neighborCol] = nextDistance
      queue.push([neighborRow, neighborCol])
    }
  }

  return distanceField
}

function getOrCreateGroundInternalCache(
  tiles: number[][]
): GroundInternalCacheEntry {
  const cached = groundInternalCache.get(tiles)
  if (cached) {
    return cached
  }

  const created: GroundInternalCacheEntry = {
    distanceField: buildGroundDistanceField(tiles),
    qualifiedMasksByOffset: new Map<number, boolean[][]>(),
  }
  groundInternalCache.set(tiles, created)
  return created
}

function buildQualifiedInternalMask(
  tiles: number[][],
  distanceField: number[][],
  offset: number
): boolean[][] {
  const rows = tiles.length
  const cols = tiles[0].length
  const candidateMask = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => false)
  )
  const qualifiedMask = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => false)
  )
  const visited = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => false)
  )

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      candidateMask[row][col] =
        isGroundAt(tiles, row, col) && distanceField[row][col] >= offset
    }
  }

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      if (!candidateMask[row][col] || visited[row][col]) {
        continue
      }

      const queue: Array<[number, number]> = [[row, col]]
      const componentCells: Array<[number, number]> = []
      let queueIndex = 0
      visited[row][col] = true
      let minRow = row
      let maxRow = row
      let minCol = col
      let maxCol = col

      while (queueIndex < queue.length) {
        const [currentRow, currentCol] = queue[queueIndex]
        queueIndex += 1
        componentCells.push([currentRow, currentCol])
        minRow = Math.min(minRow, currentRow)
        maxRow = Math.max(maxRow, currentRow)
        minCol = Math.min(minCol, currentCol)
        maxCol = Math.max(maxCol, currentCol)

        for (const [neighborRow, neighborCol] of getEightNeighbors(
          currentRow,
          currentCol
        )) {
          if (
            neighborRow < 0 ||
            neighborRow >= rows ||
            neighborCol < 0 ||
            neighborCol >= cols
          ) {
            continue
          }

          if (!candidateMask[neighborRow][neighborCol]) {
            continue
          }

          if (visited[neighborRow][neighborCol]) {
            continue
          }

          visited[neighborRow][neighborCol] = true
          queue.push([neighborRow, neighborCol])
        }
      }

      const width = maxCol - minCol + 1
      const height = maxRow - minRow + 1
      if (
        width < MIN_INTERNAL_WIDTH_TILES ||
        height < MIN_INTERNAL_HEIGHT_TILES
      ) {
        continue
      }

      for (const [componentRow, componentCol] of componentCells) {
        qualifiedMask[componentRow][componentCol] = true
      }
    }
  }

  return qualifiedMask
}

export function isGroundInternalDebugCell(
  tiles: number[][],
  row: number,
  col: number,
  offset = GROUND_INTERNAL_DEBUG_OFFSET_TILES
): boolean {
  if (!isGroundAt(tiles, row, col)) {
    return false
  }

  const normalizedOffset = Math.max(1, offset)
  const cacheEntry = getOrCreateGroundInternalCache(tiles)
  const cachedMask = cacheEntry.qualifiedMasksByOffset.get(normalizedOffset)
  if (cachedMask) {
    return cachedMask[row][col]
  }

  const qualifiedMask = buildQualifiedInternalMask(
    tiles,
    cacheEntry.distanceField,
    normalizedOffset
  )
  cacheEntry.qualifiedMasksByOffset.set(normalizedOffset, qualifiedMask)
  return qualifiedMask[row][col]
}
