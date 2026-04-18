import type { CompassMatch } from '../utils/CompassRuleEngine'

export interface BaseRuleContext {
  tiles: number[][]
  row: number
  col: number
  fallbackFrame: number
  variantSeed?: number
}

export interface DeclarativeRule {
  matches: CompassMatch | CompassMatch[]
  frames?: number[]
  variants?: number[][]
  minimumMatches?: number
  frameSelection?: 'hash' | 'alternate-run'
}

export interface ResolverRule<TContext extends BaseRuleContext> {
  matches?: CompassMatch | CompassMatch[]
  resolve: (context: TContext) => number | null
}

export type LayerRule<TContext extends BaseRuleContext> =
  | DeclarativeRule
  | ResolverRule<TContext>

function addFrameList(frames: ReadonlyArray<number>, sink: Set<number>): void {
  for (const frame of frames) {
    sink.add(frame)
  }
}

function addVariantLists(
  variants: ReadonlyArray<ReadonlyArray<number>>,
  sink: Set<number>
): void {
  for (const variant of variants) {
    addFrameList(variant, sink)
  }
}

export function collectDeclarativeRuleFrames<TContext extends BaseRuleContext>(
  rules: ReadonlyArray<LayerRule<TContext>>
): number[] {
  const frames = new Set<number>()

  for (const rule of rules) {
    if ('frames' in rule && rule.frames) {
      addFrameList(rule.frames, frames)
    }

    if ('variants' in rule && rule.variants) {
      addVariantLists(rule.variants, frames)
    }
  }

  return Array.from(frames)
}

export function isDeclarativeRule<TContext extends BaseRuleContext>(
  rule: LayerRule<TContext>
): rule is DeclarativeRule {
  return 'frames' in rule || 'variants' in rule
}
