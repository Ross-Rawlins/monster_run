import { CHARACTER_KEYS } from '../../../config/keys'
import { ZombieBaseDefinition } from '../../base/ZombieBaseDefinition'

export class ZombieCowboyDefinition extends ZombieBaseDefinition {
  readonly id = CHARACTER_KEYS.ZOMBIE_COWBOY
  readonly label = 'Zombie (Cowboy)'
  readonly sheetKey = 'zombie-cowboy'
  readonly metadataKey = 'zombie-cowboy-meta'
  readonly texturePath = 'assets/characters/zombie/cowboy/zombie_cowboy.png'
  readonly metadataPath = 'assets/characters/zombie/cowboy/zombie_cowboy.json'
}

export const ZOMBIE_COWBOY_DEFINITION = new ZombieCowboyDefinition()
