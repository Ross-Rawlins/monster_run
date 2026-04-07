import { CHARACTER_KEYS } from '../../../config/keys'
import { ZombieBaseDefinition } from '../../base/ZombieBaseDefinition'

export class ZombieHair1Definition extends ZombieBaseDefinition {
  readonly id = CHARACTER_KEYS.ZOMBIE_HAIR1
  readonly label = 'Zombie (Hair 1)'
  readonly sheetKey = 'zombie-hair1'
  readonly metadataKey = 'zombie-hair1-meta'
  readonly texturePath = 'assets/characters/zombie/hair1/zombie_hair1.png'
  readonly metadataPath = 'assets/characters/zombie/hair1/zombie_hair1.json'
}

export const ZOMBIE_HAIR1_DEFINITION = new ZombieHair1Definition()
