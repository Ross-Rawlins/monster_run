import { getTileAt, pickDeterministicVariant } from '../rules/neighbors'

export type CompassDirection =
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

export type CompassRuleToken = number | string
export type CompassRuleSpec = CompassRuleToken | CompassRuleToken[]
export type CompassMatch = Partial<Record<CompassDirection, CompassRuleSpec>>

export interface CompassRuleContext {
  tiles: number[][]
  row: number
  col: number
  fallbackFrame: number
  neighborhood: Record<CompassDirection, number>
}

export interface CompassFrameRule {
  matches: CompassMatch | CompassMatch[]
  frames: number[]
  minimumMatches?: number
  frameSelection?: 'hash' | 'alternate-run'
}

interface CompassResolveOptions {
  unresolvedFrame?: number
  emptyValue?: number
  oobValue?: number
  getNeighborValue?: (
    tiles: number[][],
    row: number,
    col: number,
    direction: CompassDirection
  ) => number
}

const DIRECTION_DELTAS: Record<CompassDirection, { dr: number; dc: number }> = {
  N: { dr: -1, dc: 0 },
  NE: { dr: -1, dc: 1 },
  E: { dr: 0, dc: 1 },
  SE: { dr: 1, dc: 1 },
  S: { dr: 1, dc: 0 },
  SW: { dr: 1, dc: -1 },
  W: { dr: 0, dc: -1 },
  NW: { dr: -1, dc: -1 },
  N2: { dr: -2, dc: 0 },
  E2: { dr: 0, dc: 2 },
  S2: { dr: 2, dc: 0 },
  W2: { dr: 0, dc: -2 },
}

function readNeighborDefault(
  tiles: number[][],
  row: number,
  col: number,
  direction: CompassDirection
): number {
  const delta = DIRECTION_DELTAS[direction]
  return getTileAt(tiles, row + delta.dr, col + delta.dc, -1)
}

function buildNeighborhood(
  tiles: number[][],
  row: number,
  col: number,
  getNeighborValue: (
    tiles: number[][],
    row: number,
    col: number,
    direction: CompassDirection
  ) => number
): Record<CompassDirection, number> {
  return {
    N: getNeighborValue(tiles, row, col, 'N'),
    NE: getNeighborValue(tiles, row, col, 'NE'),
    E: getNeighborValue(tiles, row, col, 'E'),
    SE: getNeighborValue(tiles, row, col, 'SE'),
    S: getNeighborValue(tiles, row, col, 'S'),
    SW: getNeighborValue(tiles, row, col, 'SW'),
    W: getNeighborValue(tiles, row, col, 'W'),
    NW: getNeighborValue(tiles, row, col, 'NW'),
    N2: getNeighborValue(tiles, row, col, 'N2'),
    E2: getNeighborValue(tiles, row, col, 'E2'),
    S2: getNeighborValue(tiles, row, col, 'S2'),
    W2: getNeighborValue(tiles, row, col, 'W2'),
  }
}

function tokenMatches(
  token: CompassRuleToken,
  actualValue: number,
  emptyValue: number,
  oobValue: number
): boolean {
  if (typeof token === 'number') {
    return actualValue === token
  }

  const normalized = token.trim().toUpperCase()

  if (normalized === '*' || normalized === 'A' || normalized === 'ANY') {
    return true
  }

  if (normalized === '-' || normalized === 'EMPTY') {
    return actualValue === emptyValue
  }

  if (normalized === 'OOB' || normalized === 'B') {
    return actualValue === oobValue
  }

  if (/^A--?\d+$/.test(normalized)) {
    const excluded = Number(normalized.slice(2))
    return actualValue !== excluded
  }

  if (/^!-?\d+$/.test(normalized)) {
    const excluded = Number(normalized.slice(1))
    return actualValue !== excluded
  }

  if (/^-?\d+$/.test(normalized)) {
    return actualValue === Number(normalized)
  }

  return false
}

function specMatches(
  spec: CompassRuleSpec,
  actualValue: number,
  emptyValue: number,
  oobValue: number
): boolean {
  const tokens = Array.isArray(spec) ? spec : [spec]
  return tokens.some((token) =>
    tokenMatches(token, actualValue, emptyValue, oobValue)
  )
}

function ruleMatches(
  rule: CompassFrameRule,
  context: CompassRuleContext,
  emptyValue: number,
  oobValue: number
): boolean {
  const patterns = Array.isArray(rule.matches) ? rule.matches : [rule.matches]

  for (const pattern of patterns) {
    const entries = Object.entries(pattern) as Array<
      [CompassDirection, CompassRuleSpec]
    >
    if (entries.length === 0) {
      return true
    }

    const minimumMatches = rule.minimumMatches ?? entries.length
    let hitCount = 0

    for (const [direction, spec] of entries) {
      if (
        specMatches(spec, context.neighborhood[direction], emptyValue, oobValue)
      ) {
        hitCount += 1
      }
    }

    if (hitCount >= minimumMatches) {
      return true
    }
  }

  return false
}

export function findMatchingCompassRule(
  rules: ReadonlyArray<CompassFrameRule>,
  context: Omit<CompassRuleContext, 'neighborhood'>,
  options?: Omit<CompassResolveOptions, 'unresolvedFrame'>
): {
  rule: CompassFrameRule
  index: number
  neighborhood: Record<CompassDirection, number>
} | null {
  const emptyValue = options?.emptyValue ?? -1
  const oobValue = options?.oobValue ?? -1
  const getNeighborValue = options?.getNeighborValue ?? readNeighborDefault
  const neighborhood = buildNeighborhood(
    context.tiles,
    context.row,
    context.col,
    getNeighborValue
  )

  const fullContext: CompassRuleContext = { ...context, neighborhood }

  for (let index = 0; index < rules.length; index += 1) {
    const rule = rules[index]
    if (ruleMatches(rule, fullContext, emptyValue, oobValue)) {
      return { rule, index, neighborhood }
    }
  }

  return null
}

export function resolveCompassRuleFrame(
  rules: ReadonlyArray<CompassFrameRule>,
  context: Omit<CompassRuleContext, 'neighborhood'>,
  options?: CompassResolveOptions
): number {
  const unresolvedFrame = options?.unresolvedFrame ?? -1
  const matched = findMatchingCompassRule(rules, context, options)
  if (!matched) {
    return unresolvedFrame
  }

  if (matched.rule.frames.length === 0) {
    return unresolvedFrame
  }

  if (matched.rule.frameSelection === 'alternate-run') {
    const tileValue = context.tiles[context.row][context.col]
    let runLeft = context.col
    while (
      runLeft - 1 >= 0 &&
      context.tiles[context.row][runLeft - 1] === tileValue
    ) {
      runLeft -= 1
    }

    const frameIndex = Math.abs(runLeft) % matched.rule.frames.length
    return matched.rule.frames[frameIndex]
  }

  return pickDeterministicVariant(matched.rule.frames, context.row, context.col)
}

export function collectCompassRuleFrames(
  rules: ReadonlyArray<CompassFrameRule>
): number[] {
  const frameSet = new Set<number>()
  for (const rule of rules) {
    for (const frame of rule.frames) {
      frameSet.add(frame)
    }
  }

  return Array.from(frameSet)
}
