import {
  type CompassDirection,
  findMatchingCompassRule,
} from '../utils/CompassRuleEngine'
import { pickDeterministicVariant } from './neighbors'
import type {
  BaseRuleContext,
  DeclarativeRule,
  ResolverRule,
  LayerRule,
} from './ruleTypes'

export type { BaseRuleContext, DeclarativeRule, ResolverRule, LayerRule }
export { isDeclarativeRule } from './ruleTypes'

interface ResolveLayerRuleOptions {
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

export function resolveLayerRuleFrame<TContext extends BaseRuleContext>(
  rules: ReadonlyArray<LayerRule<TContext>>,
  context: TContext,
  options?: ResolveLayerRuleOptions
): number {
  for (const rule of rules) {
    if (rule.matches) {
      const matched = findMatchingCompassRule(
        [{ matches: rule.matches, frames: [context.fallbackFrame] }],
        context,
        {
          emptyValue: options?.emptyValue,
          oobValue: options?.oobValue,
          getNeighborValue: options?.getNeighborValue,
        }
      )

      if (!matched) {
        continue
      }
    }

    if ('variants' in rule) {
      const declarative = rule as DeclarativeRule
      const variants = declarative.variants
      if (!variants || variants.length === 0) {
        continue
      }
      const seed = context.variantSeed ?? 0
      const variantIndex = Math.abs(seed) % variants.length
      const variantFrames = variants[variantIndex]
      if (variantFrames.length === 0) {
        continue
      }
      if (variantFrames.length === 1) {
        return variantFrames[0]
      }
      return pickDeterministicVariant(variantFrames, context.row, context.col)
    }

    if ('frames' in rule) {
      const declarative = rule as DeclarativeRule
      if (!declarative.frames || declarative.frames.length === 0) {
        continue
      }

      if (declarative.frames.length === 1) {
        return declarative.frames[0]
      }

      if (declarative.frameSelection === 'alternate-run') {
        const tileValue = context.tiles[context.row][context.col]
        let runLeft = context.col
        while (
          runLeft - 1 >= 0 &&
          context.tiles[context.row][runLeft - 1] === tileValue
        ) {
          runLeft -= 1
        }
        return declarative.frames![
          Math.abs(runLeft) % declarative.frames!.length
        ]
      }

      return pickDeterministicVariant(
        declarative.frames!,
        context.row,
        context.col
      )
    }

    if ('resolve' in rule) {
      const resolver = rule as ResolverRule<TContext>
      const frame = resolver.resolve(context)
      if (frame !== null && frame !== undefined) {
        return frame
      }
    }
  }

  return options?.unresolvedFrame ?? context.fallbackFrame
}
