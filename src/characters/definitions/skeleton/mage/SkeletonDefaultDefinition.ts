import { CHARACTER_KEYS } from '../../../../config/keys'
import { SkeletonMageBaseDefinition } from '../../../base/SkeletonMageBaseDefinition'

export class SkeletonDefaultDefinition extends SkeletonMageBaseDefinition {
  readonly id = CHARACTER_KEYS.SKELETON_MAGE_DEFAULT
  readonly label = 'Skeleton Mage'
  readonly sheetKey = 'skeleton-mage-default'
  readonly metadataKey = 'skeleton-mage-default-meta'
  readonly texturePath = 'assets/characters/skeleton/mage/default/skeleton_mage_default.png'
  readonly metadataPath = 'assets/characters/skeleton/mage/default/skeleton_mage_default.json'
}

export const SKELETON_DEFAULT_DEFINITION = new SkeletonDefaultDefinition()
