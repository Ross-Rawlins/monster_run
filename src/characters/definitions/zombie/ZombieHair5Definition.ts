import { CHARACTER_KEYS } from '../../../config/keys'
import { ZombieBaseDefinition } from '../../base/ZombieBaseDefinition'

export class ZombieHair5Definition extends ZombieBaseDefinition {
  readonly id = CHARACTER_KEYS.ZOMBIE_HAIR5
  readonly label = 'Zombie (Hair 5)'
  readonly sheetKey = 'zombie-hair5'
  readonly metadataKey = 'zombie-hair5-meta'
  readonly texturePath = 'assets/characters/zombie/hair5/zombie_hair5.png'
  readonly metadataPath = 'assets/characters/zombie/hair5/zombie_hair5.json'
}

export const ZOMBIE_HAIR5_DEFINITION = new ZombieHair5Definition()
