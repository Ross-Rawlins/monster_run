import { CHARACTER_KEYS } from '../../../../config/keys'
import { SkeletonMageBaseDefinition } from '../../../base/SkeletonMageBaseDefinition'

export class SkeletonWizardDefinition extends SkeletonMageBaseDefinition {
  readonly id = CHARACTER_KEYS.SKELETON_MAGE_WIZARD
  readonly label = 'Skeleton Wizard'
  readonly sheetKey = 'skeleton-mage-wizard'
  readonly metadataKey = 'skeleton-mage-wizard-meta'
  readonly texturePath = 'assets/characters/skeleton/mage/wizard/skeleton_mage_wizard.png'
  readonly metadataPath = 'assets/characters/skeleton/mage/wizard/skeleton_mage_wizard.json'
}

export const SKELETON_WIZARD_DEFINITION = new SkeletonWizardDefinition()
