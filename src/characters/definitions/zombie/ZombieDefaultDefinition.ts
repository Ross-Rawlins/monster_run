import { CHARACTER_KEYS } from '../../../config/keys'
import { ZombieBaseDefinition } from '../../base/ZombieBaseDefinition'

export class ZombieDefaultDefinition extends ZombieBaseDefinition {
  readonly id = CHARACTER_KEYS.ZOMBIE_DEFAULT
  readonly label = 'Zombie'
  readonly sheetKey = 'zombie-default'
  readonly metadataKey = 'zombie-default-meta'
  readonly texturePath = 'assets/characters/zombie/default/zombie_default.png'
  readonly metadataPath = 'assets/characters/zombie/default/zombie_default.json'
}

export const ZOMBIE_DEFAULT_DEFINITION = new ZombieDefaultDefinition()
