import { CHARACTER_KEYS } from '../../../config/keys'
import { ZombieBaseDefinition } from '../../base/ZombieBaseDefinition'

export class ZombieCapDefinition extends ZombieBaseDefinition {
  readonly id = CHARACTER_KEYS.ZOMBIE_CAP
  readonly label = 'Zombie (Cap)'
  readonly sheetKey = 'zombie-cap'
  readonly metadataKey = 'zombie-cap-meta'
  readonly texturePath = 'assets/characters/zombie/cap/zombie_cap.png'
  readonly metadataPath = 'assets/characters/zombie/cap/zombie_cap.json'
}

export const ZOMBIE_CAP_DEFINITION = new ZombieCapDefinition()
