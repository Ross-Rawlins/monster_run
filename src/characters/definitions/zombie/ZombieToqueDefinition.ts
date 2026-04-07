import { CHARACTER_KEYS } from '../../../config/keys'
import { ZombieBaseDefinition } from '../../base/ZombieBaseDefinition'

export class ZombieToqueDefinition extends ZombieBaseDefinition {
  readonly id = CHARACTER_KEYS.ZOMBIE_TOQUE
  readonly label = 'Zombie (Toque)'
  readonly sheetKey = 'zombie-toque'
  readonly metadataKey = 'zombie-toque-meta'
  readonly texturePath = 'assets/characters/zombie/toque/zombie_toque.png'
  readonly metadataPath = 'assets/characters/zombie/toque/zombie_toque.json'
}

export const ZOMBIE_TOQUE_DEFINITION = new ZombieToqueDefinition()
