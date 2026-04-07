import { CHARACTER_KEYS } from '../../../config/keys'
import { ZombieBaseDefinition } from '../../base/ZombieBaseDefinition'

export class ZombieVikingDefinition extends ZombieBaseDefinition {
  readonly id = CHARACTER_KEYS.ZOMBIE_VIKING
  readonly label = 'Zombie (Viking)'
  readonly sheetKey = 'zombie-viking'
  readonly metadataKey = 'zombie-viking-meta'
  readonly texturePath = 'assets/characters/zombie/viking/zombie_viking.png'
  readonly metadataPath = 'assets/characters/zombie/viking/zombie_viking.json'
}

export const ZOMBIE_VIKING_DEFINITION = new ZombieVikingDefinition()
