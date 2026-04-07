import { CHARACTER_KEYS } from '../../../../config/keys'
import { SkeletonMageBaseDefinition } from '../../../base/SkeletonMageBaseDefinition'

export class SkeletonSorcererDefinition extends SkeletonMageBaseDefinition {
  readonly id = CHARACTER_KEYS.SKELETON_MAGE_SORCERER
  readonly label = 'Skeleton Sorcerer'
  readonly sheetKey = 'skeleton-mage-sorcerer'
  readonly metadataKey = 'skeleton-mage-sorcerer-meta'
  readonly texturePath = 'assets/characters/skeleton/mage/sorcerer/skeleton_mage_sorcerer.png'
  readonly metadataPath = 'assets/characters/skeleton/mage/sorcerer/skeleton_mage_sorcerer.json'
}

export const SKELETON_SORCERER_DEFINITION = new SkeletonSorcererDefinition()
