const TILE_GROUND = 6
export const GROUND_INTERNAL_DEBUG_OFFSET_TILES = 1
const MIN_INTERNAL_EFFECTIVE_OFFSET_TILES = 1

const MIN_INTERNAL_WIDTH_TILES = 3
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

function hasSubMinimumRunInLine(
  values: boolean[],
  minRunLength: number
): boolean {
  let runLength = 0

  for (const value of values) {
    if (!value) {
      if (runLength > 0 && runLength < minRunLength) {
        return true
      }
      runLength = 0
      continue
    }

    runLength += 1
  }

  return runLength > 0 && runLength < minRunLength
}

function hasSubMinimumRunInAnyRow(mask: boolean[][]): boolean {
  for (const row of mask) {
    if (hasSubMinimumRunInLine(row, MIN_INTERNAL_WIDTH_TILES)) {
      return true
    }
  }

  return false
}

function hasSubMinimumRunInAnyColumn(mask: boolean[][]): boolean {
  const cols = mask[0].length

  for (let col = 0; col < cols; col += 1) {
    const columnValues = mask.map((row) => row[col])
    if (hasSubMinimumRunInLine(columnValues, MIN_INTERNAL_HEIGHT_TILES)) {
      return true
    }
  }

  return false
}

function hasSubMinimumRunInAnyRowOrColumn(mask: boolean[][]): boolean {
  if (mask.length === 0 || mask[0].length === 0) {
    return false
  }

  return hasSubMinimumRunInAnyRow(mask) || hasSubMinimumRunInAnyColumn(mask)
}

function getMaxGroundDistance(distanceField: number[][]): number {
  let maxDistance = 0

  for (const row of distanceField) {
    for (const distance of row) {
      maxDistance = Math.max(maxDistance, distance)
    }
  }

  return Math.max(1, maxDistance)
}

function getQualifiedMaskForOffset(
  tiles: number[][],
  cacheEntry: GroundInternalCacheEntry,
  offset: number
): boolean[][] {
  const cachedMask = cacheEntry.qualifiedMasksByOffset.get(offset)
  if (cachedMask) {
    return cachedMask
  }

  const qualifiedMask = buildQualifiedInternalMask(
    tiles,
    cacheEntry.distanceField,
    offset
  )
  cacheEntry.qualifiedMasksByOffset.set(offset, qualifiedMask)
  return qualifiedMask
}

function countQualifiedCells(mask: boolean[][]): number {
  let count = 0
  for (const row of mask) {
    for (const cell of row) {
      if (cell) count += 1
    }
  }
  return count
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

  const normalizedOffset = Math.max(MIN_INTERNAL_EFFECTIVE_OFFSET_TILES, offset)
  const cacheEntry = getOrCreateGroundInternalCache(tiles)
  const maxOffset = getMaxGroundDistance(cacheEntry.distanceField)

  let effectiveOffset = Math.min(normalizedOffset, maxOffset)
  let qualifiedMask = getQualifiedMaskForOffset(
    tiles,
    cacheEntry,
    effectiveOffset
  )
  let qualifiedCellCount = countQualifiedCells(qualifiedMask)

  // Keep increasing inset depth while rows/columns still contain runs
  // narrower than the minimum internal width/height constraints.
  while (
    effectiveOffset < maxOffset &&
    hasSubMinimumRunInAnyRowOrColumn(qualifiedMask)
  ) {
    const previousQualifiedCellCount = qualifiedCellCount
    const nextOffset = effectiveOffset + 1
    const nextMask = getQualifiedMaskForOffset(tiles, cacheEntry, nextOffset)
    const nextQualifiedCellCount = countQualifiedCells(nextMask)

    // Do not continue increasing depth when it would erase all internals.
    if (nextQualifiedCellCount === 0) {
      break
    }

    effectiveOffset = nextOffset
    qualifiedMask = nextMask
    qualifiedCellCount = nextQualifiedCellCount

    // If deeper offset does not improve run quality, stop escalating.
    if (
      hasSubMinimumRunInAnyRowOrColumn(qualifiedMask) &&
      nextQualifiedCellCount >= previousQualifiedCellCount
    ) {
      break
    }
  }

  return qualifiedMask[row][col]
}
