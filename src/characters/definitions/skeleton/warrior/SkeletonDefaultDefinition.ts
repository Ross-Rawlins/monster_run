import { CHARACTER_KEYS } from '../../../../config/keys'
import { SkeletonWarriorBaseDefinition } from '../../../base/SkeletonWarriorBaseDefinition'

export class SkeletonDefaultDefinition extends SkeletonWarriorBaseDefinition {
  readonly id = CHARACTER_KEYS.SKELETON_WARRIOR_DEFAULT
  readonly label = 'Skeleton Warrior'
  readonly sheetKey = 'skeleton-warrior-default'
  readonly metadataKey = 'skeleton-warrior-default-meta'
  readonly texturePath = 'assets/characters/skeleton/warrior/default/skeleton_warrior_default.png'
  readonly metadataPath = 'assets/characters/skeleton/warrior/default/skeleton_warrior_default.json'
}

export const SKELETON_DEFAULT_DEFINITION = new SkeletonDefaultDefinition()
