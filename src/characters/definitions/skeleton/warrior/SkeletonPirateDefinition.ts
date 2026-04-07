import { CHARACTER_KEYS } from '../../../../config/keys'
import { SkeletonWarriorBaseDefinition } from '../../../base/SkeletonWarriorBaseDefinition'

export class SkeletonPirateDefinition extends SkeletonWarriorBaseDefinition {
  readonly id = CHARACTER_KEYS.SKELETON_WARRIOR_PIRATE
  readonly label = 'Skeleton Pirate'
  readonly sheetKey = 'skeleton-warrior-pirate'
  readonly metadataKey = 'skeleton-warrior-pirate-meta'
  readonly texturePath = 'assets/characters/skeleton/warrior/pirate/skeleton_warrior_pirate.png'
  readonly metadataPath = 'assets/characters/skeleton/warrior/pirate/skeleton_warrior_pirate.json'
}

export const SKELETON_PIRATE_DEFINITION = new SkeletonPirateDefinition()
