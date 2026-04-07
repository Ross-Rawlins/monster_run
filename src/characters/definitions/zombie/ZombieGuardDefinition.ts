import { CHARACTER_KEYS } from '../../../config/keys'
import { ZombieBaseDefinition } from '../../base/ZombieBaseDefinition'

export class ZombieGuardDefinition extends ZombieBaseDefinition {
  readonly id = CHARACTER_KEYS.ZOMBIE_GUARD
  readonly label = 'Zombie (Guard)'
  readonly sheetKey = 'zombie-guard'
  readonly metadataKey = 'zombie-guard-meta'
  readonly texturePath = 'assets/characters/zombie/guard/zombie_guard.png'
  readonly metadataPath = 'assets/characters/zombie/guard/zombie_guard.json'
}

export const ZOMBIE_GUARD_DEFINITION = new ZombieGuardDefinition()
