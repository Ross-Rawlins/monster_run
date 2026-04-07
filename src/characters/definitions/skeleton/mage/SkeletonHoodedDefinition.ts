import { CHARACTER_KEYS } from '../../../../config/keys'
import { SkeletonMageBaseDefinition } from '../../../base/SkeletonMageBaseDefinition'

export class SkeletonHoodedDefinition extends SkeletonMageBaseDefinition {
  readonly id = CHARACTER_KEYS.SKELETON_MAGE_HOODED
  readonly label = 'Skeleton Mage (Hooded)'
  readonly sheetKey = 'skeleton-mage-hooded'
  readonly metadataKey = 'skeleton-mage-hooded-meta'
  readonly texturePath = 'assets/characters/skeleton/mage/hooded/skeleton_mage_hooded.png'
  readonly metadataPath = 'assets/characters/skeleton/mage/hooded/skeleton_mage_hooded.json'
}

export const SKELETON_HOODED_DEFINITION = new SkeletonHoodedDefinition()
