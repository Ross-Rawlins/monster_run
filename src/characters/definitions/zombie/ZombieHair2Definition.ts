import { CHARACTER_KEYS } from '../../../config/keys'
import { ZombieBaseDefinition } from '../../base/ZombieBaseDefinition'

export class ZombieHair2Definition extends ZombieBaseDefinition {
  readonly id = CHARACTER_KEYS.ZOMBIE_HAIR2
  readonly label = 'Zombie (Hair 2)'
  readonly sheetKey = 'zombie-hair2'
  readonly metadataKey = 'zombie-hair2-meta'
  readonly texturePath = 'assets/characters/zombie/hair2/zombie_hair2.png'
  readonly metadataPath = 'assets/characters/zombie/hair2/zombie_hair2.json'
}

export const ZOMBIE_HAIR2_DEFINITION = new ZombieHair2Definition()
