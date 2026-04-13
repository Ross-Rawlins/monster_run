import type { ILayerRules } from '../../contracts/ILayerRules'
import {
  resolveLayerRuleFrame,
  type LayerRule,
  type BaseRuleContext,
} from '../../rules/LayerRulePipeline'

export interface BaseResolveOptions {
  unresolvedFrame?: number
}

export abstract class BaseLayerRules<
  TConstraints,
  TContext extends BaseRuleContext = BaseRuleContext,
> implements ILayerRules<TConstraints> {
  abstract readonly constraints: TConstraints
  abstract readonly tileId: number

  protected abstract readonly rules: ReadonlyArray<LayerRule<TContext>>

  protected abstract buildContext(
    row: number,
    col: number,
    fallbackFrame: number,
    tiles: number[][]
  ): TContext

  protected get resolveOptions(): BaseResolveOptions {
    return {}
  }

  resolveFrame(
    row: number,
    col: number,
    fallbackFrame: number,
    tiles: ReadonlyArray<ReadonlyArray<number>>
  ): number {
    const context = this.buildContext(
      row,
      col,
      fallbackFrame,
      tiles as number[][]
    )
    return resolveLayerRuleFrame(this.rules, context, this.resolveOptions)
  }

  abstract getFrameIndices(collisionOnly?: boolean): number[]

  abstract getCollisionRows(
    tiles: ReadonlyArray<ReadonlyArray<number>>
  ): Set<number>
}
