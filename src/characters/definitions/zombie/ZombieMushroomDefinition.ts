import { CHARACTER_KEYS } from '../../../config/keys'
import { ZombieBaseDefinition } from '../../base/ZombieBaseDefinition'

export class ZombieMushroomDefinition extends ZombieBaseDefinition {
  readonly id = CHARACTER_KEYS.ZOMBIE_MUSHROOM
  readonly label = 'Zombie (Mushroom)'
  readonly sheetKey = 'zombie-mushroom'
  readonly metadataKey = 'zombie-mushroom-meta'
  readonly texturePath = 'assets/characters/zombie/mushroom/zombie_mushroom.png'
  readonly metadataPath = 'assets/characters/zombie/mushroom/zombie_mushroom.json'
}

export const ZOMBIE_MUSHROOM_DEFINITION = new ZombieMushroomDefinition()
