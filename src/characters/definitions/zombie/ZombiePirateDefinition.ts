import { CHARACTER_KEYS } from '../../../config/keys'
import { ZombieBaseDefinition } from '../../base/ZombieBaseDefinition'

export class ZombiePirateDefinition extends ZombieBaseDefinition {
  readonly id = CHARACTER_KEYS.ZOMBIE_PIRATE
  readonly label = 'Zombie (Pirate)'
  readonly sheetKey = 'zombie-pirate'
  readonly metadataKey = 'zombie-pirate-meta'
  readonly texturePath = 'assets/characters/zombie/pirate/zombie_pirate.png'
  readonly metadataPath = 'assets/characters/zombie/pirate/zombie_pirate.json'
}

export const ZOMBIE_PIRATE_DEFINITION = new ZombiePirateDefinition()
