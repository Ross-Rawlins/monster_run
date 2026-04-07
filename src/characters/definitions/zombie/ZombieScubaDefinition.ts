import { CHARACTER_KEYS } from '../../../config/keys'
import { ZombieBaseDefinition } from '../../base/ZombieBaseDefinition'

export class ZombieScubaDefinition extends ZombieBaseDefinition {
  readonly id = CHARACTER_KEYS.ZOMBIE_SCUBA
  readonly label = 'Zombie (Scuba)'
  readonly sheetKey = 'zombie-scuba'
  readonly metadataKey = 'zombie-scuba-meta'
  readonly texturePath = 'assets/characters/zombie/scuba/zombie_scuba.png'
  readonly metadataPath = 'assets/characters/zombie/scuba/zombie_scuba.json'
}

export const ZOMBIE_SCUBA_DEFINITION = new ZombieScubaDefinition()
