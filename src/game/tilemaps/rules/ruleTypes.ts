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

export function isDeclarativeRule<TContext extends BaseRuleContext>(
  rule: LayerRule<TContext>
): rule is DeclarativeRule {
  return 'frames' in rule || 'variants' in rule
}
