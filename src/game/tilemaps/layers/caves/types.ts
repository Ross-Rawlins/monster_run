import type { BaseRuleContext } from '../../rules/ruleTypes'
import type { SupportGenerationConstraints } from '../../../../config/supportGeneration'

export type CaveGenerationConstraints = SupportGenerationConstraints

export type CaveSignature =
  | 'single'
  | 'top_left'
  | 'top_center'
  | 'top_right'
  | 'middle_left'
  | 'middle_center'
  | 'middle_right'
  | 'bottom_left'
  | 'bottom_center'
  | 'bottom_right'

export interface CaveRuleContext extends BaseRuleContext {}
