import type { BaseRuleContext } from '../../rules/ruleTypes'

export interface GroundGenerationConstraints {
  tileId: number
  minColumnHeightTiles: number
  maxColumnHeightTiles: number
  maxHeightStepDeltaRows: number
  minSegmentLength: number
  maxSegmentLength: number
  minGapSize: number
  maxGapSize: number
  gapChancePerSegment: number
  minimumStartingSolidColumns: number
}

export interface GroundRuleContext extends BaseRuleContext {}
