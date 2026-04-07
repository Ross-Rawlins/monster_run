import { CHARACTER_KEYS } from '../../../config/keys'
import { ZombieBaseDefinition } from '../../base/ZombieBaseDefinition'

export class ZombieHair3Definition extends ZombieBaseDefinition {
  readonly id = CHARACTER_KEYS.ZOMBIE_HAIR3
  readonly label = 'Zombie (Hair 3)'
  readonly sheetKey = 'zombie-hair3'
  readonly metadataKey = 'zombie-hair3-meta'
  readonly texturePath = 'assets/characters/zombie/hair3/zombie_hair3.png'
  readonly metadataPath = 'assets/characters/zombie/hair3/zombie_hair3.json'
}

export const ZOMBIE_HAIR3_DEFINITION = new ZombieHair3Definition()
