import { CHARACTER_KEYS } from '../../../../config/keys'
import { SkeletonWarriorBaseDefinition } from '../../../base/SkeletonWarriorBaseDefinition'

export class SkeletonVikingDefinition extends SkeletonWarriorBaseDefinition {
  readonly id = CHARACTER_KEYS.SKELETON_WARRIOR_VIKING
  readonly label = 'Skeleton Viking'
  readonly sheetKey = 'skeleton-warrior-viking'
  readonly metadataKey = 'skeleton-warrior-viking-meta'
  readonly texturePath = 'assets/characters/skeleton/warrior/viking/skeleton_warrior_viking.png'
  readonly metadataPath = 'assets/characters/skeleton/warrior/viking/skeleton_warrior_viking.json'
}

export const SKELETON_VIKING_DEFINITION = new SkeletonVikingDefinition()
