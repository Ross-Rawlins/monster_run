import { getTileAt, pickDeterministicVariant } from '../rules/neighbors'

export type CompassDirection =
  | 'C'
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

export const COMPASS_DIRECTION_DELTAS: Readonly<
  Record<CompassDirection, { dr: number; dc: number }>
> = {
  C: { dr: 0, dc: 0 },
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

// ── Pre-compiled token types ─────────────────────────────────────────
// Tokens are parsed once at first use, turning string/regex operations
// into simple numeric comparisons on the hot path.

const CT_EXACT = 0
const CT_NOT = 1
const CT_ANY = 2
const CT_EMPTY = 3
const CT_OOB = 4

interface CompiledToken {
  readonly t: number // CT_EXACT | CT_NOT | CT_ANY | CT_EMPTY | CT_OOB
  readonly v: number // numeric value for EXACT/NOT, unused for ANY/EMPTY/OOB
}

interface CompiledDirectionCheck {
  readonly dir: CompassDirection
  readonly tokens: readonly CompiledToken[]
}

interface CompiledPattern {
  readonly checks: readonly CompiledDirectionCheck[]
  readonly minimumMatches: number
}

interface CompiledFrameRule {
  readonly patterns: readonly CompiledPattern[]
  readonly original: CompassFrameRule
}

function compileToken(token: CompassRuleToken): CompiledToken {
  if (typeof token === 'number') {
    return { t: CT_EXACT, v: token }
  }

  const s = token.trim().toUpperCase()
  const c0 = s.charCodeAt(0)

  if (c0 === 42 /* * */ || s === 'A' || s === 'ANY') {
    return { t: CT_ANY, v: 0 }
  }
  if ((c0 === 45 /* - */ && s.length === 1) || s === 'EMPTY') {
    return { t: CT_EMPTY, v: 0 }
  }
  if (s === 'OOB' || s === 'B') {
    return { t: CT_OOB, v: 0 }
  }
  if (c0 === 33 /* ! */) {
    return { t: CT_NOT, v: Number(s.slice(1)) }
  }
  if (c0 === 65 /* A */ && s.length > 2 && s.charCodeAt(1) === 45 /* - */) {
    return { t: CT_NOT, v: Number(s.slice(2)) }
  }

  return { t: CT_EXACT, v: Number(s) }
}

function compileSpec(spec: CompassRuleSpec): CompiledToken[] {
  if (Array.isArray(spec)) {
    return spec.map(compileToken)
  }
  return [compileToken(spec)]
}

function compileMatchPattern(
  match: CompassMatch,
  minimumMatches?: number
): CompiledPattern {
  const entries = Object.entries(match) as Array<
    [CompassDirection, CompassRuleSpec]
  >
  const checks: CompiledDirectionCheck[] = entries.map(([dir, spec]) => ({
    dir,
    tokens: compileSpec(spec),
  }))
  return {
    checks,
    minimumMatches: minimumMatches ?? checks.length,
  }
}

// ── Compilation caches ───────────────────────────────────────────────
// Keyed by the original object reference (module-level constants).

const ruleArrayCache = new WeakMap<
  ReadonlyArray<CompassFrameRule>,
  readonly CompiledFrameRule[]
>()

const matchCache = new WeakMap<object, readonly CompiledPattern[]>()

function getCompiledRules(
  rules: ReadonlyArray<CompassFrameRule>
): readonly CompiledFrameRule[] {
  let compiled = ruleArrayCache.get(rules)
  if (!compiled) {
    compiled = rules.map((rule) => {
      const patterns = Array.isArray(rule.matches)
        ? rule.matches
        : [rule.matches]
      return {
        patterns: patterns.map((p) =>
          compileMatchPattern(p, rule.minimumMatches)
        ),
        original: rule,
      }
    })
    ruleArrayCache.set(rules, compiled)
  }
  return compiled
}

function getCompiledPatterns(
  matches: CompassMatch | CompassMatch[],
  minimumMatches?: number
): readonly CompiledPattern[] {
  const key = matches as object
  let compiled = matchCache.get(key)
  if (!compiled) {
    const patterns = Array.isArray(matches) ? matches : [matches]
    compiled = patterns.map((p) => compileMatchPattern(p, minimumMatches))
    matchCache.set(key, compiled)
  }
  return compiled
}

// ── Fast compiled matching (no regex, no string ops) ─────────────────

function compiledTokenMatches(
  token: CompiledToken,
  actualValue: number,
  emptyValue: number,
  oobValue: number
): boolean {
  switch (token.t) {
    case CT_EXACT:
      return actualValue === token.v
    case CT_NOT:
      // Out-of-bounds values should not match '!X' (not X) tokens.
      // Use explicit 'OOB' token to match boundaries.
      return actualValue !== token.v && actualValue !== oobValue
    case CT_ANY:
      return true
    case CT_EMPTY:
      return actualValue === emptyValue
    case CT_OOB:
      return actualValue === oobValue
    default:
      return false
  }
}

function compiledSpecMatches(
  tokens: readonly CompiledToken[],
  actualValue: number,
  emptyValue: number,
  oobValue: number
): boolean {
  for (let i = 0; i < tokens.length; i += 1) {
    if (compiledTokenMatches(tokens[i], actualValue, emptyValue, oobValue)) {
      return true
    }
  }
  return false
}

function compiledPatternMatches(
  pattern: CompiledPattern,
  neighborhood: Record<CompassDirection, number>,
  emptyValue: number,
  oobValue: number
): boolean {
  const { checks, minimumMatches } = pattern
  if (checks.length === 0) return true

  let hitCount = 0
  for (let i = 0; i < checks.length; i += 1) {
    const check = checks[i]
    if (
      compiledSpecMatches(
        check.tokens,
        neighborhood[check.dir],
        emptyValue,
        oobValue
      )
    ) {
      hitCount += 1
      if (hitCount >= minimumMatches) return true
    }
  }
  return false
}

// ── Public API ───────────────────────────────────────────────────────

function readNeighborDefault(
  tiles: number[][],
  row: number,
  col: number,
  direction: CompassDirection
): number {
  const delta = COMPASS_DIRECTION_DELTAS[direction]
  return getTileAt(tiles, row + delta.dr, col + delta.dc, -1)
}

export function buildNeighborhood(
  tiles: number[][],
  row: number,
  col: number,
  getNeighborValue: (
    tiles: number[][],
    row: number,
    col: number,
    direction: CompassDirection
  ) => number = readNeighborDefault
): Record<CompassDirection, number> {
  return {
    C: getNeighborValue(tiles, row, col, 'C'),
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

/**
 * Check if compass match patterns match a pre-built neighborhood.
 * Patterns are compiled on first call and cached by object reference.
 */
export function matchesCompassPatterns(
  matches: CompassMatch | CompassMatch[],
  neighborhood: Record<CompassDirection, number>,
  emptyValue: number,
  oobValue: number,
  minimumMatches?: number
): boolean {
  const patterns = getCompiledPatterns(matches, minimumMatches)
  for (let i = 0; i < patterns.length; i += 1) {
    if (compiledPatternMatches(patterns[i], neighborhood, emptyValue, oobValue))
      return true
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

  const compiled = getCompiledRules(rules)

  for (let index = 0; index < compiled.length; index += 1) {
    const cr = compiled[index]
    for (let p = 0; p < cr.patterns.length; p += 1) {
      if (
        compiledPatternMatches(
          cr.patterns[p],
          neighborhood,
          emptyValue,
          oobValue
        )
      ) {
        return { rule: cr.original, index, neighborhood }
      }
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
