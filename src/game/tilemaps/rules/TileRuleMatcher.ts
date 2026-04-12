export type TileNeighborhoodDirection =
  | 'N'
  | 'NE'
  | 'E'
  | 'SE'
  | 'S'
  | 'SW'
  | 'W'
  | 'NW'
  | 'N2'
  | 'E2'
  | 'S2'
  | 'W2'
  | 'NE2'
  | 'SE2'
  | 'SW2'
  | 'NW2'

export type TileNeighborhood = Record<TileNeighborhoodDirection, number>

const INTERNAL_EMPTY_VALUE = 0
const INTERNAL_OUT_OF_BOUNDS_VALUE = -2

export type OrderedRuleMatch<Direction extends string> = Partial<
  Record<Direction, number>
>

export interface OrderedFrameRule<Direction extends string> {
  match: OrderedRuleMatch<Direction> | Array<OrderedRuleMatch<Direction>>
  frames: number[]
  minimumMatches?: number
  collision?: boolean // Optional: true if these frames should be collidable
}

interface OrderedRuleMatchResult<Direction extends string> {
  pattern: OrderedRuleMatch<Direction>
  matchedCount: number
  patternSize: number
}

function getTileAt(tiles: number[][], row: number, col: number): number {
  if (row < 0 || col < 0 || row >= tiles.length || col >= tiles[row].length) {
    return INTERNAL_OUT_OF_BOUNDS_VALUE
  }

  return tiles[row][col]
}

export function gatherTileNeighborhood(
  tiles: number[][],
  row: number,
  col: number
): TileNeighborhood {
  return {
    N: getTileAt(tiles, row - 1, col),
    NE: getTileAt(tiles, row - 1, col + 1),
    E: getTileAt(tiles, row, col + 1),
    SE: getTileAt(tiles, row + 1, col + 1),
    S: getTileAt(tiles, row + 1, col),
    SW: getTileAt(tiles, row + 1, col - 1),
    W: getTileAt(tiles, row, col - 1),
    NW: getTileAt(tiles, row - 1, col - 1),
    N2: getTileAt(tiles, row - 2, col),
    E2: getTileAt(tiles, row, col + 2),
    S2: getTileAt(tiles, row + 2, col),
    W2: getTileAt(tiles, row, col - 2),
    NE2: getTileAt(tiles, row - 2, col + 2),
    SE2: getTileAt(tiles, row + 2, col + 2),
    SW2: getTileAt(tiles, row + 2, col - 2),
    NW2: getTileAt(tiles, row - 2, col - 2),
  }
}

export function normalizeRuleTileValue(
  tile: number,
  emptyRuleValue = -1,
  internalEmptyValue = INTERNAL_EMPTY_VALUE,
  outOfBoundsRuleValue = 0,
  internalOutOfBoundsValue = INTERNAL_OUT_OF_BOUNDS_VALUE
): number {
  if (tile === internalOutOfBoundsValue) {
    return outOfBoundsRuleValue
  }

  return tile === internalEmptyValue ? emptyRuleValue : tile
}

export function normalizeTileContext<Direction extends string>(
  context: Record<Direction, number>,
  emptyRuleValue = -1,
  internalEmptyValue = INTERNAL_EMPTY_VALUE,
  outOfBoundsRuleValue = 0,
  internalOutOfBoundsValue = INTERNAL_OUT_OF_BOUNDS_VALUE
): Record<Direction, number> {
  const normalized = {} as Record<Direction, number>

  for (const direction of Object.keys(context) as Direction[]) {
    normalized[direction] = normalizeRuleTileValue(
      context[direction],
      emptyRuleValue,
      internalEmptyValue,
      outOfBoundsRuleValue,
      internalOutOfBoundsValue
    )
  }

  return normalized
}

export function orderedRuleMatches<Direction extends string>(
  rule: OrderedFrameRule<Direction>,
  context: Record<Direction, number>
): boolean {
  return getOrderedRuleMatchResult(rule, context) !== null
}

function getOrderedRuleMatchResult<Direction extends string>(
  rule: OrderedFrameRule<Direction>,
  context: Record<Direction, number>
): OrderedRuleMatchResult<Direction> | null {
  const matchPatterns = Array.isArray(rule.match) ? rule.match : [rule.match]
  let bestMatch: OrderedRuleMatchResult<Direction> | null = null

  for (const pattern of matchPatterns) {
    const entries = Object.entries(pattern) as Array<[Direction, number]>
    const minimumMatches = rule.minimumMatches ?? entries.length

    if (entries.length === 0) {
      continue
    }

    let matchedCount = 0

    for (const [direction, expectedTile] of entries) {
      if (context[direction] === expectedTile) {
        matchedCount += 1
      }
    }

    if (matchedCount < minimumMatches) {
      continue
    }

    if (
      !bestMatch ||
      entries.length > bestMatch.patternSize ||
      (entries.length === bestMatch.patternSize &&
        matchedCount > bestMatch.matchedCount)
    ) {
      bestMatch = {
        pattern,
        matchedCount,
        patternSize: entries.length,
      }
    }
  }

  return bestMatch
}

export function pickDeterministicFrame(
  frames: number[],
  row: number,
  col: number
): number {
  if (frames.length === 0) {
    throw new Error('Rule frames must not be empty')
  }

  if (frames.length === 1) {
    return frames[0]
  }

  const hash = (row * 73856093 + col * 19349663) >>> 0
  return frames[hash % frames.length]
}

export function resolveOrderedRuleFrame<Direction extends string>(
  rules: Array<OrderedFrameRule<Direction>>,
  context: Record<Direction, number>,
  row: number,
  col: number,
  fallbackFrame: number
): number {
  for (const rule of rules) {
    if (!orderedRuleMatches(rule, context)) {
      continue
    }

    return pickDeterministicFrame(rule.frames, row, col)
  }

  return fallbackFrame
}

export function resolveMostSpecificOrderedRuleFrame<Direction extends string>(
  rules: Array<OrderedFrameRule<Direction>>,
  context: Record<Direction, number>,
  row: number,
  col: number,
  fallbackFrame: number
): number {
  let matchedRule: OrderedFrameRule<Direction> | null = null
  let bestMatch: OrderedRuleMatchResult<Direction> | null = null

  for (const rule of rules) {
    const ruleMatch = getOrderedRuleMatchResult(rule, context)

    if (!ruleMatch) {
      continue
    }

    if (
      !bestMatch ||
      ruleMatch.patternSize > bestMatch.patternSize ||
      (ruleMatch.patternSize === bestMatch.patternSize &&
        ruleMatch.matchedCount > bestMatch.matchedCount)
    ) {
      matchedRule = rule
      bestMatch = ruleMatch
    }
  }

  if (!matchedRule) {
    return fallbackFrame
  }

  return pickDeterministicFrame(matchedRule.frames, row, col)
}

export function collectOrderedRuleFrames<Direction extends string>(
  rules: Array<OrderedFrameRule<Direction>>,
  options?: {
    collisionOnly?: boolean
  }
): number[] {
  const frameSet = new Set<number>()
  const collisionOnly = options?.collisionOnly === true

  for (const rule of rules) {
    if (collisionOnly && rule.collision === false) {
      continue
    }

    for (const frame of rule.frames) {
      frameSet.add(frame)
    }
  }

  return Array.from(frameSet)
}
