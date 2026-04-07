import { CHARACTER_KEYS } from '../../../config/keys'
import { ZombieBaseDefinition } from '../../base/ZombieBaseDefinition'

export class ZombieTophatDefinition extends ZombieBaseDefinition {
  readonly id = CHARACTER_KEYS.ZOMBIE_TOPHAT
  readonly label = 'Zombie (Tophat)'
  readonly sheetKey = 'zombie-tophat'
  readonly metadataKey = 'zombie-tophat-meta'
  readonly texturePath = 'assets/characters/zombie/tophat/zombie_tophat.png'
  readonly metadataPath = 'assets/characters/zombie/tophat/zombie_tophat.json'
}

export const ZOMBIE_TOPHAT_DEFINITION = new ZombieTophatDefinition()
