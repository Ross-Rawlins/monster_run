import { CHARACTER_KEYS } from '../../../config/keys'
import { ZombieBaseDefinition } from '../../base/ZombieBaseDefinition'

export class ZombieHair4Definition extends ZombieBaseDefinition {
  readonly id = CHARACTER_KEYS.ZOMBIE_HAIR4
  readonly label = 'Zombie (Hair 4)'
  readonly sheetKey = 'zombie-hair4'
  readonly metadataKey = 'zombie-hair4-meta'
  readonly texturePath = 'assets/characters/zombie/hair4/zombie_hair4.png'
  readonly metadataPath = 'assets/characters/zombie/hair4/zombie_hair4.json'
}

export const ZOMBIE_HAIR4_DEFINITION = new ZombieHair4Definition()
