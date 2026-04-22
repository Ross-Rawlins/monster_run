import { CHARACTER_KEYS } from '../../../config/keys'
import { SkullBaseDefinition } from '../../base/SkullBaseDefinition'

export class SkullDefaultDefinition extends SkullBaseDefinition {
  readonly id = CHARACTER_KEYS.SKULL_DEFAULT
  readonly label = 'Skull'
  readonly sheetKey = 'skull-default'
  readonly metadataKey = 'skull-default-meta'
  readonly texturePath = 'assets/characters/skull/skull.png'
  readonly metadataPath = 'assets/characters/skull/skull.json'
}

export const SKULL_DEFAULT_DEFINITION = new SkullDefaultDefinition()
